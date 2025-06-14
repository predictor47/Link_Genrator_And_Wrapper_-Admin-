import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';
import { enhancedFingerprintingService } from '@/lib/enhanced-fingerprinting';
import { enhancedGeoDetector } from '@/lib/enhanced-geo-detection';
import { detectAdvancedVPN } from '@/lib/advanced-vpn-detection';

interface RawDataSubmission {
  projectId: string;
  uid: string;
  surveyData?: any;
  presurveyAnswers?: Record<string, any>;
  enhancedFingerprint?: any;
  behavioralData?: any;
  completionData?: {
    completedAt: string;
    completionTime: number;
    finalUrl?: string;
    status: string;
  };
  metadata?: any;
}

interface EnhancedRawDataRecord {
  id: string;
  projectId: string;
  uid: string;
  surveyLinkId?: string; // Added survey link ID reference
  
  // Survey data
  surveyData?: any;
  presurveyAnswers?: Record<string, any>;
  completionData?: any;
  
  // Enhanced tracking data
  enhancedFingerprint?: any;
  behavioralData?: any;
  securityContext?: any;
  geoLocationData?: any;
  vpnDetectionData?: any;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  submittedAt: string;
  processingFlags?: string[];
  dataQualityScore?: number;
  
  // Analytics fields
  timeOnSurvey?: number;
  deviceType?: string;
  browserType?: string;
  locationAccuracy?: string;
  securityRisk?: string;
  
  createdAt: string;
  updatedAt: string;
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
    const { projectId, uid, surveyData, presurveyAnswers, enhancedFingerprint, behavioralData, completionData, metadata } = req.body as RawDataSubmission;

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               'unknown';
    
    // Validate required fields
    if (!projectId || !uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId and uid' 
      });
    }

    // Log security event
    await securityService.logSecurityEvent('RAW_DATA_SUBMISSION', {
      projectId,
      uid,
      ip,
      hasPresurveyAnswers: !!presurveyAnswers,
      hasBehavioralData: !!behavioralData,
      hasEnhancedFingerprint: !!enhancedFingerprint
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
    const surveyLinkId = surveyLink.id; // Capture the survey link ID

    // Collect enhanced security and geo data
    const securityContext = await securityService.getSecurityContext(ip);
    const geoLocationData = await enhancedGeoDetector.detectLocation(ip);
    const vpnDetectionData = await detectAdvancedVPN(ip);

    // Calculate data quality score
    const dataQualityScore = calculateDataQualityScore({
      hasPresurveyAnswers: !!presurveyAnswers,
      hasBehavioralData: !!behavioralData,
      hasEnhancedFingerprint: !!enhancedFingerprint,
      securityContext,
      geoLocationData,
      completionData
    });

    // Extract analytics fields
    const analyticsFields = extractAnalyticsFields({
      enhancedFingerprint,
      behavioralData,
      completionData,
      securityContext,
      geoLocationData,
      metadata
    });

    // Processing flags for data quality and anomaly detection
    const processingFlags = generateProcessingFlags({
      enhancedFingerprint,
      behavioralData,
      securityContext,
      geoLocationData,
      dataQualityScore
    });

    // Create comprehensive raw data record
    const rawDataRecord: Omit<EnhancedRawDataRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId,
      uid,
      surveyLinkId, // Include the survey link ID
      surveyData,
      presurveyAnswers,
      completionData,
      enhancedFingerprint,
      behavioralData,
      securityContext: {
        threatLevel: securityContext.threatLevel,
        flags: securityContext.flags,
        vpnDetection: securityContext.vpnDetection,
        geoLocation: securityContext.geoLocation
      },
      geoLocationData: {
        country: geoLocationData.country,
        countryCode: geoLocationData.countryCode,
        region: geoLocationData.region,
        city: geoLocationData.city,
        accuracy: geoLocationData.accuracy,
        confidence: geoLocationData.confidence,
        sources: geoLocationData.sources
      },
      vpnDetectionData: {
        isVPN: vpnDetectionData.isVpn,
        isProxy: vpnDetectionData.isProxy,
        isTor: vpnDetectionData.isTor,
        isHosting: vpnDetectionData.isHosting,
        confidence: vpnDetectionData.confidence,
        risk: vpnDetectionData.risk
      },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
      submittedAt: new Date().toISOString(),
      processingFlags,
      dataQualityScore,
      ...analyticsFields
    };

    // Store in database (you'll need to create this model in your Amplify schema)
    const result = await amplifyServerService.createRawDataRecord({
      ...rawDataRecord,
      surveyData: JSON.stringify(rawDataRecord.surveyData || {}),
      presurveyAnswers: JSON.stringify(rawDataRecord.presurveyAnswers || {}),
      completionData: JSON.stringify(rawDataRecord.completionData || {}),
      enhancedFingerprint: JSON.stringify(rawDataRecord.enhancedFingerprint || {}),
      behavioralData: JSON.stringify(rawDataRecord.behavioralData || {}),
      securityContext: JSON.stringify(rawDataRecord.securityContext || {}),
      geoLocationData: JSON.stringify(rawDataRecord.geoLocationData || {}),
      vpnDetectionData: JSON.stringify(rawDataRecord.vpnDetectionData || {}),
      processingFlags: JSON.stringify(rawDataRecord.processingFlags || [])
    });

    // Update survey link status if this is completion data
    if (completionData && completionData.status) {
      await amplifyServerService.updateSurveyLink(surveyLink.id, {
        status: completionData.status,
        completedAt: completionData.completedAt,
        metadata: JSON.stringify({
          ...JSON.parse(surveyLink.metadata || '{}'),
          completionTime: completionData.completionTime,
          finalUrl: completionData.finalUrl,
          dataQualityScore,
          processingFlags
        })
      });
    }

    // Log successful submission
    await securityService.logSecurityEvent('RAW_DATA_SUBMISSION_SUCCESS', {
      projectId,
      uid,
      dataQualityScore,
      processingFlags
    });

    return res.status(200).json({
      success: true,
      recordId: result.data?.id,
      dataQualityScore,
      processingFlags,
      analytics: analyticsFields
    });

  } catch (error) {
    console.error('Error storing raw data:', error);
    
    // Log error
    await securityService.logSecurityEvent('RAW_DATA_SUBMISSION_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to store raw data' 
    });
  }
}

