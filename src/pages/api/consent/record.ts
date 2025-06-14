import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';

interface ConsentRecord {
  projectId: string;
  uid: string;
  consents: Record<string, boolean>;
  metadata?: {
    userLocation?: any;
    timestamp?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const amplifyServerService = getAmplifyServerService();
    const { projectId, uid, consents, metadata } = req.body as ConsentRecord;

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               'unknown';

    // Validate required fields
    if (!projectId || !uid || !consents) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId, uid, and consents' 
      });
    }

    // Log security event
    await securityService.logSecurityEvent('CONSENT_RECORDED', {
      projectId,
      uid,
      ip,
      consentCount: Object.keys(consents).length,
      allConsented: Object.values(consents).every(c => c === true)
    });

    // Verify survey link exists
    const surveyLinkResult = await amplifyServerService.listSurveyLinks({
      and: [
        { projectId: { eq: projectId } },
        { uid: { eq: uid } }
      ]
    });

    if (!surveyLinkResult.data || surveyLinkResult.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    const surveyLink = surveyLinkResult.data[0];
    const timestamp = new Date().toISOString();

    // Create consent record
    const consentRecord = {
      projectId,
      uid,
      consentData: JSON.stringify(consents),
      metadata: JSON.stringify({
        ...metadata,
        recordedAt: timestamp,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || undefined,
        consentDetails: Object.entries(consents).map(([key, value]) => ({
          consentId: key,
          granted: value,
          timestamp
        }))
      }),
      recordedAt: timestamp,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || undefined
    };

    // Try to create consent record using a custom function since we don't have a ConsentRecord model
    // For now, we'll store it in the survey link metadata
    const existingMetadata = JSON.parse(surveyLink.metadata || '{}');
    const updatedMetadata = {
      ...existingMetadata,
      consent: {
        granted: true,
        timestamp,
        consents,
        metadata: metadata || {},
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || undefined
      }
    };

    await amplifyServerService.updateSurveyLink(surveyLink.id, {
      metadata: JSON.stringify(updatedMetadata)
    });

    // Log successful consent recording
    await securityService.logSecurityEvent('CONSENT_RECORDED_SUCCESS', {
      projectId,
      uid,
      consentCount: Object.keys(consents).length
    });

    return res.status(200).json({
      success: true,
      message: 'Consent recorded successfully',
      timestamp
    });

  } catch (error) {
    console.error('Error recording consent:', error);
    
    // Log error
    await securityService.logSecurityEvent('CONSENT_RECORD_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to record consent',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}
