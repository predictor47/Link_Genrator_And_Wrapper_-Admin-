import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { projectId, name, code } = req.body;
    console.log('Creating vendor with:', { projectId, name, code });
    
    // Log to file for debugging
    const logData = `${new Date().toISOString()} - Creating vendor: ${JSON.stringify({ projectId, name, code })}\n`;
    fs.appendFileSync('/tmp/vendor-debug.log', logData);

    if (!projectId || !name || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, name, and code are required' 
      });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Create vendor with settings containing the code
    const vendorSettings = JSON.stringify({ code });
    console.log('Creating vendor with settings:', vendorSettings);
    
    const vendorResult = await amplifyServerService.createVendor({
      name,
      settings: vendorSettings
    });
    
    console.log('Vendor creation result:', vendorResult);
    fs.appendFileSync('/tmp/vendor-debug.log', `${new Date().toISOString()} - Vendor result: ${JSON.stringify(vendorResult, null, 2)}\n`);

    if (!vendorResult.data) {
      console.error('Failed to create vendor. Result:', vendorResult);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create vendor' 
      });
    }

    console.log('Vendor created successfully:', vendorResult.data);

    // Create ProjectVendor relationship
    console.log('Creating project-vendor relationship...');
    const projectVendorResult = await amplifyServerService.createProjectVendor({
      projectId,
      vendorId: vendorResult.data.id
    });
    
    console.log('Project-vendor creation result:', projectVendorResult);

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
    
    // Log error to file for debugging
    const errorLog = `${new Date().toISOString()} - ERROR: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error && error.stack ? error.stack : ''}\n`;
    fs.appendFileSync('/tmp/vendor-debug.log', errorLog);
    
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}