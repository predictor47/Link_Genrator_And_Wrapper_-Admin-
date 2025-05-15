import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    // Check if project exists first
    const projectResult = await amplifyDataService.projects.get(projectId);
    
    if (!projectResult || !projectResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Get all vendors for this project using Amplify
    const vendorsResult = await amplifyDataService.vendors.listByProject(projectId);
      // Sort vendors by name with proper null checks
    const vendors = vendorsResult.data
      .filter(v => v !== null)
      .sort((a, b) => 
        ((a && a.name) || '').localeCompare((b && b.name) || '')
      );

    return res.status(200).json({ 
      success: true, 
      vendors 
    });
  } catch (error) {
    console.error('Error listing vendors:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to list vendors' 
    });
  }
}