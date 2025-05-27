import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';
import type { Schema } from '../../../../amplify/data/resource';

type SurveyLink = Schema['SurveyLink']['type'];
type Vendor = Schema['Vendor']['type'];

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

// Domain configuration
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const SHORT_URL = process.env.NEXT_PUBLIC_SURVEY_SHORT_URL || `https://${DOMAIN}/s`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const amplifyServerService = getAmplifyServerService();
    
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
    const projectResult = await amplifyServerService.getProject(projectId);
    
    // Fix: Extract project correctly by accessing .data property
    const project = projectResult.data;

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }    // Validate vendor if provided
    if (vendorId) {
      const vendorResult = await amplifyServerService.getVendor(vendorId);
      const vendor = vendorResult?.data;

      if (!vendor) {
        return res.status(404).json({ success: false, message: 'Vendor not found' });
      }

      // Check if vendor belongs to this project by checking the ProjectVendor relationship
      const projectVendorResult = await amplifyServerService.listProjectVendors({
        and: [
          { projectId: { eq: projectId } },
          { vendorId: { eq: vendorId } }
        ]
      });

      if (!projectVendorResult.data || projectVendorResult.data.length === 0) {
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
          vendorId: vendorId || undefined,
          status: 'UNUSED',
          metadata: JSON.stringify({
            originalUrl,
            linkType: 'TEST',
            geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined
          })
        };
        
        creationPromises.push(amplifyServerService.createSurveyLink(linkData));
      }
        // Generate LIVE links
      for (let i = 0; i < liveCount; i++) {
        const uid = nanoid(10); // Generate a short unique ID
        const linkData = {
          projectId,
          uid,
          vendorId: vendorId || undefined,
          status: 'UNUSED',
          metadata: JSON.stringify({
            originalUrl,
            linkType: 'LIVE',
            geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined
          })
        };
        
        creationPromises.push(amplifyServerService.createSurveyLink(linkData));
      }    } else {
      // Original behavior - generate all links of the same type
      for (let i = 0; i < count; i++) {
        const uid = nanoid(10); // Generate a short unique ID
        const linkData = {
          projectId,
          uid,
          vendorId: vendorId || undefined,
          status: 'UNUSED',
          metadata: JSON.stringify({
            originalUrl,
            linkType: linkType || 'LIVE',
            geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined
          })
        };
        
        creationPromises.push(amplifyServerService.createSurveyLink(linkData));
      }
    }

    // Execute all creation promises
    const createdLinksResults = await Promise.all(creationPromises);
    
    // Get the created links with vendor information
    const createdLinksResponse = await amplifyServerService.listSurveyLinksByProject(projectId);
      // Sort by creation date with null safety
    const sortedLinks = createdLinksResponse.data
      .filter((link: SurveyLink) => {
        // Check if metadata contains originalUrl
        try {
          const metadata = link.metadata ? JSON.parse(link.metadata as string) : {};
          return metadata.originalUrl === originalUrl;
        } catch (e) {
          return false;
        }
      })
      .sort((a: SurveyLink, b: SurveyLink) => {
        // Fix: Add null safety for date comparison
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, totalCount);
    
    // Get vendor information for links that have vendors
    const vendorIds = sortedLinks
      .filter((link: SurveyLink) => link.vendorId)
      .map((link: SurveyLink) => link.vendorId as string);  // Add type assertion to ensure string type
    
    const vendorResults = vendorIds.length > 0 ? 
      await amplifyServerService.listVendors({ id: { in: vendorIds } }) : 
      { data: [] };
      const vendors = vendorResults.data.reduce((acc: Record<string, { name: string; code: string }>, vendor: Vendor) => {
      // Fix: Add null safety for vendor id index access
      if (vendor && vendor.id) {
        // Extract vendor code from settings if it exists
        let vendorCode = '';
        try {
          const settings = vendor.settings ? JSON.parse(vendor.settings as string) : {};
          vendorCode = settings.code || '';
        } catch (e) {
          // If parsing fails, use an empty string
          vendorCode = '';
        }
        
        acc[vendor.id] = { 
          name: vendor.name || '', 
          code: vendorCode
        };
      }
      return acc;
    }, {} as Record<string, { name: string; code: string }>);

    // Use the custom domain for link generation
    const baseUrl = `https://${DOMAIN}`;    // Format the response with complete URLs
    const formattedLinks = sortedLinks.map((link: SurveyLink) => {
      const fullUrl = `${baseUrl}/s/${projectId}/${link.uid}`;
      
      // Extract data from metadata JSON
      let linkMetadata: any = {};
      try {
        linkMetadata = link.metadata ? JSON.parse(link.metadata as string) : {};
      } catch (e) {
        // If parsing fails, use an empty object
        linkMetadata = {};
      }
      
      // Get geo restriction data
      let geoRestrictionData = null;
      if (linkMetadata.geoRestriction) {
        geoRestrictionData = linkMetadata.geoRestriction;
      }
      
      return {
        id: link.id,
        uid: link.uid,
        originalUrl: linkMetadata.originalUrl || '', // Get originalUrl from metadata
        status: link.status,
        linkType: linkMetadata.linkType || 'LIVE',
        fullUrl: fullUrl,
        geoRestriction: geoRestrictionData,
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