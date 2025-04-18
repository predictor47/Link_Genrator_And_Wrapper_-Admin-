import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

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
    
    // Get the survey link
    const surveyLink = await prisma.surveyLink.findFirst({
      where: {
        projectId,
        uid
      }
    });

    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    // Create a flag for this response
    await prisma.flag.create({
      data: {
        surveyLinkId: surveyLink.id,
        projectId,
        reason,
        metadata: metadata || {}
      }
    });

    // Update survey link status to flagged
    await prisma.surveyLink.update({
      where: { id: surveyLink.id },
      data: { status: 'FLAGGED' }
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