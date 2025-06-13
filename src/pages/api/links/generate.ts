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
  count?: number;
  vendorId?: string;
  vendorIds?: string[]; // Support multiple vendors
  linkType: 'TEST' | 'LIVE';
  geoRestriction?: string[];
  testCount?: number; // Per vendor test count
  liveCount?: number; // Per vendor live count
  useDevelopmentDomain?: boolean;
  generatePerVendor?: boolean; // Flag to generate specified counts for EACH vendor
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
      vendorIds,
      linkType, 
      geoRestriction,
      testCount,
      liveCount,
      useDevelopmentDomain,
      generatePerVendor
    } = req.body as GenerateLinksRequest;

    // Get client IP for security logging
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               'unknown';
    
    // Determine which vendors to generate links for
    const targetVendorIds: string[] = [];
    if (generatePerVendor && vendorIds && vendorIds.length > 0) {
      targetVendorIds.push(...vendorIds);
    } else if (vendorId) {
      targetVendorIds.push(vendorId);
    }
    
    // Calculate total expected links for logging
    let expectedTotalLinks = 0;
    if (generatePerVendor && targetVendorIds.length > 0) {
      // Per vendor generation: multiply counts by number of vendors
      if (testCount !== undefined && liveCount !== undefined) {
        expectedTotalLinks = (testCount + liveCount) * targetVendorIds.length;
      } else if (count) {
        expectedTotalLinks = count * targetVendorIds.length;
      }
    } else {
      // Traditional single generation
      expectedTotalLinks = count || (testCount && liveCount ? testCount + liveCount : 0);
    }
    
    // Log security event
    await securityService.logSecurityEvent('LINK_GENERATION_ATTEMPT', {
      projectId,
      vendorIds: targetVendorIds,
      ip,
      expectedCount: expectedTotalLinks,
      generatePerVendor
    });

    if (!projectId || !originalUrl) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    // Enhanced validation for new per-vendor generation logic
    if (generatePerVendor) {
      if (!vendorIds || vendorIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'vendorIds array is required when generatePerVendor is true' 
        });
      }
      
      // Validate count logic for per-vendor generation
      if (testCount !== undefined && liveCount !== undefined) {
        if (testCount < 0 || liveCount < 0 || (testCount + liveCount) > 5000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Per-vendor counts must be non-negative and total ≤ 5,000 per vendor' 
          });
        }
      } else if (count !== undefined) {
        if (count < 1 || count > 5000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Per-vendor count must be between 1 and 5,000' 
          });
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Either count or both testCount and liveCount must be provided' 
        });
      }
      
      // Validate total across all vendors doesn't exceed system limits
      const totalLinks = expectedTotalLinks;
      if (totalLinks > 50000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Total links across all vendors cannot exceed 50,000' 
        });
      }
    } else {
      // Original validation logic for single generation
      if (testCount !== undefined && liveCount !== undefined) {
        const totalCount = testCount + liveCount;
        if (totalCount < 1 || totalCount > 10000) {
          return res.status(400).json({ success: false, message: 'Total count must be between 1 and 10,000' });
        }
      } else if (count !== undefined) {
        if (count < 1 || count > 10000) {
          return res.status(400).json({ success: false, message: 'Count must be between 1 and 10,000' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Count or both testCount and liveCount must be provided' });
      }
    }

    // Validate project exists
    const projectResult = await amplifyServerService.getProject(projectId);
    const project = projectResult.data;

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Validate vendors if provided
    const validatedVendors: Record<string, { name: string; code: string }> = {};
    
    if (targetVendorIds.length > 0) {
      for (const vId of targetVendorIds) {
        const vendorResult = await amplifyServerService.getVendor(vId);
        const vendor = vendorResult?.data;

        if (!vendor) {
          return res.status(404).json({ 
            success: false, 
            message: `Vendor not found: ${vId}` 
          });
        }

        // Check if vendor belongs to this project
        const projectVendorResult = await amplifyServerService.listProjectVendors({
          and: [
            { projectId: { eq: projectId } },
            { vendorId: { eq: vId } }
          ]
        });

        if (!projectVendorResult.data || projectVendorResult.data.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Vendor ${vId} does not belong to this project` 
          });
        }

        // Extract vendor code
        let vendorCode = '';
        if (vendor.settings) {
          try {
            const settings = JSON.parse(vendor.settings as string);
            vendorCode = settings.code || '';
          } catch (e) {
            console.error('Error parsing vendor settings:', e);
          }
        }

        validatedVendors[vId] = {
          name: vendor.name,
          code: vendorCode
        };
      }
    }

    // Generate links with enhanced per-vendor logic
    const creationPromises = [];
    
    if (generatePerVendor && targetVendorIds.length > 0) {
      // Generate specified counts for EACH vendor
      for (const vId of targetVendorIds) {
        const vendorInfo = validatedVendors[vId];
        
        if (testCount !== undefined && liveCount !== undefined) {
          // Generate TEST links for this vendor
          for (let i = 0; i < testCount; i++) {
            const baseUid = nanoid(8);
            const uid = vendorInfo.code ? 
              `${vendorInfo.code}_TEST_${baseUid}` : 
              `V${vId.slice(-4)}_TEST_${baseUid}`;
              
            const linkData = {
              projectId,
              uid,
              vendorId: vId,
              status: 'UNUSED',
              metadata: JSON.stringify({
                originalUrl,
                linkType: 'TEST',
                geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
                vendorName: vendorInfo.name
              })
            };
            
            creationPromises.push(amplifyServerService.createSurveyLink(linkData));
          }

          // Generate LIVE links for this vendor
          for (let i = 0; i < liveCount; i++) {
            const baseUid = nanoid(8);
            const uid = vendorInfo.code ? 
              `${vendorInfo.code}_LIVE_${baseUid}` : 
              `V${vId.slice(-4)}_LIVE_${baseUid}`;
              
            const linkData = {
              projectId,
              uid,
              vendorId: vId,
              status: 'UNUSED',
              metadata: JSON.stringify({
                originalUrl,
                linkType: 'LIVE',
                geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
                vendorName: vendorInfo.name
              })
            };
            
            creationPromises.push(amplifyServerService.createSurveyLink(linkData));
          }
        } else if (count !== undefined) {
          // Generate the specified count of links for this vendor
          for (let i = 0; i < count; i++) {
            const baseUid = nanoid(8);
            const linkTypePrefix = linkType || 'LIVE';
            const uid = vendorInfo.code ? 
              `${vendorInfo.code}_${linkTypePrefix}_${baseUid}` : 
              `V${vId.slice(-4)}_${linkTypePrefix}_${baseUid}`;
              
            const linkData = {
              projectId,
              uid,
              vendorId: vId,
              status: 'UNUSED',
              metadata: JSON.stringify({
                originalUrl,
                linkType: linkType || 'LIVE',
                geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
                vendorName: vendorInfo.name
              })
            };
            
            creationPromises.push(amplifyServerService.createSurveyLink(linkData));
          }
        }
      }
    } else {
      // Original single vendor/no vendor generation logic
      const singleVendorId = targetVendorIds.length > 0 ? targetVendorIds[0] : undefined;
      const singleVendorInfo = singleVendorId ? validatedVendors[singleVendorId] : null;
      
      if (testCount !== undefined && liveCount !== undefined) {
        // Generate TEST links
        for (let i = 0; i < testCount; i++) {
          const baseUid = nanoid(8);
          const uid = singleVendorInfo?.code ? 
            `${singleVendorInfo.code}_TEST_${baseUid}` : 
            `TEST_${baseUid}`;
            
          const linkData = {
            projectId,
            uid,
            vendorId: singleVendorId || undefined,
            status: 'UNUSED',
            metadata: JSON.stringify({
              originalUrl,
              linkType: 'TEST',
              geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
              vendorName: singleVendorInfo?.name
            })
          };
          
          creationPromises.push(amplifyServerService.createSurveyLink(linkData));
        }

        // Generate LIVE links
        for (let i = 0; i < liveCount; i++) {
          const baseUid = nanoid(8);
          const uid = singleVendorInfo?.code ? 
            `${singleVendorInfo.code}_LIVE_${baseUid}` : 
            `LIVE_${baseUid}`;
            
          const linkData = {
            projectId,
            uid,
            vendorId: singleVendorId || undefined,
            status: 'UNUSED',
            metadata: JSON.stringify({
              originalUrl,
              linkType: 'LIVE',
              geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
              vendorName: singleVendorInfo?.name
            })
          };
          
          creationPromises.push(amplifyServerService.createSurveyLink(linkData));
        }
      } else if (count !== undefined) {
        // Generate single type links
        for (let i = 0; i < count; i++) {
          const baseUid = nanoid(8);
          const linkTypePrefix = linkType || 'LIVE';
          const uid = singleVendorInfo?.code ? 
            `${singleVendorInfo.code}_${linkTypePrefix}_${baseUid}` : 
            `${linkTypePrefix}_${baseUid}`;
            
          const linkData = {
            projectId,
            uid,
            vendorId: singleVendorId || undefined,
            status: 'UNUSED',
            metadata: JSON.stringify({
              originalUrl,
              linkType: linkType || 'LIVE',
              geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined,
              vendorName: singleVendorInfo?.name
            })
          };
          
          creationPromises.push(amplifyServerService.createSurveyLink(linkData));
        }
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
    const linkedVendorIds = sortedLinks
      .filter((link: SurveyLink) => link.vendorId)
      .map((link: SurveyLink) => link.vendorId as string);  // Add type assertion to ensure string type
    
    const vendorResults = linkedVendorIds.length > 0 ? 
      await amplifyServerService.listVendors({ id: { in: linkedVendorIds } }) : 
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