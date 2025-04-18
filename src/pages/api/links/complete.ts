import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, uid, token } = req.body;

    if (!projectId || !uid) {
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

    // Update survey link status to completed
    await prisma.surveyLink.update({
      where: { id: surveyLink.id },
      data: { status: 'COMPLETED' }
    });

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