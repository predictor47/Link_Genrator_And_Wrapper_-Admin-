import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, uid, status, token } = req.body;

    if (!projectId || !uid || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId, uid, status' 
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

    // Only allow specific status transitions to prevent abuse
    const allowedStatusUpdates = {
      'PENDING': ['STARTED', 'FLAGGED'],
      'STARTED': ['IN_PROGRESS', 'COMPLETED', 'FLAGGED'],
      'IN_PROGRESS': ['COMPLETED', 'FLAGGED']
    };

    const currentStatus = surveyLink.status;
    const allowedUpdates = allowedStatusUpdates[currentStatus as keyof typeof allowedStatusUpdates] || [];
    
    if (!allowedUpdates.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update status from ${currentStatus} to ${status}`
      });
    }

    // Update survey link status
    await prisma.surveyLink.update({
      where: { id: surveyLink.id },
      data: { status: status }
    });

    return res.status(200).json({
      success: true,
      message: `Survey status updated to ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating survey status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}