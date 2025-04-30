import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

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
    const surveyLinkResult = await amplifyDataService.surveyLinks.getByUid(uid);
    const surveyLink = surveyLinkResult?.data;

    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    // Create a flag for this response using Amplify
    await amplifyDataService.flags.create({
      surveyLinkId: surveyLink.id,
      projectId,
      reason,
      metadata: JSON.stringify(metadata || {})
    });

    if (!surveyLink.id) {
      throw new Error('Survey link ID is null or undefined');
    }
    await amplifyDataService.surveyLinks.update(surveyLink.id, { 
      status: 'FLAGGED' 
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