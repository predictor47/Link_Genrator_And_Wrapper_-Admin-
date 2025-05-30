import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { extractMetadataForExport } from '@/lib/metadata';

// Define types that match our server service
type SurveyLinkStatus = 'UNUSED' | 'CLICKED' | 'COMPLETED' | 'DISQUALIFIED' | 'QUOTA_FULL';

interface SurveyLink {
  id: string;
  projectId: string;
  uid: string;
  vendorId?: string;
    status: SurveyLinkStatus;
  clickedAt?: string;
  completedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  geoData?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const { 
    vendor: vendorId, 
    dateRange, 
    format = 'csv',
    page = '1',
    limit = '1000',
    sortField = 'createdAt',
    sortDirection = 'desc'
  } = req.query;

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

    // Fetch survey links with Amplify
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
    
    // Apply sorting
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 1000;
    const sortFieldStr = sortField as string;
    const sortDir = sortDirection as string;
    
    // Sort the filtered links
    filteredLinks.sort((a, b) => {
      let aValue: any = a[sortFieldStr as keyof SurveyLink];
      let bValue: any = b[sortFieldStr as keyof SurveyLink];
      
      // Handle special sorting for wrapped URL (based on uid)
      if (sortFieldStr === 'wrappedUrl') {
        aValue = a.uid;
        bValue = b.uid;
      }
      
      // Handle date fields
      if (sortFieldStr === 'createdAt' || sortFieldStr === 'updatedAt') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    
    // Apply pagination for JSON format only (CSV should export all data)
    let paginatedLinks = filteredLinks;
    if (format === 'json' && limitNum < filteredLinks.length) {
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      paginatedLinks = filteredLinks.slice(startIndex, endIndex);
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
        return res.status(200).send('ID,UID,Wrapped URL,Original URL,Status,Link Type,Vendor Name,Vendor Code,Country,Region,City,Device,Browser,OS,Screen Resolution,Hardware Cores,Connection Type,VPN,Proxy,Tor,Mouse Movements,Keyboard Events,Click Events,Scroll Events,Total Time,Idle Time,Bot Score,Bot Reasons,Flags,Created At,Updated At');
      }
    }

    // Fetch vendor data for all links
    const vendorIds = paginatedLinks
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
    paginatedLinks.forEach((link: SurveyLink) => {
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
    const exportData = paginatedLinks.map((link: SurveyLink) => {
      if (!link.id) return null;
      
      // Parse metadata from the most recent response, if any
      let metadata: any = {};
      let exportMetadata: any = {};
      const linkResponses = link.id ? (responseMap[link.id] || []) : [];
      
      if (linkResponses.length > 0 && linkResponses[0].metadata) {
        try {
          metadata = JSON.parse(linkResponses[0].metadata);
          exportMetadata = extractMetadataForExport(metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }

      // Extract geo information if available
      const country = exportMetadata.country || 
                     metadata?.geoLocation?.country || 
                     metadata?.ip_location?.country || 
                     metadata?.country || 'Unknown';
      
      const region = exportMetadata.region || 
                    metadata?.geoLocation?.region || 
                    metadata?.region || 'Unknown';
      
      const city = exportMetadata.city || 
                  metadata?.geoLocation?.city || 
                  metadata?.city || 'Unknown';
      
      // Extract device information
      const device = exportMetadata.device || metadata?.device || 'Unknown';
      const browser = exportMetadata.browser || metadata?.browser || 'Unknown';
      const os = exportMetadata.os || metadata?.hardware?.platform || 'Unknown';
      
      // Extract flags
      const linkFlags = link.id ? (flagMap[link.id] || []) : [];
      const flagReasons = linkFlags.map((f: any) => f.reason).join('; ');

      // Determine vendor info from our vendor map
      const vendor = link.vendorId && vendorMap[link.vendorId] ? vendorMap[link.vendorId] : null;
      const vendorName = vendor ? vendor.name : 'None';
      
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
          const linkMetadata = JSON.parse(link.metadata as string);
          originalUrl = linkMetadata.originalUrl || '';
          linkType = linkMetadata.linkType || 'LIVE';
        } catch (e) {
          console.error('Error parsing link metadata:', e);
        }
      }

      return {
        id: link.id,
        uid: link.uid,
        wrappedUrl: `${req.headers.host?.includes('localhost') ? 'http://' : 'https://'}${req.headers.host}/s/${id}/${link.uid}`,
        originalUrl,
        status: link.status || 'UNUSED',
        linkType,
        vendorName,
        vendorCode,
        country,
        region,
        city,
        device,
        browser,
        os,
        screenResolution: exportMetadata.screenResolution || 'Unknown',
        hardwareCores: exportMetadata.hardwareCores || 'Unknown',
        connectionType: exportMetadata.connectionType || 'Unknown',
        isVPN: exportMetadata.isVPN || false,
        isProxy: exportMetadata.isProxy || false,
        isTor: exportMetadata.isTor || false,
        mouseMovements: exportMetadata.mouseMovements || 0,
        keyboardEvents: exportMetadata.keyboardEvents || 0,
        clickEvents: exportMetadata.clickEvents || 0,
        scrollEvents: exportMetadata.scrollEvents || 0,
        totalTime: exportMetadata.totalTime || 0,
        idleTime: exportMetadata.idleTime || 0,
        botScore: exportMetadata.botScore || 0,
        botReasons: exportMetadata.botReasons || 'None',
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
        data: exportData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredLinks.length,
          totalPages: Math.ceil(filteredLinks.length / limitNum)
        }
      });
    } else {
      // CSV format (default) - use filteredLinks for full export
      const fullExportData = filteredLinks.map((link: SurveyLink) => {
        if (!link.id) return null;
        
        // Parse metadata from the most recent response, if any
        let metadata: any = {};
        let exportMetadata: any = {};
        const linkResponses = link.id ? (responseMap[link.id] || []) : [];
        
        if (linkResponses.length > 0 && linkResponses[0].metadata) {
          try {
            metadata = JSON.parse(linkResponses[0].metadata);
            exportMetadata = extractMetadataForExport(metadata);
          } catch (e) {
            console.error('Error parsing metadata:', e);
          }
        }

        // Extract geo information if available
        const country = exportMetadata.country || 
                       metadata?.geoLocation?.country || 
                       metadata?.ip_location?.country || 
                       metadata?.country || 'Unknown';
        
        const region = exportMetadata.region || 
                      metadata?.geoLocation?.region || 
                      metadata?.region || 'Unknown';
        
        const city = exportMetadata.city || 
                    metadata?.geoLocation?.city || 
                    metadata?.city || 'Unknown';
        
        // Extract device information
        const device = exportMetadata.device || metadata?.device || 'Unknown';
        const browser = exportMetadata.browser || metadata?.browser || 'Unknown';
        const os = exportMetadata.os || metadata?.hardware?.platform || 'Unknown';
        
        // Extract flags
        const linkFlags = link.id ? (flagMap[link.id] || []) : [];
        const flagReasons = linkFlags.map((f: any) => f.reason).join('; ');

        // Determine vendor info from our vendor map
        const vendor = link.vendorId && vendorMap[link.vendorId] ? vendorMap[link.vendorId] : null;
        const vendorName = vendor ? vendor.name : 'None';
        
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
            const linkMetadata = JSON.parse(link.metadata as string);
            originalUrl = linkMetadata.originalUrl || '';
            linkType = linkMetadata.linkType || 'LIVE';
          } catch (e) {
            console.error('Error parsing link metadata:', e);
          }
        }

        return {
          id: link.id,
          uid: link.uid,
          wrappedUrl: `${req.headers.host?.includes('localhost') ? 'http://' : 'https://'}${req.headers.host}/s/${id}/${link.uid}`,
          originalUrl,
          status: link.status || 'UNUSED',
          linkType,
          vendorName,
          vendorCode,
          country,
          region,
          city,
          device,
          browser,
          os,
          screenResolution: exportMetadata.screenResolution || 'Unknown',
          hardwareCores: exportMetadata.hardwareCores || 'Unknown',
          connectionType: exportMetadata.connectionType || 'Unknown',
          isVPN: exportMetadata.isVPN || false,
          isProxy: exportMetadata.isProxy || false,
          isTor: exportMetadata.isTor || false,
          mouseMovements: exportMetadata.mouseMovements || 0,
          keyboardEvents: exportMetadata.keyboardEvents || 0,
          clickEvents: exportMetadata.clickEvents || 0,
          scrollEvents: exportMetadata.scrollEvents || 0,
          totalTime: exportMetadata.totalTime || 0,
          idleTime: exportMetadata.idleTime || 0,
          botScore: exportMetadata.botScore || 0,
          botReasons: exportMetadata.botReasons || 'None',
          flags: flagReasons,
          createdAt: link.createdAt || new Date().toISOString(),
          updatedAt: link.updatedAt || link.createdAt || new Date().toISOString(),
        };
      }).filter(Boolean);

      const header = 'ID,UID,Wrapped URL,Original URL,Status,Link Type,Vendor Name,Vendor Code,Country,Region,City,Device,Browser,OS,Screen Resolution,Hardware Cores,Connection Type,VPN,Proxy,Tor,Mouse Movements,Keyboard Events,Click Events,Scroll Events,Total Time,Idle Time,Bot Score,Bot Reasons,Flags,Created At,Updated At';
      const csvRows = fullExportData.map((row: any) => {
        // This should never happen due to filter(Boolean) above, but TypeScript needs reassurance
        if (!row) return '';
        
        return [
          row.id,
          row.uid,
          `"${row.wrappedUrl}"`, // Wrapped survey URL
          `"${row.originalUrl}"`, // Original URL from metadata
          row.status,
          row.linkType,
          `"${row.vendorName}"`, // Quote to handle potential commas in names
          row.vendorCode,
          `"${row.country}"`,
          `"${row.region}"`,
          `"${row.city}"`,
          row.device,
          row.browser,
          row.os,
          row.screenResolution,
          row.hardwareCores,
          row.connectionType,
          row.isVPN,
          row.isProxy,
          row.isTor,
          row.mouseMovements,
          row.keyboardEvents,
          row.clickEvents,
          row.scrollEvents,
          row.totalTime,
          row.idleTime,
          row.botScore,
          `"${row.botReasons}"`, // Quote to handle potential commas
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