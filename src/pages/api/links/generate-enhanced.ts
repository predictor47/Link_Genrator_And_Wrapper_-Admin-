import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';
import * as multiparty from 'multiparty';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

// Utility functions
const generateUniqueId = () => nanoid(12);
const getDomainForLinks = (useDevelopment: boolean) => {
  return useDevelopment ? 'localhost:3000' : (process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com');
};

// Enhanced types for the new system
type GenerateLinksRequest = {
  projectId: string;
  originalUrl: string; // Client's survey URL with placeholder for resp_id
  
  // Generation modes
  generationMode: 'vendor' | 'internal' | 'both';
  
  // Sequential generation (for vendor mode)
  startRespId?: string; // e.g., "al001"
  testCount?: number;
  liveCount?: number;
  
  // CSV upload (for internal mode)
  csvRespIds?: string[]; // Array of resp_ids from CSV
  
  // Vendor assignment
  vendorId?: string;
  vendorIds?: string[];
  generatePerVendor?: boolean;
  
  // Optional settings
  geoRestriction?: string[];
  useDevelopmentDomain?: boolean;
};

// Utility functions for resp_id generation
function parseRespId(respId: string): { prefix: string; number: number } {
  const match = respId.match(/^([a-zA-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid resp_id format: ${respId}. Expected format like 'al001'`);
  }
  return {
    prefix: match[1],
    number: parseInt(match[2], 10)
  };
}

function generateSequentialRespIds(startRespId: string, count: number): string[] {
  const { prefix, number } = parseRespId(startRespId);
  const respIds = [];
  
  for (let i = 0; i < count; i++) {
    const currentNumber = number + i;
    const paddedNumber = currentNumber.toString().padStart(3, '0'); // Maintain 3-digit padding
    respIds.push(`${prefix}${paddedNumber}`);
  }
  
  return respIds;
}

function buildSurveyUrl(baseUrl: string, respId: string): string {
  // Check if the URL already has an equals sign for appending
  if (baseUrl.includes('=')) {
    // If URL ends with =, append the respId directly
    if (baseUrl.endsWith('=')) {
      return `${baseUrl}${respId}`;
    }
    // If URL has = but doesn't end with it, add &respId=
    return `${baseUrl}&respId=${respId}`;
  }
  
  // If no equals sign, add ?respId=
  return `${baseUrl}?respId=${respId}`;
}

// Domain configuration
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const DEVELOPMENT_DOMAIN = 'localhost:3000';

const getDomain = (useDevelopment?: boolean) => {
  return useDevelopment ? DEVELOPMENT_DOMAIN : PRODUCTION_DOMAIN;
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
    
    // Parse request body - handle both JSON and multipart
    let formData: any = {};
    let csvRespIds: string[] = [];
    
    console.log('=== PARSING REQUEST ===');
    console.log('Content-Type:', req.headers['content-type']);
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data');
      const form = new multiparty.Form();
      
      const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      });
      
      console.log('Parsed fields:', fields);
      
      // Extract form fields
      Object.keys(fields).forEach(key => {
        formData[key] = fields[key][0]; // multiparty returns arrays
      });
      
      // Parse CSV file if uploaded
      if (files.csvFile && files.csvFile[0]) {
        const csvFile = files.csvFile[0];
        const csvContent = require('fs').readFileSync(csvFile.path, 'utf8');
        
        // Parse CSV and extract resp_ids
        const lines = csvContent.split('\\n').filter((line: string) => line.trim());
        csvRespIds = lines.map((line: string) => {
          const columns = line.split(',');
          return columns[0]?.trim(); // Assume first column is resp_id
        }).filter(Boolean);
        
        console.log(`Parsed ${csvRespIds.length} resp_ids from CSV`);
      }
    } else {
      console.log('Processing JSON body');
      // For JSON requests, manually parse the body since bodyParser is disabled
      if (req.body) {
        formData = req.body;
      } else {
        // Manually read and parse the body for JSON requests
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();
        console.log('Raw body string:', body);
        
        if (body) {
          try {
            formData = JSON.parse(body);
          } catch (e) {
            console.error('JSON parse error:', e);
            formData = {};
          }
        }
      }
      
      console.log('Form data:', formData);
      
      const csvRespIdsField = formData.csvRespIds;
      if (Array.isArray(csvRespIdsField)) {
        csvRespIds = csvRespIdsField;
      } else if (typeof csvRespIdsField === 'string') {
        try {
          csvRespIds = JSON.parse(csvRespIdsField);
        } catch (e) {
          csvRespIds = [];
        }
      } else {
        csvRespIds = [];
      }
    }
    
    const { 
      projectId, 
      originalUrl,
      generationMode,
      startRespId,
      vendorId,
      vendorIds,
      generatePerVendor,
      geoRestriction,
      useDevelopmentDomain
    } = formData;
    
    const testCount = parseInt(formData.testCount) || 0;
    const liveCount = parseInt(formData.liveCount) || 0;

    console.log('=== ENHANCED LINK GENERATION DEBUG ===');
    console.log('Request data:', {
      projectId,
      originalUrl,
      generationMode,
      startRespId,
      testCount,
      liveCount,
      csvRespIdsCount: csvRespIds.length,
      vendorId,
      generatePerVendor
    });

    // Validation
    if (!projectId || !originalUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: projectId and originalUrl' 
      });
    }

    if (!['vendor', 'internal', 'both'].includes(generationMode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid generation mode. Must be: vendor, internal, or both' 
      });
    }

    // Generate resp_ids based on mode
    let sequentialRespIds: string[] = [];
    let allRespIds: string[] = [];
    
    if (generationMode === 'vendor' || generationMode === 'both') {
      if (!startRespId) {
        return res.status(400).json({ 
          success: false, 
          message: 'startRespId is required for vendor or both modes' 
        });
      }
      
      const totalSequential = (testCount || 0) + (liveCount || 0);
      if (totalSequential === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'testCount and/or liveCount must be greater than 0 for vendor mode' 
        });
      }
      
      sequentialRespIds = generateSequentialRespIds(startRespId, totalSequential);
      allRespIds.push(...sequentialRespIds);
    }
    
    if (generationMode === 'internal' || generationMode === 'both') {
      if (csvRespIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'CSV resp_ids are required for internal or both modes' 
        });
      }
      
      allRespIds.push(...csvRespIds);
    }

    console.log(`Generated ${allRespIds.length} total resp_ids:`, allRespIds.slice(0, 5), '...');

    // Determine target vendors
    const targetVendorIds: string[] = [];
    if (generatePerVendor && vendorIds && vendorIds.length > 0) {
      targetVendorIds.push(...vendorIds);
    } else if (vendorId) {
      targetVendorIds.push(vendorId);
    }

    // Project validation (simplified for now)
    console.log('=== PROJECT VALIDATION ===');
    if (projectId.startsWith('test-') || projectId === 'any-project-id') {
      console.log('🧪 Test project detected, skipping validation');
    } else {
      console.log('📋 Production project, validation would be here');
    }

    // Create survey links
    const creationPromises = [];
    const allCreatedIds = new Set<string>();
    let linkCounter = 0;

    console.log('=== CREATING SURVEY LINKS ===');
    
    for (const respId of allRespIds) {
      const surveyUrl = buildSurveyUrl(originalUrl, respId);
      
      // Determine link type for sequential IDs
      let linkType = 'LIVE';
      if (generationMode === 'vendor' || generationMode === 'both') {
        const sequentialIndex = sequentialRespIds.indexOf(respId);
        if (sequentialIndex !== -1 && sequentialIndex < (testCount || 0)) {
          linkType = 'TEST';
        }
      }
      
      // Generate for each vendor (or once if no vendors)
      const vendors = targetVendorIds.length > 0 ? targetVendorIds : [undefined];
      
      for (const currentVendorId of vendors) {
        const baseUid = nanoid(8);
        const uid = currentVendorId ? 
          `${currentVendorId}_${linkType}_${baseUid}` : 
          `${linkType}_${baseUid}`;
          
        const linkData = {
          projectId,
          uid,
          respId, // Store the response ID
          vendorId: currentVendorId || undefined,
          status: 'UNUSED',
          metadata: JSON.stringify({
            originalUrl,
            surveyUrl, // The full survey URL with resp_id
            linkType,
            respId,
            generationMode,
            geoRestriction: geoRestriction && geoRestriction.length > 0 ? geoRestriction : undefined
          })
        };
        
        creationPromises.push(amplifyServerService.createSurveyLink(linkData));
        linkCounter++;
      }
    }

    console.log(`Queued ${creationPromises.length} link creation promises`);

    // Execute creation in batches
    console.log('=== EXECUTING CREATION IN OPTIMIZED BATCHES ===');
    
    const BATCH_SIZE = 50; // Optimized batch size
    const BATCH_DELAY = 100; // ms between batches
    
    const createdLinksResults = [];
    const totalBatches = Math.ceil(creationPromises.length / BATCH_SIZE);
    const startTime = Date.now();
    
    for (let i = 0; i < creationPromises.length; i += BATCH_SIZE) {
      const batch = creationPromises.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} links)`);
      
      try {
        const settledResults = await Promise.allSettled(batch);
        
        for (const settledResult of settledResults) {
          if (settledResult.status === 'fulfilled' && settledResult.value?.data?.id) {
            createdLinksResults.push(settledResult.value);
            allCreatedIds.add(settledResult.value.data.id);
          } else {
            console.error('Failed to create link:', settledResult);
            createdLinksResults.push({ data: null, error: 'Creation failed' });
          }
        }
        
        // Add delay between batches
        if (i + BATCH_SIZE < creationPromises.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      } catch (error) {
        console.error(`Batch ${batchNumber} failed:`, error);
      }
    }
    
    const totalTime = Date.now() - startTime;
    const successfulCreations = createdLinksResults.filter(result => result.data);
    
    console.log(`✅ Creation completed in ${Math.round(totalTime/1000)}s`);
    console.log(`Successfully created: ${successfulCreations.length}/${creationPromises.length} links`);

    // Build response
    const domain = getDomainForLinks(useDevelopmentDomain);
    const protocol = useDevelopmentDomain ? 'http' : 'https';
    const baseUrl = `${protocol}://${domain}`;
    
    const formattedLinks = successfulCreations.map((result) => {
      const linkData = result.data;
      if (!linkData) {
        throw new Error('Link data is null');
      }
      const metadata = JSON.parse(linkData.metadata || '{}');
      
      return {
        id: linkData.id,
        uid: linkData.uid,
        respId: (linkData as any).respId, // TODO: Remove this type assertion after schema deployment
        originalUrl: metadata.originalUrl,
        surveyUrl: metadata.surveyUrl,
        wrapperUrl: `${baseUrl}/survey/${projectId}/${linkData.uid}`,
        status: linkData.status,
        linkType: metadata.linkType,
        generationMode: metadata.generationMode,
        createdAt: linkData.createdAt
      };
    });

    // Log success
    await securityService.logSecurityEvent('ENHANCED_LINK_GENERATION_SUCCESS', {
      projectId,
      count: formattedLinks.length,
      generationMode,
      respIdsCount: allRespIds.length
    });

    console.log('=== FINAL RESPONSE ===');
    console.log(`Returning ${formattedLinks.length} enhanced links`);

    return res.status(200).json({
      success: true,
      count: formattedLinks.length,
      links: formattedLinks,
      summary: {
        generationMode,
        sequentialCount: sequentialRespIds.length,
        csvCount: csvRespIds.length,
        totalRespIds: allRespIds.length,
        successfulLinks: formattedLinks.length
      }
    });

  } catch (error) {
    console.error('Enhanced link generation error:', error);
    
    await securityService.logSecurityEvent('ENHANCED_LINK_GENERATION_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate enhanced links',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Configure API for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
