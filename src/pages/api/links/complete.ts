import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const amplifyServerService = getAmplifyServerService();
    const { projectId, uid, token, vendorId, metadata } = req.body;

    if (!projectId || !uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Get the survey link
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid);
    const surveyLink = surveyLinkResult.data;
    
    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    // Only allow completion if the survey is in CLICKED state (previously STARTED or IN_PROGRESS)
    if (surveyLink.status !== 'CLICKED') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete survey from ${surveyLink.status} status`
      });
    }

    // Check for consistency in metadata
    let shouldFlag = false;
    let flagReason = '';
    
    if (metadata) {
      // Check if the consistency score is low
      if (metadata.consistencyScore !== undefined && metadata.consistencyScore < 70) {
        shouldFlag = true;
        flagReason = `Low metadata consistency score: ${metadata.consistencyScore}/100`;
      }
      
      // Check if IP address changed (could be a sign of proxy switching)
      if (
        metadata.initialMetadata && 
        metadata.initialMetadata.ip &&
        metadata.ip && 
        metadata.initialMetadata.ip !== metadata.ip
      ) {
        shouldFlag = true;
        flagReason = 'IP address changed during survey';
      }
    }    // Prepare update data
    const updateData: any = { 
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    };
    
    // Store metadata, including any flag info if suspicious activity detected
    const metadataToStore: any = {
      ...metadata,
      completionTimestamp: new Date().toISOString()
    };
    
    if (shouldFlag) {
      metadataToStore.flagged = true;
      metadataToStore.flagReason = flagReason;
      metadataToStore.flaggedAt = new Date().toISOString();
    }
    
    updateData.metadata = JSON.stringify(metadataToStore);
    
    // Update vendor information if provided and different from current
    if (vendorId && vendorId !== surveyLink.vendorId) {
      // Verify vendor belongs to this project by checking ProjectVendor relationship
      const projectVendors = await amplifyServerService.listProjectVendors({
        and: [
          { projectId: { eq: projectId } },
          { vendorId: { eq: vendorId } }
        ]
      });
      const validVendor = projectVendors.data.find((pv: any) => pv.vendorId === vendorId);
      
      if (validVendor) {
        updateData.vendorId = vendorId;
      }
    }
    
    if (!surveyLink.id) {
      throw new Error('Survey link ID is null or undefined');
    }
    
    await amplifyServerService.updateSurveyLink(surveyLink.id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Survey marked as completed successfully'
    });
  } catch (error) {
    console.error('Error completing survey:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}