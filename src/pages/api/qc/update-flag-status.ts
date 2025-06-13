import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';

interface UpdateFlagStatusRequest {
  flagId: string; // This is actually the survey link ID
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  reasoning?: string;
  reviewedBy: string;
  reviewedAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { flagId, status, reasoning, reviewedBy, reviewedAt } = req.body as UpdateFlagStatusRequest;

    // Validate required fields
    if (!flagId || !status || !reviewedBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: flagId, status, and reviewedBy' 
      });
    }

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values are: ${validStatuses.join(', ')}`
      });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Get the survey link (flagId is actually the survey link ID)
    const surveyLinkResult = await amplifyServerService.getSurveyLinkById(flagId);
    
    if (!surveyLinkResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    const surveyLink = surveyLinkResult.data;

    // Parse existing metadata
    const currentMetadata = surveyLink.metadata ? 
      JSON.parse(surveyLink.metadata as string) : {};

    // Update manual review information
    const updatedMetadata = {
      ...currentMetadata,
      manualReview: {
        status,
        reasoning,
        reviewedBy,
        reviewedAt: reviewedAt || new Date().toISOString(),
        previousStatus: currentMetadata.manualReview?.status || 'PENDING'
      }
    };

    // Update the survey link with new metadata
    await amplifyServerService.updateSurveyLink(flagId, {
      metadata: JSON.stringify(updatedMetadata)
    });

    // Log the manual review action
    await securityService.logSecurityEvent('QC_MANUAL_REVIEW', {
      surveyLinkId: flagId,
      uid: surveyLink.uid,
      projectId: surveyLink.projectId,
      newStatus: status,
      reviewedBy,
      reasoning: reasoning || 'No reasoning provided',
      qcScore: currentMetadata.qcAnalysis?.score || 0,
      riskLevel: currentMetadata.qcAnalysis?.riskLevel || 'UNKNOWN'
    });

    // If approved/rejected, update the survey link status as well
    if (status === 'APPROVED' && surveyLink.status === 'DISQUALIFIED') {
      await amplifyServerService.updateSurveyLink(flagId, {
        status: 'COMPLETED' // Or appropriate status
      });
    } else if (status === 'REJECTED') {
      await amplifyServerService.updateSurveyLink(flagId, {
        status: 'DISQUALIFIED'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Flag status updated to ${status}`,
      flagId,
      newStatus: status,
      reviewInfo: {
        reviewedBy,
        reviewedAt: reviewedAt || new Date().toISOString(),
        reasoning
      }
    });

  } catch (error) {
    console.error('Error updating flag status:', error);
    
    // Log error
    await securityService.logSecurityEvent('QC_MANUAL_REVIEW_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      flagId: req.body?.flagId
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update flag status',
      error: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}
