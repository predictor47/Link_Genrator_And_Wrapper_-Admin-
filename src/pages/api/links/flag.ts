import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, uid, token, reason, metadata } = req.body;

    if (!projectId || !uid || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Verify token (in a real app, we'd validate the session token)
    
    // Get the survey link using Amplify
    const amplifyServerService = getAmplifyServerService();
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid);
    const surveyLink = surveyLinkResult.data;

    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }    // Store flag information directly in the survey link's metadata
    if (!surveyLink.id) {
      throw new Error('Survey link ID is null or undefined');
    }
    
    // Prepare the metadata with flag information
    const currentMetadata = surveyLink.metadata ? 
      (typeof surveyLink.metadata === 'string' ? 
        JSON.parse(surveyLink.metadata) : surveyLink.metadata) 
      : {};
    
    const flagMetadata = {
      ...currentMetadata,
      flagged: true,
      flagReason: reason,
      flaggedAt: new Date().toISOString(),
      ...(metadata || {})
    };

    // Update the survey link status and store flag info in metadata
    await amplifyServerService.updateSurveyLink(surveyLink.id, { 
      status: 'FLAGGED',
      metadata: JSON.stringify(flagMetadata)
    });

    return res.status(200).json({
      success: true,
      message: 'Survey response flagged successfully'
    });
  } catch (error) {
    console.error('Error flagging survey:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}