/**
 * Calculate data quality score based on completeness and reliability
 */
function calculateDataQualityScore(params: {
  hasPresurveyAnswers: boolean;
  hasBehavioralData: boolean;
  hasEnhancedFingerprint: boolean;
  securityContext: any;
  geoLocationData: any;
  completionData?: any;
}): number {
  let score = 0;
  
  // Base completeness score (40 points)
  if (params.hasPresurveyAnswers) score += 10;
  if (params.hasBehavioralData) score += 15;
  if (params.hasEnhancedFingerprint) score += 15;
  
  // Security reliability score (30 points)
  if (params.securityContext.threatLevel === 'LOW') score += 15;
  else if (params.securityContext.threatLevel === 'MEDIUM') score += 10;
  else if (params.securityContext.threatLevel === 'HIGH') score += 5;
  // CRITICAL gets 0 points
  
  if (!params.securityContext.vpnDetection.isVPN) score += 10;
  if (!params.securityContext.vpnDetection.isTor) score += 5;
  
  // Geo accuracy score (20 points)
  if (params.geoLocationData.confidence > 80) score += 20;
  else if (params.geoLocationData.confidence > 60) score += 15;
  else if (params.geoLocationData.confidence > 40) score += 10;
  else if (params.geoLocationData.confidence > 20) score += 5;
  
  // Completion quality score (10 points)
  if (params.completionData) {
    if (params.completionData.completionTime > 30) score += 5; // Spent reasonable time
    if (params.completionData.status === 'COMPLETED') score += 5;
  }
  
  return Math.min(score, 100);
}

/**
 * Extract analytics fields for easier querying
 */
function extractAnalyticsFields(params: {
  enhancedFingerprint?: any;
  behavioralData?: any;
  completionData?: any;
  securityContext: any;
  geoLocationData: any;
  metadata?: any;
}) {
  const fields: any = {};
  
  // Time on survey
  if (params.completionData?.completionTime) {
    fields.timeOnSurvey = params.completionData.completionTime;
  }
  
  // Device type
  if (params.enhancedFingerprint?.device || params.metadata?.device) {
    fields.deviceType = params.enhancedFingerprint?.device || params.metadata?.device;
  }
  
  // Browser type
  if (params.enhancedFingerprint?.browser?.name || params.metadata?.browser) {
    fields.browserType = params.enhancedFingerprint?.browser?.name || params.metadata?.browser;
  }
  
  // Location accuracy
  fields.locationAccuracy = params.geoLocationData.accuracy || 'UNKNOWN';
  
  // Security risk
  fields.securityRisk = params.securityContext.threatLevel || 'UNKNOWN';
  
  return fields;
}

/**
 * Generate processing flags for data quality assessment
 */
function generateProcessingFlags(params: {
  enhancedFingerprint?: any;
  behavioralData?: any;
  securityContext: any;
  geoLocationData: any;
  dataQualityScore: number;
}): string[] {
  const flags: string[] = [];
  
  // Data completeness flags
  if (!params.enhancedFingerprint) flags.push('MISSING_FINGERPRINT');
  if (!params.behavioralData) flags.push('MISSING_BEHAVIORAL_DATA');
  
  // Security flags
  if (params.securityContext.threatLevel === 'HIGH') flags.push('HIGH_SECURITY_RISK');
  if (params.securityContext.threatLevel === 'CRITICAL') flags.push('CRITICAL_SECURITY_RISK');
  if (params.securityContext.vpnDetection.isVPN) flags.push('VPN_USER');
  if (params.securityContext.vpnDetection.isTor) flags.push('TOR_USER');
  
  // Geo flags
  if (params.geoLocationData.confidence < 50) flags.push('LOW_GEO_CONFIDENCE');
  if (params.geoLocationData.accuracy === 'LOW') flags.push('LOW_GEO_ACCURACY');
  
  // Behavioral flags
  if (params.behavioralData?.suspiciousPatterns?.length > 0) {
    flags.push('SUSPICIOUS_BEHAVIOR');
    params.behavioralData.suspiciousPatterns.forEach((pattern: string) => {
      flags.push(`BEHAVIOR_${pattern.toUpperCase()}`);
    });
  }
  
  // Quality flags
  if (params.dataQualityScore < 30) flags.push('LOW_DATA_QUALITY');
  else if (params.dataQualityScore < 60) flags.push('MEDIUM_DATA_QUALITY');
  else if (params.dataQualityScore >= 80) flags.push('HIGH_DATA_QUALITY');
  
  // Automation detection flags
  if (params.enhancedFingerprint?.advanced?.automationDetected) flags.push('AUTOMATION_DETECTED');
  if (params.enhancedFingerprint?.advanced?.headlessDetected) flags.push('HEADLESS_BROWSER');
  if (params.enhancedFingerprint?.advanced?.webDriverDetected) flags.push('WEBDRIVER_DETECTED');
  
  return flags;
}
