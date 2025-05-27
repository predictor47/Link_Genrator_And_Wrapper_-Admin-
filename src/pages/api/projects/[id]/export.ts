import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import type { Schema } from '../../../../../amplify/data/resource';

type SurveyLink = Schema['SurveyLink']['type'];
type Vendor = Schema['Vendor']['type'];

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
    const amplifyServerService = getAmplifyServerService();
    // Verify project exists using Amplify
    const projectResult = await amplifyServerService.getProject(id);
    const project = projectResult.data;
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Build the filters for survey links based on date range and vendor
    let filter: any = {
      projectId: { eq: id }
    };
    
    // Add vendor filter if specified
    if (vendorId && typeof vendorId === 'string') {
      filter.vendorId = { eq: vendorId };
    }
    
    // Add date range filter
    if (dateRange) {
      const now = new Date();
      let dateFilter: any = {};
      
      switch (dateRange) {
        case 'today':
          const today = new Date(now.setHours(0, 0, 0, 0));
          dateFilter = { ge: today.toISOString() };
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const endOfYesterday = new Date(now);
          endOfYesterday.setDate(endOfYesterday.getDate() - 1);
          endOfYesterday.setHours(23, 59, 59, 999);
          dateFilter = { 
            ge: yesterday.toISOString(),
            le: endOfYesterday.toISOString() 
          };
          break;
        case 'week':
          const lastWeek = new Date(now);
          lastWeek.setDate(lastWeek.getDate() - 7);
          dateFilter = { ge: lastWeek.toISOString() };
          break;
        case 'month':
          const lastMonth = new Date(now);
          lastMonth.setDate(lastMonth.getDate() - 30);
          dateFilter = { ge: lastMonth.toISOString() };
          break;
      }
      
      // Add createdAt filter if we have date constraints
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    // Fetch survey links with Amplify using filters
    const surveyLinksResult = await amplifyServerService.listSurveyLinksByProject(id);
    const surveyLinks = surveyLinksResult.data;
    
    // Apply vendor filter if specified
    let filteredLinks = surveyLinks;
    if (vendorId && typeof vendorId === 'string') {
      filteredLinks = surveyLinks.filter(link => link.vendorId === vendorId);
    }
    
    // Apply date range filter
    if (dateRange) {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'yesterday':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      if (startDate) {
        filteredLinks = filteredLinks.filter(link => {
          const createdAt = new Date(link.createdAt);
          if (endDate) {
            return createdAt >= startDate && createdAt <= endDate;
          }
          return createdAt >= startDate;
        });
      }
    }
    
    // If no links found, return early
    if (filteredLinks.length === 0) {
      const emptyData = format === 'json' ? 
        { success: true, project: { id: project.id, name: project.name }, data: [] } :
        '';
      
      if (format === 'json') {
        return res.status(200).json(emptyData);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${project.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`);
        return res.status(200).send('ID,UID,Original URL,Status,Link Type,Vendor Name,Vendor Code,Country,Device,Browser,Flags,Created At,Updated At');
      }
    }

    // Collect all link IDs
    const linkIds = filteredLinks.map((link: SurveyLink) => link.id).filter((id: string | null | undefined) => id !== null && id !== undefined);
    
    // Fetch vendor data for all links
    const vendorIds = filteredLinks
      .filter((link: SurveyLink) => link.vendorId)
      .map((link: SurveyLink) => link.vendorId as string)
      .filter((id: string | null | undefined) => id !== null && id !== undefined);

    const vendors = await Promise.all(
      Array.from(new Set(vendorIds)).map(vendorId => amplifyServerService.getVendor(vendorId as string))
    );
    
    const vendorMap: Record<string, Vendor> = {};
    vendors.forEach((vendorResult) => {
      const vendor = vendorResult.data;
      if (vendor && vendor.id) {
        vendorMap[vendor.id] = vendor;
      }
    });
      // Extract responses and flags from the link metadata instead of using separate services
    const responseMap: Record<string, any[]> = {};
    const flagMap: Record<string, any[]> = {};
    
    // Process each link's metadata to extract responses and flags
    filteredLinks.forEach((link: SurveyLink) => {
      if (link.id && link.metadata) {
        try {
          const metadata = JSON.parse(link.metadata as string);
          
          // Extract responses if they exist
          if (metadata.responses && Array.isArray(metadata.responses)) {
            responseMap[link.id] = metadata.responses;
          }
          
          // Extract flags if they exist
          if (metadata.flagged || (metadata.flags && Array.isArray(metadata.flags))) {
            flagMap[link.id] = metadata.flags || [{
              reason: metadata.flagReason || 'Unknown reason',
              timestamp: metadata.flaggedAt || new Date().toISOString(),
              metadata: metadata.flagMetadata || {}
            }];
          }
        } catch (e) {
          console.error(`Error parsing metadata for link ${link.id}:`, e);
        }
      }
    });

    // Transform data for export
    const exportData = filteredLinks.map((link: SurveyLink) => {
      if (!link.id) return null;
      
      // Parse metadata from the most recent response, if any
      let metadata: any = {};
      const linkResponses = link.id ? (responseMap[link.id] || []) : [];
      
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
      const linkFlags = link.id ? (flagMap[link.id] || []) : [];
      const flagReasons = linkFlags.map((f: any) => f.reason).join('; ');

      // Determine vendor info from our vendor map
      const vendor = link.vendorId && vendorMap[link.vendorId] ? vendorMap[link.vendorId] : null;      const vendorName = vendor ? vendor.name : 'None';
      
      // Extract vendor code from settings if available
      let vendorCode = 'None';
      if (vendor && vendor.settings) {
        try {
          const settings = JSON.parse(vendor.settings as string);
          vendorCode = settings.code || 'None';
        } catch (e) {
          console.error('Error parsing vendor settings:', e);
        }
      }
      
      // Extract link data from metadata
      let originalUrl = '';
      let linkType = 'LIVE';
      
      if (link.metadata) {
        try {
          const metadata = JSON.parse(link.metadata as string);
          originalUrl = metadata.originalUrl || '';
          linkType = metadata.linkType || 'LIVE';
        } catch (e) {
          console.error('Error parsing link metadata:', e);
        }
      }

      return {
        id: link.id,
        uid: link.uid,
        originalUrl,
        status: link.status || 'UNUSED',
        linkType,
        vendorName,
        vendorCode,
        country,
        device,
        browser,
        flags: flagReasons,
        createdAt: link.createdAt || new Date().toISOString(),
        updatedAt: link.updatedAt || link.createdAt || new Date().toISOString(),
      };
    }).filter(Boolean);

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
      const csvRows = exportData.map((row: any) => {
        // This should never happen due to filter(Boolean) above, but TypeScript needs reassurance
        if (!row) return '';
        
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