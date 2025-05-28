import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { projectId, name, code } = req.body;

    if (!projectId || !name || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, name, and code are required' 
      });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Create vendor with settings containing the code
    const vendorSettings = JSON.stringify({ code });
    
    const vendorResult = await amplifyServerService.createVendor({
      name,
      settings: vendorSettings
    });

    if (!vendorResult.data) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create vendor' 
      });
    }

    // Create ProjectVendor relationship
    const projectVendorResult = await amplifyServerService.createProjectVendor({
      projectId,
      vendorId: vendorResult.data.id
    });

    if (!projectVendorResult.data) {
      // If ProjectVendor creation fails, try to clean up the vendor
      await amplifyServerService.deleteVendor({ id: vendorResult.data.id });
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create project-vendor relationship' 
      });
    }

    return res.status(201).json({
      success: true,
      vendor: {
        id: vendorResult.data.id,
        name: vendorResult.data.name,
        code: code
      }
    });

  } catch (error) {
    console.error('Error in vendor creation API:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}