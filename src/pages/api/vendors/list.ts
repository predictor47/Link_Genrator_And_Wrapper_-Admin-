import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, message: 'Project ID is required' });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Get vendors through ProjectVendor relationships
    const projectVendorsResult = await amplifyServerService.listProjectVendors({
      projectId: { eq: projectId }
    });

    if (!projectVendorsResult.data || projectVendorsResult.data.length === 0) {
      return res.status(200).json({ success: true, vendors: [] });
    }

    // Get vendor details for each ProjectVendor relationship
    const vendorIds = projectVendorsResult.data
      .map(pv => pv.vendorId)
      .filter(id => id !== null && id !== undefined);

    if (vendorIds.length === 0) {
      return res.status(200).json({ success: true, vendors: [] });
    }

    const vendorsResult = await amplifyServerService.listVendors({
      id: { in: vendorIds }
    });

    const vendors = vendorsResult.data.map(vendor => {
      // Extract vendor code from settings if it exists
      let vendorCode = '';
      try {
        const settings = vendor.settings ? JSON.parse(vendor.settings as string) : {};
        vendorCode = settings.code || '';
      } catch (e) {
        vendorCode = '';
      }

      return {
        id: vendor.id,
        name: vendor.name || '',
        code: vendorCode
      };
    });

    return res.status(200).json({
      success: true,
      vendors: vendors
    });

  } catch (error) {
    console.error('Error listing vendors:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to list vendors' 
    });
  }
}