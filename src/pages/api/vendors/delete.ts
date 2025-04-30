import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Vendor ID is required' 
    });
  }

  try {
    // Check if vendor exists
    const vendorResult = await amplifyDataService.vendors.get(id);
    const vendor = vendorResult.data;

    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Check if vendor has any survey links
    const surveyLinksResult = await amplifyDataService.surveyLinks.list({
      filter: { vendorId: { eq: id } }
    });

    if (surveyLinksResult.data && surveyLinksResult.data.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Cannot delete vendor with associated survey links' 
      });
    }

    // Delete the vendor using Amplify
    await amplifyDataService.vendors.delete(id);

    return res.status(200).json({ 
      success: true, 
      message: 'Vendor deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete vendor' 
    });
  }
}