import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const { vendor: vendorId, dateRange, format = 'csv' } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Project ID is required' 
    });
  }

  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Build a filter object for the dateRange
    const dateFilter: any = {};
    if (dateRange) {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          const today = new Date(now.setHours(0, 0, 0, 0));
          dateFilter.gte = today;
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const endOfYesterday = new Date(now);
          endOfYesterday.setDate(endOfYesterday.getDate() - 1);
          endOfYesterday.setHours(23, 59, 59, 999);
          dateFilter.gte = yesterday;
          dateFilter.lte = endOfYesterday;
          break;
        case 'week':
          const lastWeek = new Date(now);
          lastWeek.setDate(lastWeek.getDate() - 7);
          dateFilter.gte = lastWeek;
          break;
        case 'month':
          const lastMonth = new Date(now);
          lastMonth.setDate(lastMonth.getDate() - 30);
          dateFilter.gte = lastMonth;
          break;
        default:
          // 'all' or any other value - no date filtering
          break;
      }
    }

    // Build the query for survey links based on filters
    const surveyLinksQuery: any = {
      where: {
        projectId: id,
        ...(vendorId && { vendorId: vendorId }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
    };
    
    // Fetch basic survey links
    const surveyLinks = await prisma.surveyLink.findMany({
      ...surveyLinksQuery,
      select: {
        id: true,
        uid: true,
        originalUrl: true,
        status: true,
        createdAt: true,
        projectId: true,
        // Add vendorId and linkType if they exist in your schema
         vendorId: true,
         linkType: true,
      }
    });

    // Fetch responses and flags separately to avoid TypeScript errors
    const linkIds = surveyLinks.map(link => link.id);
    
    // Get responses for these links
    const responses = await prisma.response.findMany({
      where: {
        surveyLinkId: { in: linkIds }
      },
      select: {
        surveyLinkId: true,
        metadata: true,
      }
    });
    
    // Get flags for these links
    const flags = await prisma.flag.findMany({
      where: {
        surveyLinkId: { in: linkIds }
      },
      select: {
        surveyLinkId: true,
        reason: true,
        createdAt: true
      }
    });
    
    // Map responses and flags to their respective links
    const responseMap: Record<string, any[]> = {};
    responses.forEach(response => {
      if (!responseMap[response.surveyLinkId]) {
        responseMap[response.surveyLinkId] = [];
      }
      responseMap[response.surveyLinkId].push(response);
    });
    
    const flagMap: Record<string, any[]> = {};
    flags.forEach(flag => {
      if (!flagMap[flag.surveyLinkId]) {
        flagMap[flag.surveyLinkId] = [];
      }
      flagMap[flag.surveyLinkId].push(flag);
    });

    // Transform data for export
    const exportData = surveyLinks.map((link) => {
      // Parse metadata from the most recent response, if any
      let metadata: any = {};
      const linkResponses = responseMap[link.id] || [];
      
      if (linkResponses.length > 0 && linkResponses[0].metadata) {
        try {
          metadata = JSON.parse(linkResponses[0].metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }

      // Extract geo information if available
      const country = metadata?.geoLocation?.country || 
                     metadata?.ip_location?.country || 
                     metadata?.country || 'Unknown';
      
      // Extract device information
      const device = metadata?.device || 'Unknown';
      const browser = metadata?.browser || 'Unknown';
      
      // Extract flags
      const linkFlags = flagMap[link.id] || [];
      const flagReasons = linkFlags.map((f: any) => f.reason).join('; ');

      // Determine vendor info
      // In a real app, you would fetch vendor info from the database
      const vendorName = 'None'; 
      const vendorCode = 'None';

      return {
        id: link.id,
        uid: link.uid,
        originalUrl: link.originalUrl,
        status: link.status,
        linkType: 'LIVE', // Default if not in schema
        vendorName,
        vendorCode,
        country,
        device,
        browser,
        flags: flagReasons,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.createdAt.toISOString(), // Use createdAt if updatedAt doesn't exist
      };
    });

    // Format response based on requested format
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        project: {
          id: project.id,
          name: project.name
        },
        data: exportData
      });
    } else {
      // CSV format (default)
      const header = 'ID,UID,Original URL,Status,Link Type,Vendor Name,Vendor Code,Country,Device,Browser,Flags,Created At,Updated At';
      const csvRows = exportData.map(row => {
        return [
          row.id,
          row.uid,
          `"${row.originalUrl}"`, // Quote the URL to handle commas
          row.status,
          row.linkType,
          `"${row.vendorName}"`, // Quote to handle potential commas in names
          row.vendorCode,
          `"${row.country}"`,
          row.device,
          row.browser,
          `"${row.flags}"`, // Quote to handle potential commas in flag reasons
          row.createdAt,
          row.updatedAt,
        ].join(',');
      });
      
      const csv = [header, ...csvRows].join('\n');

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${project.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`);
      
      return res.status(200).send(csv);
    }

  } catch (error) {
    console.error('Error exporting project data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to export data' 
    });
  }
}