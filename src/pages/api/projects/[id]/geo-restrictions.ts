import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id: projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    const amplifyServerService = getAmplifyServerService();

    // Get project details
    const projectResult = await amplifyServerService.getProject(projectId);
    
    if (!projectResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    const project = projectResult.data;
    let geoRestrictions: string[] | null = null;

    // Parse geo restrictions from project settings
    if (project.settings) {
      try {
        const settings = typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings;
        geoRestrictions = settings.geoRestrictions || settings.allowedCountries || null;
      } catch (e) {
        console.error('Error parsing project settings:', e);
      }
    }

    // If no restrictions in metadata, check for a direct geoRestriction field
    if (!geoRestrictions && (project as any).geoRestriction) {
      geoRestrictions = Array.isArray((project as any).geoRestriction) 
        ? (project as any).geoRestriction 
        : [(project as any).geoRestriction];
    }

    return res.status(200).json({
      success: true,
      restrictions: geoRestrictions,
      hasRestrictions: geoRestrictions && geoRestrictions.length > 0,
      allowedCountries: geoRestrictions || []
    });

  } catch (error) {
    console.error('Error fetching geo restrictions:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch geo restrictions',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}
