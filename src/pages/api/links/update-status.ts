import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

interface UpdateStatusRequest {
  projectId: string;
  uid: string;
  status: string;
  vendorId?: string;
  metadata?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS for cross-domain requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { projectId, uid, status, vendorId, metadata } = req.body as UpdateStatusRequest;

    if (!projectId || !uid || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Validate status values
    const validStatuses = [
      'PENDING', 
      'STARTED', 
      'IN_PROGRESS', 
      'COMPLETED', 
      'QUOTA_FULL', 
      'DISQUALIFIED', 
      'FLAGGED'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values are: ${validStatuses.join(', ')}`
      });
    }

    // Get the survey link using Amplify
    const surveyLinkResult = await amplifyDataService.surveyLinks.getByUid(uid);
    if (!surveyLinkResult || !surveyLinkResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }
    
    const surveyLink = surveyLinkResult.data;

    // Verify this survey link belongs to the specified project
    if (surveyLink.projectId !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Survey link does not belong to the specified project'
      });
    }

    // Prepare update data
    const updateData: any = { 
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Update vendor information if provided and different from current
    if (vendorId && vendorId !== surveyLink.vendorId) {
      // Verify vendor belongs to this project using Amplify
      const vendorResult = await amplifyDataService.vendors.list({
        filter: {
          and: [
            { id: { eq: vendorId } },
            { projectId: { eq: projectId } }
          ]
        }
      });
      
      if (vendorResult.data && vendorResult.data.length > 0) {
        updateData.vendorId = vendorId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Vendor not found or does not belong to this project'
        });
      }
    }
    
    // Update survey link status using Amplify
    if (!surveyLink.id) {
      throw new Error('Survey link ID is null or undefined');
    }
    await amplifyDataService.surveyLinks.update(surveyLink.id, updateData);

    // Get vendor info if available
    let vendorCode = null;
    if (surveyLink.vendorId || updateData.vendorId) {
      const vendorId = updateData.vendorId || surveyLink.vendorId;
      if (vendorId) {
        const vendorResult = await amplifyDataService.vendors.get(vendorId);
        vendorCode = vendorResult.data?.code || null;
      }
    }

    // Store metadata if provided
    if (metadata) {
      // Create a response record with the status update metadata
      await amplifyDataService.responses.create({
        surveyLinkId: surveyLink.id,
        projectId,
        questionId: '00000000-0000-0000-0000-000000000000', // Placeholder for status update metadata
        answer: status,
        metadata: JSON.stringify({
          statusUpdateTimestamp: new Date().toISOString(),
          previousStatus: surveyLink.status,
          ...(metadata || {})
        })
      });
    }

    return res.status(200).json({
      success: true,
      message: `Survey link status updated to ${status}`,
      updatedLink: {
        uid: surveyLink.uid,
        status,
        vendor: vendorCode
      }
    });
  } catch (error) {
    console.error('Error updating survey link status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}