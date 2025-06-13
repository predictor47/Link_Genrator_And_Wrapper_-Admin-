import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';
import { domainBlacklistService } from '@/lib/domain-blacklist';
import { honeypotService } from '@/lib/honeypot-service';
import { flatlineDetectionService } from '@/lib/flatline-detection';
import { genAIDetectionService } from '@/lib/genai-detection';

interface QCAnalysisRequest {
  projectId: string;
  uid: string;
  responses: Record<string, any>;
  metadata?: {
    timeSpent?: number;
    behaviorData?: any;
    deviceInfo?: any;
    ipAddress?: string;
    userAgent?: string;
  };
}

interface QCAnalysisResult {
  success: boolean;
  qcScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  details: {
    domainCheck?: any;
    honeypotCheck?: any;
    flatlineCheck?: any;
    aiCheck?: any;
    behaviorCheck?: any;
    speedCheck?: any;
  };
  recommendations: string[];
  shouldFlag: boolean;
  shouldExclude: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QCAnalysisResult | { success: false; message: string; error?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const amplifyServerService = getAmplifyServerService();
    const { projectId, uid, responses, metadata } = req.body as QCAnalysisRequest;

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               metadata?.ipAddress ||
               'unknown';

    // Validate required fields
    if (!projectId || !uid || !responses) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId, uid, and responses' 
      });
    }

    // Log QC analysis event
    await securityService.logSecurityEvent('QC_ANALYSIS_STARTED', {
      projectId,
      uid,
      ip,
      responseCount: Object.keys(responses).length
    });

    // Initialize QC analysis results
    const qcFlags: string[] = [];
    const qcDetails: any = {};
    const recommendations: string[] = [];
    let qcScore = 0;

    // ========== 1. DOMAIN BLACKLIST CHECK ==========
    const emailResponses = Object.values(responses).filter(response => 
      typeof response === 'string' && response.includes('@')
    ) as string[];

    if (emailResponses.length > 0) {
      const domains = emailResponses.map(email => email.split('@')[1]);
      const domainResults = await Promise.all(
        domains.map(domain => domainBlacklistService.checkDomain(domain))
      );

      const blacklistedDomains = domainResults.filter(result => result.isBlacklisted);
      if (blacklistedDomains.length > 0) {
        blacklistedDomains.forEach(result => {
          qcFlags.push(`BLACKLISTED_DOMAIN:${result.category}:${result.reason}`);
          qcScore += 30;
        });
        recommendations.push('Suspicious email domain detected - consider manual verification');
      }

      qcDetails.domainCheck = {
        domainsChecked: domains,
        blacklistedCount: blacklistedDomains.length,
        results: domainResults
      };
    }

    // ========== 2. HONEYPOT CHECK ==========
    const sessionId = `qc_${projectId}_${uid}_${Date.now()}`;
    
    // Generate honeypots for validation (in real implementation, these would be shown in the survey)
    const honeypotGeneration = honeypotService.generateHoneypots(sessionId, 3);
    
    // Check if any honeypot-like patterns exist in responses
    const honeypotResult = honeypotService.validateHoneypots(sessionId, responses);
    
    if (honeypotResult.triggered) {
      qcFlags.push(...honeypotResult.flags);
      qcScore += honeypotResult.confidence * 0.5; // Scale down since it's post-hoc analysis
      recommendations.push('Response patterns suggest automated submission');
    }

    qcDetails.honeypotCheck = honeypotResult;

    // ========== 3. FLATLINE DETECTION ==========
    const responseObjects = Object.entries(responses).map(([questionId, answer]) => ({
      questionId,
      questionText: `Question ${questionId}`,
      answer: String(answer),
      questionType: 'text' as const
    }));

    const flatlineResult = flatlineDetectionService.detectFlatline(responseObjects);
    
    if (flatlineResult.isFlatline) {
      qcFlags.push(`FLATLINE:${flatlineResult.severity}:${flatlineResult.patterns.length}_patterns`);
      qcScore += flatlineResult.score;
      recommendations.push(...flatlineResult.recommendations);
    }

    qcDetails.flatlineCheck = flatlineResult;

    // ========== 4. AI DETECTION ==========
    const textResponses = Object.entries(responses)
      .filter(([, answer]) => typeof answer === 'string' && String(answer).length > 20)
      .map(([questionId, answer]) => ({ questionId, text: String(answer) }));

    if (textResponses.length > 0) {
      const aiResult = genAIDetectionService.analyzeTextResponses(textResponses);
      
      if (aiResult.isAIGenerated) {
        qcFlags.push(`AI_GENERATED:${aiResult.riskLevel}:confidence_${aiResult.confidence}`);
        qcScore += aiResult.confidence * 0.8; // AI detection is high confidence
        recommendations.push(...aiResult.recommendations);
      }

      qcDetails.aiCheck = aiResult;
    }

    // ========== 5. BEHAVIOR ANALYSIS ==========
    if (metadata?.behaviorData) {
      const behaviorFlags = analyzeBehaviorData(metadata.behaviorData);
      qcFlags.push(...behaviorFlags.flags);
      qcScore += behaviorFlags.score;
      qcDetails.behaviorCheck = behaviorFlags;

      if (behaviorFlags.suspicious) {
        recommendations.push('Suspicious behavioral patterns detected');
      }
    }

    // ========== 6. SPEED ANALYSIS ==========
    if (metadata?.timeSpent) {
      const speedAnalysis = analyzeResponseSpeed(metadata.timeSpent, Object.keys(responses).length);
      if (speedAnalysis.suspicious) {
        qcFlags.push(`SPEED_ISSUE:${speedAnalysis.reason}`);
        qcScore += speedAnalysis.score;
        if (speedAnalysis.recommendation) {
          recommendations.push(speedAnalysis.recommendation);
        }
      }
      qcDetails.speedCheck = speedAnalysis;
    }

    // ========== CALCULATE FINAL RISK ASSESSMENT ==========
    const riskLevel = calculateRiskLevel(qcScore, qcFlags);
    const shouldFlag = qcScore >= 30 || qcFlags.length >= 3;
    const shouldExclude = qcScore >= 60 || riskLevel === 'CRITICAL';

    // Add general recommendations
    if (shouldExclude) {
      recommendations.push('STRONG RECOMMENDATION: Exclude this response from final analysis');
    } else if (shouldFlag) {
      recommendations.push('Recommend manual review before including in analysis');
    }

    // Store QC results in survey link metadata
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid);
    if (surveyLinkResult.data) {
      const currentMetadata = surveyLinkResult.data.metadata ? 
        JSON.parse(surveyLinkResult.data.metadata as string) : {};
      
      const updatedMetadata = {
        ...currentMetadata,
        qcAnalysis: {
          timestamp: new Date().toISOString(),
          score: qcScore,
          riskLevel,
          flags: qcFlags,
          shouldFlag,
          shouldExclude,
          details: qcDetails
        }
      };

      await amplifyServerService.updateSurveyLink(surveyLinkResult.data.id, {
        metadata: JSON.stringify(updatedMetadata)
      });
    }

    // Log QC analysis completion
    await securityService.logSecurityEvent('QC_ANALYSIS_COMPLETED', {
      projectId,
      uid,
      qcScore,
      riskLevel,
      flagCount: qcFlags.length,
      shouldExclude
    });

    const result: QCAnalysisResult = {
      success: true,
      qcScore,
      riskLevel,
      flags: qcFlags,
      details: qcDetails,
      recommendations,
      shouldFlag,
      shouldExclude
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in QC analysis:', error);
    
    // Log error
    await securityService.logSecurityEvent('QC_ANALYSIS_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'QC analysis failed',
      error: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

/**
 * Analyze behavior data for suspicious patterns
 */
function analyzeBehaviorData(behaviorData: any): {
  suspicious: boolean;
  flags: string[];
  score: number;
  details: any;
} {
  const flags: string[] = [];
  let score = 0;
  let suspicious = false;

  // Check mouse movements
  if (behaviorData.mouseMovements < 10) {
    flags.push('MINIMAL_MOUSE_MOVEMENT');
    score += 20;
    suspicious = true;
  }

  // Check keyboard events
  if (behaviorData.keyboardEvents < 5) {
    flags.push('MINIMAL_KEYBOARD_ACTIVITY');
    score += 15;
    suspicious = true;
  }

  // Check for suspicious patterns
  if (behaviorData.suspiciousPatterns && behaviorData.suspiciousPatterns.length > 0) {
    flags.push('SUSPICIOUS_BEHAVIOR_PATTERNS');
    score += behaviorData.suspiciousPatterns.length * 10;
    suspicious = true;
  }

  // Check activity rate
  if (behaviorData.activityRate && behaviorData.activityRate < 0.1) {
    flags.push('LOW_ACTIVITY_RATE');
    score += 25;
    suspicious = true;
  }

  return {
    suspicious,
    flags,
    score: Math.min(score, 50), // Cap behavior score
    details: {
      mouseMovements: behaviorData.mouseMovements,
      keyboardEvents: behaviorData.keyboardEvents,
      activityRate: behaviorData.activityRate,
      suspiciousPatterns: behaviorData.suspiciousPatterns
    }
  };
}

/**
 * Analyze response speed for suspicious patterns
 */
function analyzeResponseSpeed(timeSpent: number, questionCount: number): {
  suspicious: boolean;
  reason?: string;
  score: number;
  recommendation?: string;
} {
  const averageTimePerQuestion = timeSpent / questionCount;
  
  // Too fast (less than 5 seconds per question)
  if (averageTimePerQuestion < 5) {
    return {
      suspicious: true,
      reason: 'TOO_FAST',
      score: 30,
      recommendation: 'Response completed suspiciously quickly'
    };
  }
  
  // Extremely fast (less than 2 seconds per question)
  if (averageTimePerQuestion < 2) {
    return {
      suspicious: true,
      reason: 'EXTREMELY_FAST',
      score: 50,
      recommendation: 'Response completed at inhuman speed'
    };
  }
  
  // Too slow (more than 10 minutes per question - might indicate distraction)
  if (averageTimePerQuestion > 600) {
    return {
      suspicious: true,
      reason: 'TOO_SLOW',
      score: 10,
      recommendation: 'Unusually long time spent - check for engagement'
    };
  }

  return {
    suspicious: false,
    score: 0
  };
}

/**
 * Calculate overall risk level based on QC score and flags
 */
function calculateRiskLevel(score: number, flags: string[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Critical flags
  const criticalFlags = flags.filter(flag => 
    flag.includes('AI_GENERATED:CRITICAL') || 
    flag.includes('BLACKLISTED_DOMAIN') ||
    flag.includes('EXTREMELY_FAST')
  );

  if (criticalFlags.length > 0 || score >= 80) return 'CRITICAL';
  if (score >= 60 || flags.length >= 5) return 'HIGH';
  if (score >= 30 || flags.length >= 3) return 'MEDIUM';
  return 'LOW';
}
