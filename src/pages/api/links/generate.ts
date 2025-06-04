import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';

// Use types that match our server service
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

type GenerateLinksRequest = {
  projectId: string;
  originalUrl: string;
  count: number;
  vendorId?: string;
  linkType: 'TEST' | 'LIVE';
  geoRestriction?: string[];
  testCount?: number; // For split between test/live links
  liveCount?: number; // For split between test/live links
  useDevelopmentDomain?: boolean; // For localhost development
};

// Domain configuration
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const DEVELOPMENT_DOMAIN = 'localhost:3000';

const getDomain = (useDevelopment?: boolean) => {
  return useDevelopment ? DEVELOPMENT_DOMAIN : PRODUCTION_DOMAIN;
};

const getShortUrl = (useDevelopment?: boolean) => {
  const domain = getDomain(useDevelopment);
  const protocol = useDevelopment ? 'http' : 'https';
  return `${protocol}://${domain}/s`;
};

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
      liveCount,
      useDevelopmentDomain 
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
      
      if (totalCount < 1 || totalCount > 10000) {
        return res.status(400).json({ success: false, message: 'Total count must be between 1 and 10,000' });
      }
    } else {
      // Otherwise use the total count value
      if (!count || count < 1 || count > 10000) {
        return res.status(400).json({ success: false, message: 'Count must be between 1 and 10,000' });
      }
    }

    // Validate project exists
    const projectResult = await amplifyServerService.getProject(projectId);
    
    // Fix: Extract project correctly by accessing .data property
    const project = projectResult.data;

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    // Validate vendor if provided
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
    
    // Get vendor code for UID generation if vendor is specified
    let vendorCode = '';
    if (vendorId) {
      const vendorResult = await amplifyServerService.getVendor(vendorId);
      const vendor = vendorResult?.data;
      if (vendor && vendor.settings) {
        try {
          const settings = JSON.parse(vendor.settings as string);
          vendorCode = settings.code || '';
        } catch (e) {
          console.error('Error parsing vendor settings:', e);
        }
      }
    }
    
      // Handle mixed TEST/LIVE links if counts are provided
    if (testCount !== undefined && liveCount !== undefined) {
      // Generate TEST links
      for (let i = 0; i < testCount; i++) {
        const baseUid = nanoid(8); // Generate a shorter base ID
        const uid = vendorCode ? `${vendorCode}_TEST_${baseUid}` : `TEST_${baseUid}`;
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
        const baseUid = nanoid(8); // Generate a shorter base ID
        const uid = vendorCode ? `${vendorCode}_LIVE_${baseUid}` : `LIVE_${baseUid}`;
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
        const baseUid = nanoid(8); // Generate a shorter base ID
        const linkType_prefix = linkType || 'LIVE';
        const uid = vendorCode ? `${vendorCode}_${linkType_prefix}_${baseUid}` : `${linkType_prefix}_${baseUid}`;
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
    
    // Extract the IDs of the newly created links
    const createdLinkIds = createdLinksResults.map(result => result.data?.id).filter(Boolean);
    
    // Get the created links with vendor information by their IDs
    const createdLinksResponse = await amplifyServerService.listSurveyLinksByProject(projectId);
    
    // Filter to only include the newly created links and sort them
    const sortedLinks = createdLinksResponse.data
      .filter((link: SurveyLink) => createdLinkIds.includes(link.id))
      .sort((a: SurveyLink, b: SurveyLink) => {
        // First sort by vendor (links without vendor come first)
        const vendorA = a.vendorId || '';
        const vendorB = b.vendorId || '';
        
        if (vendorA !== vendorB) {
          if (!vendorA) return -1; // No vendor links first
          if (!vendorB) return 1;
          return vendorA.localeCompare(vendorB); // Then alphabetically by vendor ID
        }
        
        // Within same vendor, sort by creation date (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    
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

    // Use the appropriate domain for link generation
    const domain = getDomain(useDevelopmentDomain);
    const protocol = useDevelopmentDomain ? 'http' : 'https';
    const baseUrl = `${protocol}://${domain}`;    // Format the response with complete URLs
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