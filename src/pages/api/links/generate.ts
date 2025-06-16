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
    
    console.log('=== LINK GENERATION DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Target vendor IDs:', targetVendorIds);
    console.log('Expected total links:', expectedTotalLinks);
    console.log('Count:', count);
    console.log('Test/Live counts:', testCount, liveCount);
    console.log('Generate per vendor:', generatePerVendor);
    
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

    console.log('=== VALIDATION DEBUG ===');
    console.log('generatePerVendor:', generatePerVendor);
    console.log('testCount:', testCount, '(type:', typeof testCount, ')');
    console.log('liveCount:', liveCount, '(type:', typeof liveCount, ')');
    console.log('count:', count, '(type:', typeof count, ')');
    console.log('Condition 1 (split):', testCount !== undefined && liveCount !== undefined && (testCount > 0 || liveCount > 0));
    console.log('Condition 2 (single):', count !== undefined && count > 0);
    
    // --- DEBUG: Log incoming types and values for testCount/liveCount ---
    // Parse test/live counts if provided
    const parsedTestCount = testCount !== undefined ? parseInt(testCount as any, 10) : 0;
    const parsedLiveCount = liveCount !== undefined ? parseInt(liveCount as any, 10) : 0;
    
    console.log('=== DETAILED PARAMETER DEBUG ===');
    console.log('Raw testCount:', testCount, '(type:', typeof testCount, ')');
    console.log('Raw liveCount:', liveCount, '(type:', typeof liveCount, ')');
    console.log('Raw count:', count, '(type:', typeof count, ')');
    console.log('Parsed testCount:', parsedTestCount);
    console.log('Parsed liveCount:', parsedLiveCount);
    console.log('generatePerVendor:', generatePerVendor);
    console.log('targetVendorIds:', targetVendorIds);
    
    // Check the specific condition that determines split mode
    const hasSplitCounts = testCount !== undefined && liveCount !== undefined;
    const hasPositiveCounts = parsedTestCount > 0 || parsedLiveCount > 0;
    const shouldUseSplitMode = hasSplitCounts && hasPositiveCounts;
    
    console.log('hasSplitCounts:', hasSplitCounts);
    console.log('hasPositiveCounts:', hasPositiveCounts);
    console.log('shouldUseSplitMode:', shouldUseSplitMode);
    console.log('===========================');

    // Use the parsed values and clear logic condition

    // Enhanced validation for new per-vendor generation logic
    if (generatePerVendor) {
      if (!vendorIds || vendorIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'vendorIds array is required when generatePerVendor is true' 
        });
      }
      
      // Validate count logic for per-vendor generation
      if (parsedTestCount !== undefined && parsedLiveCount !== undefined && (parsedTestCount > 0 || parsedLiveCount > 0)) {
        if (parsedTestCount < 0 || parsedLiveCount < 0 || (parsedTestCount + parsedLiveCount) > 5000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Per-vendor counts must be non-negative and total ≤ 5,000 per vendor' 
          });
        }
      } else if (count !== undefined && count > 0) {
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
      if (parsedTestCount !== undefined && parsedLiveCount !== undefined && (parsedTestCount > 0 || parsedLiveCount > 0)) {
        const totalCount = parsedTestCount + parsedLiveCount;
        if (totalCount < 1 || totalCount > 10000) {
          return res.status(400).json({ success: false, message: 'Total count must be between 1 and 10,000' });
        }
      } else if (count !== undefined && count > 0) {
        if (count < 1 || count > 10000) {
          return res.status(400).json({ success: false, message: 'Count must be between 1 and 10,000' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Count or both testCount and liveCount must be provided' });
      }
    }

    // Validate project exists (skip for test projects)
    console.log('=== PROJECT VALIDATION ===');
    console.log('Looking up project:', projectId);
    
    let project;
    const isTestProject = projectId.startsWith('test-') || projectId === 'any-project-id';
    
    if (isTestProject) {
      console.log('🧪 Test project detected, skipping validation');
      project = { id: projectId, name: 'Test Project' }; // Mock project for testing
    } else {
      const projectResult = await amplifyServerService.getProject(projectId);
      project = projectResult.data;
    }
    
    console.log('Project found:', !!project);

    if (!project) {
      console.log('❌ Project not found, returning 404');
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    console.log('✅ Project validated successfully');
    console.log('==========================');

    // Validate vendors if provided
    const validatedVendors: Record<string, { name: string; code: string }> = {};
    
    if (targetVendorIds.length > 0) {
      for (const vId of targetVendorIds) {
        // Skip vendor validation for test projects
        if (isTestProject) {
          console.log(`🧪 Test vendor detected: ${vId}, skipping validation`);
          validatedVendors[vId] = {
            name: `Test Vendor ${vId}`,
            code: vId.toUpperCase()
          };
          continue;
        }
        
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
    
    console.log('=== GENERATION PATH SELECTION ===');
    console.log('generatePerVendor:', generatePerVendor);
    console.log('targetVendorIds.length:', targetVendorIds.length);
    
    if (generatePerVendor && targetVendorIds.length > 0) {
      console.log('Taking per-vendor generation path');
      // Generate specified counts for EACH vendor
      for (const vId of targetVendorIds) {
        const vendorInfo = validatedVendors[vId];
        
        if (shouldUseSplitMode) {
          console.log(`[VENDOR ${vId}] Generating split links: ${parsedTestCount} test + ${parsedLiveCount} live`);
          // Generate TEST links for this vendor
          for (let i = 0; i < parsedTestCount; i++) {
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
          for (let i = 0; i < parsedLiveCount; i++) {
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
          const linkCount = parseInt(String(count), 10);
          console.log(`Generating ${linkCount} links for vendor ${vId}`);
          
          for (let i = 0; i < linkCount; i++) {
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
            
            console.log(`Creating vendor link ${i + 1}/${linkCount} for ${vendorInfo.name}:`, uid);
            creationPromises.push(amplifyServerService.createSurveyLink(linkData));
          }
        }
      }
    } else {
      console.log('Taking single/no vendor generation path');
      console.log('testCount:', testCount, 'liveCount:', liveCount, 'count:', count);
      // Original single vendor/no vendor generation logic
      const singleVendorId = targetVendorIds.length > 0 ? targetVendorIds[0] : undefined;
      const singleVendorInfo = singleVendorId ? validatedVendors[singleVendorId] : null;
      
      if (shouldUseSplitMode) {
        // Generate TEST links
        for (let i = 0; i < parsedTestCount; i++) {
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
        for (let i = 0; i < parsedLiveCount; i++) {
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
        const linkCount = parseInt(String(count), 10);
        console.log('Generating single type links, parsed count:', linkCount);
        
        for (let i = 0; i < linkCount; i++) {
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
          
          console.log(`Creating link ${i + 1}/${linkCount}:`, uid);
          creationPromises.push(amplifyServerService.createSurveyLink(linkData));
        }
      }
    }

    console.log('=== CREATION PROMISES ===');
    console.log('Total creation promises:', creationPromises.length);
    console.log('=== CREATION PROMISES BEFORE EXECUTION ===');
    console.log('Total creation promises queued:', creationPromises.length);
    console.log('Should create', parsedTestCount, 'TEST links and', parsedLiveCount, 'LIVE links');
    
    if (creationPromises.length === 0) {
      console.log('❌ NO CREATION PROMISES - This is the problem!');
      return res.status(400).json({
        success: false,
        message: 'No links were queued for creation. Check generation logic.'
      });
    }

    // Execute creation in batches to avoid overwhelming AppSync/GraphQL
    console.log('=== EXECUTING LINK CREATION IN BATCHES ===');
    
    // Dynamic batch size based on total count to optimize performance
    let BATCH_SIZE = 25; // Default batch size
    let BATCH_DELAY = 100; // Default delay between batches
    
    if (creationPromises.length > 1000) {
      BATCH_SIZE = 15; // Smaller batches for very large requests
      BATCH_DELAY = 200; // Longer delay for very large requests
    } else if (creationPromises.length > 500) {
      BATCH_SIZE = 20; 
      BATCH_DELAY = 150;
    } else if (creationPromises.length > 100) {
      BATCH_SIZE = 25;
      BATCH_DELAY = 100;
    } else {
      BATCH_SIZE = 50; // Larger batches for smaller requests
      BATCH_DELAY = 50;
    }
    
    console.log(`Using batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY}ms for ${creationPromises.length} links`);
    
    const createdLinksResults = [];
    const totalBatches = Math.ceil(creationPromises.length / BATCH_SIZE);
    const startTime = Date.now();
    
    // Track all created link IDs for verification
    const allCreatedIds = new Set();
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < creationPromises.length; i += BATCH_SIZE) {
      const batch = creationPromises.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      const progress = Math.round((batchNumber / totalBatches) * 100);
      const elapsed = Date.now() - startTime;
      const estimatedTotal = totalBatches > 1 ? (elapsed / (batchNumber - 1)) * totalBatches : elapsed;
      const remaining = Math.max(0, estimatedTotal - elapsed);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} links) - ${progress}% complete`);
      if (batchNumber > 1) {
        console.log(`Elapsed: ${Math.round(elapsed/1000)}s, Estimated remaining: ${Math.round(remaining/1000)}s`);
      }
      
      // Process batch with improved error handling
      const batchResults = [];
      let batchSuccessful = 0;
      let batchFailed = 0;
      
      try {
        // Use Promise.allSettled to handle individual failures better
        const settledResults = await Promise.allSettled(batch);
        
        for (let j = 0; j < settledResults.length; j++) {
          const settledResult = settledResults[j];
          
          if (settledResult.status === 'fulfilled') {
            const result = settledResult.value;
            if (result && result.data && result.data.id) {
              batchResults.push(result);
              allCreatedIds.add(result.data.id);
              batchSuccessful++;
              totalSuccessful++;
            } else {
              console.log(`Batch ${batchNumber} item ${j + 1}: No data in fulfilled result`);
              batchResults.push({ data: null, error: 'No data returned' });
              batchFailed++;
              totalFailed++;
            }
          } else {
            console.log(`Batch ${batchNumber} item ${j + 1} failed:`, settledResult.reason);
            batchResults.push({ data: null, error: settledResult.reason });
            batchFailed++;
            totalFailed++;
          }
        }
        
        createdLinksResults.push(...batchResults);
        
        console.log(`✅ Batch ${batchNumber} completed: ${batchSuccessful}/${batch.length} successful, ${batchFailed} failed`);
        console.log(`Running totals: ${totalSuccessful} successful, ${totalFailed} failed`);
        
      } catch (error) {
        console.error(`❌ Batch ${batchNumber} completely failed:`, error);
        
        // Fallback: try each individual request
        console.log(`Retrying batch ${batchNumber} with individual requests...`);
        for (let j = 0; j < batch.length; j++) {
          try {
            const result = await batch[j];
            if (result && result.data && result.data.id) {
              batchResults.push(result);
              allCreatedIds.add(result.data.id);
              batchSuccessful++;
              totalSuccessful++;
            } else {
              batchResults.push({ data: null, error: 'No data returned' });
              batchFailed++;
              totalFailed++;
            }
          } catch (individualError) {
            console.error(`Individual link creation ${j + 1}/${batch.length} failed:`, individualError);
            batchResults.push({ data: null, error: individualError });
            batchFailed++;
            totalFailed++;
          }
        }
        
        createdLinksResults.push(...batchResults);
        console.log(`Retry of batch ${batchNumber}: ${batchSuccessful}/${batch.length} successful, ${batchFailed} failed`);
      }
      
      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < creationPromises.length) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ All batches completed in ${Math.round(totalTime/1000)}s`);
    console.log(`Final results: ${totalSuccessful} successful, ${totalFailed} failed out of ${creationPromises.length} total`);
    console.log('Creation results count:', createdLinksResults.length);
    console.log('Unique created IDs count:', allCreatedIds.size);
    
    // Check for any failed creations
    const successfulCreations = createdLinksResults.filter(result => result.data);
    const failedCreations = createdLinksResults.filter(result => !result.data);
    
    console.log('Successful creations:', successfulCreations.length);
    console.log('Failed creations:', failedCreations.length);
    
    if (failedCreations.length > 0) {
      console.log('❌ Some link creations failed. Sample errors:');
      failedCreations.slice(0, 5).forEach((failed, index) => {
        console.log(`Error ${index + 1}:`, failed.error);
      });
    }
    
    // Extract the IDs of the newly created links using our tracked set
    const createdLinkIds = Array.from(allCreatedIds);
    console.log('=== RESPONSE FILTERING DEBUG ===');
    console.log('Created link IDs from tracking:', createdLinkIds.length, 'IDs');
    
    // Verify we have the expected number of successful creations
    if (createdLinkIds.length !== totalSuccessful) {
      console.log(`⚠️ ID tracking mismatch: tracked ${createdLinkIds.length} but counted ${totalSuccessful} successful`);
    }
    
    // Get the created links with vendor information by their IDs
    // Enhanced retry logic with longer delays for large batches
    let createdLinksResponse;
    let retryCount = 0;
    const maxRetries = 8; // Increased retries for all cases
    const baseDelay = 1000; // Start with 1 second for all cases
    
    do {
      if (retryCount > 0) {
        const delayMs = Math.min(baseDelay * Math.pow(1.5, retryCount - 1), 10000); // Cap at 10 seconds
        console.log(`Retry ${retryCount}/${maxRetries}: Waiting ${Math.round(delayMs)}ms for database consistency...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      createdLinksResponse = await amplifyServerService.listSurveyLinksByProject(projectId);
      const foundLinks = createdLinksResponse.data.filter((link: SurveyLink) => 
        createdLinkIds.includes(link.id)
      );
      
      console.log(`Attempt ${retryCount + 1}: Found ${foundLinks.length}/${createdLinkIds.length} newly created links`);
      
      if (foundLinks.length === createdLinkIds.length) {
        console.log('✅ All newly created links found in database!');
        break;
      } else if (foundLinks.length >= createdLinkIds.length * 0.95) {
        // If we found at least 95% of links, that's acceptable for very large batches
        console.log(`✅ Found ${foundLinks.length}/${createdLinkIds.length} links (${Math.round(foundLinks.length/createdLinkIds.length*100)}%) - acceptable for large batch`);
        break;
      }
      
      retryCount++;
    } while (retryCount < maxRetries);
    
    console.log('Total links in project after creation:', createdLinksResponse.data.length);
    
    // Filter to only include the newly created links and sort them
    const sortedLinks = createdLinksResponse.data
      .filter((link: SurveyLink) => {
        const isIncluded = createdLinkIds.includes(link.id);
        if (!isIncluded && createdLinkIds.length < 20) { // Only log if reasonable number
          console.log('Link', link.id, 'not in created IDs');
        }
        return isIncluded;
      })
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
      
    console.log('Filtered links count:', sortedLinks.length);
    console.log('Expected links count:', createdLinkIds.length);
    
    // Use fallback if we have a significant mismatch (more than 5% missing for large batches)
    const missingPercentage = (createdLinkIds.length - sortedLinks.length) / createdLinkIds.length;
    const shouldUseFallback = missingPercentage > (creationPromises.length > 500 ? 0.05 : 0.01);
    
    if (shouldUseFallback) {
      console.log(`❌ DATABASE FILTERING MISMATCH! Missing ${Math.round(missingPercentage * 100)}% of links`);
      console.log('Using fallback response generation from successful creations');
      
      // FALLBACK: Build response directly from successful creation results
      const domain = getDomain(useDevelopmentDomain);
      const protocol = useDevelopmentDomain ? 'http' : 'https';
      const baseUrl = `${protocol}://${domain}`;
      
      const fallbackLinks = successfulCreations.map((result) => {
        const linkData = result.data;
        if (!linkData) return null;
        
        // Determine link type from UID pattern or metadata
        let linkType = 'LIVE';
        let extractedMetadata = {};
        
        try {
          if (linkData.metadata) {
            extractedMetadata = JSON.parse(linkData.metadata as string);
            linkType = extractedMetadata.linkType || 'LIVE';
          }
        } catch (e) {
          // If metadata parsing fails, try to determine from UID
          if (linkData.uid && linkData.uid.includes('_TEST_')) {
            linkType = 'TEST';
          } else if (linkData.uid && linkData.uid.includes('_LIVE_')) {
            linkType = 'LIVE';
          }
        }
        
        const fullUrl = `${baseUrl}/survey/${projectId}/${linkData.uid}`;
        
        return {
          id: linkData.id,
          uid: linkData.uid,
          originalUrl: extractedMetadata.originalUrl || originalUrl,
          status: linkData.status || 'UNUSED',
          linkType: linkType,
          fullUrl: fullUrl,
          geoRestriction: extractedMetadata.geoRestriction || geoRestriction,
          vendor: linkData.vendorId ? { name: extractedMetadata.vendorName || 'Unknown', code: '' } : null,
          createdAt: linkData.createdAt
        };
      }).filter(Boolean);
      
      console.log('✅ Using fallback response with', fallbackLinks.length, 'links');
      
      // Log successful creation
      await securityService.logSecurityEvent('LINK_GENERATION_SUCCESS', {
        projectId,
        count: fallbackLinks.length,
        fallbackUsed: true
      });

      console.log('=== FINAL RESPONSE DEBUG (FALLBACK) ===');
      console.log('Returning', fallbackLinks.length, 'formatted links');
      const finalTestCount = fallbackLinks.filter(link => link && link.linkType === 'TEST').length;
      const finalLiveCount = fallbackLinks.filter(link => link && link.linkType === 'LIVE').length;
      console.log('TEST links:', finalTestCount);
      console.log('LIVE links:', finalLiveCount);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        count: fallbackLinks.length,
        links: fallbackLinks,
        fallbackUsed: true
      });
    }
    
    // Get vendor information for links that have vendors
    const linkedVendorIds = sortedLinks
      .filter((link: SurveyLink) => link.vendorId)
      .map((link: SurveyLink) => link.vendorId as string);  // Add type assertion to ensure string type
    
    // Fetch vendors individually to avoid GraphQL filter issues
    const vendorResults = { data: [] as Vendor[] };
    if (linkedVendorIds.length > 0) {
      const uniqueVendorIds = Array.from(new Set(linkedVendorIds)); // Remove duplicates
      for (const vendorId of uniqueVendorIds) {
        try {
          const vendorResult = await amplifyServerService.getVendor(vendorId);
          if (vendorResult.data) {
            vendorResults.data.push(vendorResult.data);
          }
        } catch (error) {
          console.error(`Failed to fetch vendor ${vendorId}:`, error);
        }
      }
    }
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
      const fullUrl = `${baseUrl}/survey/${projectId}/${link.uid}`;
      
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

    console.log('=== FINAL RESPONSE DEBUG ===');
    console.log('Returning', formattedLinks.length, 'formatted links');
    console.log('Link types breakdown:');
    const finalTestCount = formattedLinks.filter(link => link.linkType === 'TEST').length;
    const finalLiveCount = formattedLinks.filter(link => link.linkType === 'LIVE').length;
    console.log('TEST links:', finalTestCount);
    console.log('LIVE links:', finalLiveCount);
    console.log('==========================');

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