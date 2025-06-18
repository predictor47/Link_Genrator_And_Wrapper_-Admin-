import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

interface LinkStats {
  total: number;
  active: number;
  completed: number;
  testLinks: number;
  liveLinks: number;
  byVendor: Record<string, number>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LinkStats | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const amplifyService = await getAmplifyServerService();
    if (!amplifyService) {
      return res.status(500).json({ error: 'Database service not available' });
    }

    // Get all links for the project
    const linksResult = await amplifyService.listSurveyLinksByProject(projectId);

    const links = linksResult?.data || [];

    // Calculate statistics
    const stats: LinkStats = {
      total: links.length,
      active: links.filter(link => link.status === 'UNUSED' || link.status === 'CLICKED').length,
      completed: links.filter(link => link.status === 'COMPLETED').length,
      testLinks: 0, // Will calculate from metadata
      liveLinks: 0, // Will calculate from metadata
      byVendor: {}
    };

    // Count by vendor and parse metadata for link types
    links.forEach(link => {
      const vendorId = link.vendorId || 'unknown';
      stats.byVendor[vendorId] = (stats.byVendor[vendorId] || 0) + 1;
      
      // Try to parse metadata for link type
      try {
        const metadata = link.metadata ? JSON.parse(link.metadata) : {};
        if (metadata.linkType === 'TEST') {
          stats.testLinks++;
        } else if (metadata.linkType === 'LIVE') {
          stats.liveLinks++;
        }
      } catch (e) {
        // If no metadata or parsing fails, assume LIVE
        stats.liveLinks++;
      }
    });

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error getting link stats:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
