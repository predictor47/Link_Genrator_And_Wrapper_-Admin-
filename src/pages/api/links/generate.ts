import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { amplifyDataService } from '@/lib/amplify-data-service';
import { securityService } from '@/lib/security-service';

type GenerateLinksRequest = {
  projectId: string;
  originalUrl: string;
  count: number;
  vendorId?: string;
  linkType: 'TEST' | 'LIVE';
  geoRestriction?: string[];
  testCount?: number; // For split between test/live links
  liveCount?: number; // For split between test/live links
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { 
      projectId, 
      originalUrl, 
      count, 
      vendorId, 
      linkType, 
      geoRestriction,
      testCount,
      liveCount 
    } = req.body as GenerateLinksRequest;

    // Get client IP for security logging
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               'unknown';
    
    // Log security event
    await securityService.logSecurityEvent('LINK_GENERATION_ATTEMPT', {
      projectId,
      vendorId,
      ip,
      count: count || (testCount && liveCount ? testCount + liveCount : 0)
    });

    if (!projectId || !originalUrl) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    // Validate count logic
    let totalCount = count;
    if (testCount !== undefined && liveCount !== undefined) {
      // If both test and live counts are provided, use those instead
      totalCount = testCount + liveCount;
      
      if (totalCount < 1 || totalCount > 1000) {
        return res.status(400).json({ success: false, message: 'Total count must be between 1 and 1000' });
      }
    } else {
      // Otherwise use the total count value
      if (!count || count < 1 || count > 1000) {
        return res.status(400).json({ success: false, message: 'Count must be between 1 and 1000' });
      }
    }

    // Validate project exists
    const projectResult = await amplifyDataService.projects.get(projectId);
    
    // Fix: Extract project data from the GraphQL response structure
    const project = projectResult?.data;

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Validate vendor if provided
    if (vendorId) {
      const vendorResult = await amplifyDataService.vendors.get(vendorId);
      const vendor = vendorResult?.data;

      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor not found' });
      }

      // Check if vendor belongs to this project
      if (vendor.projectId !== projectId) {
        return res.status(400).json({ success: false, message: 'Vendor does not belong to this project' });
      }
    }

    // Generate links
    const links = [];
    const creationPromises = [];
    
    // Handle mixed TEST/LIVE links if counts are provided
    if (testCount !== undefined && liveCount !== undefined) {
      // Generate TEST links
      for (let i = 0; i < testCount; i++) {
        const uid = nanoid(10); // Generate a short unique ID
        const linkData = {
          projectId,
          uid,
          originalUrl,
          vendorId: vendorId || undefined,
          status: 'PENDING',
          linkType: 'TEST',
          geoRestriction: geoRestriction && geoRestriction.length > 0 ? 
            JSON.stringify(geoRestriction) : 
            undefined
        };
        
        creationPromises.push(amplifyDataService.surveyLinks.create(linkData));
      }
      
      // Generate LIVE links
      for (let i = 0; i < liveCount; i++) {
        const uid = nanoid(10); // Generate a short unique ID
        const linkData = {
          projectId,
          uid,
          originalUrl,
          vendorId: vendorId || undefined,
          status: 'PENDING',
          linkType: 'LIVE',
          geoRestriction: geoRestriction && geoRestriction.length > 0 ? 
            JSON.stringify(geoRestriction) : 
            undefined
        };
        
        creationPromises.push(amplifyDataService.surveyLinks.create(linkData));
      }
    } else {
      // Original behavior - generate all links of the same type
      for (let i = 0; i < totalCount; i++) {
        const uid = nanoid(10); // Generate a short unique ID
        const linkData = {
          projectId,
          uid,
          originalUrl,
          vendorId: vendorId || undefined,
          status: 'PENDING',
          linkType: linkType || 'LIVE',
          geoRestriction: geoRestriction && geoRestriction.length > 0 ? 
            JSON.stringify(geoRestriction) : 
            undefined
        };
        
        creationPromises.push(amplifyDataService.surveyLinks.create(linkData));
      }
    }

    // Execute all creation promises
    const createdLinksResults = await Promise.all(creationPromises);
    
    // Get the created links with vendor information
    const createdLinksResponse = await amplifyDataService.surveyLinks.listByProject(projectId);
    
    // Sort by creation date with null safety
    const sortedLinks = createdLinksResponse.data
      .filter(link => link.originalUrl === originalUrl)
      .sort((a, b) => {
        // Fix: Add null safety for date comparison
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, totalCount);
    
    // Get vendor information for links that have vendors
    const vendorIds = sortedLinks
      .filter(link => link.vendorId)
      .map(link => link.vendorId as string);  // Add type assertion to ensure string type
    
    const vendorResults = vendorIds.length > 0 ? 
      await amplifyDataService.vendors.list({ filter: { id: { in: vendorIds } } }) : 
      { data: [] };
    
    const vendors = vendorResults.data.reduce((acc, vendor) => {
      // Fix: Add null safety for vendor id index access
      if (vendor && vendor.id) {
        acc[vendor.id] = { 
          name: vendor.name || '', 
          code: vendor.code || '' 
        };
      }
      return acc;
    }, {} as Record<string, { name: string; code: string }>);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Format the response with complete URLs
    const formattedLinks = sortedLinks.map(link => {
      const fullUrl = `${baseUrl}/s/${projectId}/${link.uid}`;
      
      return {
        id: link.id,
        uid: link.uid,
        originalUrl: link.originalUrl,
        status: link.status,
        linkType: link.linkType,
        fullUrl: fullUrl,
        geoRestriction: link.geoRestriction ? JSON.parse(link.geoRestriction) : null,
        vendor: link.vendorId ? vendors[link.vendorId] : null,
        createdAt: link.createdAt
      };
    });

    // Log successful creation
    await securityService.logSecurityEvent('LINK_GENERATION_SUCCESS', {
      projectId,
      count: formattedLinks.length
    });

    return res.status(200).json({
      success: true,
      count: formattedLinks.length,
      links: formattedLinks
    });
  } catch (error) {
    console.error('Error generating links:', error);
    
    // Log error
    await securityService.logSecurityEvent('LINK_GENERATION_ERROR', {
      // Fix: Handle unknown error type properly
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate links' 
    });
  }
}