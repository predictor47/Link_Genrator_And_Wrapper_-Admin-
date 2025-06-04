import type { NextApiRequest, NextApiResponse } from 'next';
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
    
    console.log('🔍 Debug: Fetching vendors for project:', projectId);
    
    // First, check if the project exists
    const projectResult = await amplifyServerService.getProject(projectId);
    console.log('🔍 Debug: Project result:', projectResult);
    
    // Get vendors through ProjectVendor relationships
    const projectVendorsResult = await amplifyServerService.listProjectVendors({
      projectId: { eq: projectId }
    });
    console.log('🔍 Debug: ProjectVendors result:', projectVendorsResult);

    if (!projectVendorsResult.data || projectVendorsResult.data.length === 0) {
      console.log('🔍 Debug: No ProjectVendor relationships found');
      return res.status(200).json({ 
        success: true, 
        debug: {
          project: projectResult.data ? 'exists' : 'not found',
          projectVendors: 'none',
          vendors: []
        }
      });
    }

    // Get vendor details for each ProjectVendor relationship
    const vendorIds = projectVendorsResult.data
      .map(pv => pv.vendorId)
      .filter(id => id !== null && id !== undefined);
    
    console.log('🔍 Debug: Vendor IDs to fetch:', vendorIds);

    if (vendorIds.length === 0) {
      console.log('🔍 Debug: No valid vendor IDs found');
      return res.status(200).json({ 
        success: true, 
        debug: {
          project: projectResult.data ? 'exists' : 'not found',
          projectVendors: projectVendorsResult.data.length,
          vendorIds: 'none',
          vendors: []
        }
      });
    }

    const vendorsResult = await amplifyServerService.listVendors({
      id: { in: vendorIds }
    });
    console.log('🔍 Debug: Vendors result:', vendorsResult);

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
        code: vendorCode,
        settings: vendor.settings
      };
    });

    console.log('🔍 Debug: Final processed vendors:', vendors);

    return res.status(200).json({
      success: true,
      debug: {
        project: projectResult.data ? 'exists' : 'not found',
        projectVendors: projectVendorsResult.data.length,
        vendorIds: vendorIds.length,
        rawVendors: vendorsResult.data.length,
        processedVendors: vendors.length
      },
      vendors: vendors
    });

  } catch (error) {
    console.error('🔍 Debug: Error in vendor debug endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Internal server error',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
}
