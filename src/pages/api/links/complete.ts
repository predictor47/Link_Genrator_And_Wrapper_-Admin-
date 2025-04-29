import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, uid, token, vendorId, metadata } = req.body;

    if (!projectId || !uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Verify token (in a real app, we'd validate the session token more securely)
    
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

    // Only allow completion if the survey is in STARTED or IN_PROGRESS state
    if (surveyLink.status !== 'STARTED' && surveyLink.status !== 'IN_PROGRESS') {
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
    }

    // If suspicious activity detected, flag but still mark as completed
    if (shouldFlag) {
      await prisma.flag.create({
        data: {
          surveyLinkId: surveyLink.id,
          projectId,
          reason: flagReason,
          metadata: JSON.stringify(metadata || {})
        }
      });
    }

    // Prepare update data
    const updateData: any = { 
      status: 'COMPLETED' 
    };
    
    // Update vendor information if provided and different from current
    if (vendorId && vendorId !== surveyLink.vendorId) {
      // Verify vendor belongs to this project
      const vendorExists = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          projectId
        }
      });
      
      if (vendorExists) {
        updateData.vendorId = vendorId;
      }
    }
    
    // Update survey link status to completed
    await prisma.surveyLink.update({
      where: { id: surveyLink.id },
      data: updateData
    });

    // Store completion metadata if provided
    if (metadata) {
      // Create a response record with the completion metadata
      await prisma.response.create({
        data: {
          surveyLinkId: surveyLink.id,
          projectId,
          questionId: '00000000-0000-0000-0000-000000000000', // Placeholder for completion metadata
          answer: 'COMPLETION',
          metadata: JSON.stringify({
            completionTimestamp: new Date().toISOString(),
            ...metadata
          })
        }
      });
    }

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