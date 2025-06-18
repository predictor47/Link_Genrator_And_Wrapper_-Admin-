import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

interface GeneratedLink {
  id: string;
  respId: string;
  originalUrl: string;
  wrapperUrl: string;
  linkType: 'TEST' | 'LIVE';
  vendorId: string;
  projectId: string;
}

interface SaveBatchRequest {
  projectId: string;
  links: GeneratedLink[];
}

interface SaveBatchResponse {
  success: boolean;
  saved: number;
  total: number;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveBatchResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, links }: SaveBatchRequest = req.body;

    if (!projectId || !links || !Array.isArray(links)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    if (links.length === 0) {
      return res.status(400).json({ error: 'No links provided' });
    }

    // Validate link structure
    for (const link of links) {
      if (!link.id || !link.respId || !link.originalUrl || !link.wrapperUrl || !link.linkType || !link.vendorId) {
        return res.status(400).json({ error: 'Invalid link structure' });
      }
    }

    const amplifyService = await getAmplifyServerService();
    if (!amplifyService) {
      return res.status(500).json({ error: 'Database service not available' });
    }

    // Save links to database
    const now = new Date().toISOString();
    const savePromises = links.map(async (link) => {
      return amplifyService.createSurveyLink({
        projectId: link.projectId,
        uid: link.respId, // Use respId as uid for compatibility
        respId: link.respId,
        vendorId: link.vendorId,
        status: 'UNUSED' as const,
        metadata: JSON.stringify({
          originalUrl: link.originalUrl,
          wrapperUrl: link.wrapperUrl,
          linkType: link.linkType,
          generationMethod: 'client-side-batch',
          batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          generatedAt: now
        })
      });
    });

    // Execute all save operations
    const results = await Promise.allSettled(savePromises);
    
    // Count successful saves
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    if (failed > 0) {
      console.error(`Failed to save ${failed} out of ${links.length} links`);
      
      // If more than 10% failed, return error
      if (failed / links.length > 0.1) {
        return res.status(500).json({ 
          error: `Failed to save ${failed} out of ${links.length} links. Too many failures.` 
        });
      }
    }

    return res.status(200).json({
      success: true,
      saved: successful,
      total: links.length,
      message: `Successfully saved ${successful} out of ${links.length} links`
    });

  } catch (error) {
    console.error('Error saving links batch:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}