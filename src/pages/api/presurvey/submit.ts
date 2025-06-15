import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { securityService } from '@/lib/security-service';
import { domainBlacklistService } from '@/lib/domain-blacklist';
import { honeypotService } from '@/lib/honeypot-service';
import { flatlineDetectionService } from '@/lib/flatline-detection';
import { genAIDetectionService } from '@/lib/genai-detection';

interface PresurveySubmission {
  projectId: string;
  uid: string;
  answers: Record<string, any>;
  metadata?: {
    startTime?: string;
    completionTime?: number;
    questionOrder?: string[];
    deviceInfo?: any;
    browserInfo?: any;
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
    const { projectId, uid, answers, metadata } = req.body as PresurveySubmission;

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.toString() || 
               req.socket.remoteAddress || 
               'unknown';
    
    // Validate required fields
    if (!projectId || !uid || !answers) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: projectId, uid, and answers' 
      });
    }

    // Log security event
    await securityService.logSecurityEvent('PRESURVEY_SUBMISSION', {
      projectId,
      uid,
      ip,
      answerCount: Object.keys(answers).length
    });

    // ========== QC CHECKS START ==========
    
    // 1. Domain Blacklist Check (if email is provided)
    let domainFlags: string[] = [];
    const emailAnswer = Object.values(answers).find(answer => 
      typeof answer === 'string' && answer.includes('@')
    );
    
    if (emailAnswer && typeof emailAnswer === 'string') {
      const domain = emailAnswer.split('@')[1];
      const domainCheck = await domainBlacklistService.checkDomain(domain);
      if (domainCheck.isBlacklisted) {
        domainFlags.push(`BLACKLISTED_DOMAIN:${domainCheck.category}:${domainCheck.reason}`);
      }
    }

    // 2. Honeypot Check (generate a session ID for this check)
    const sessionId = `presurvey_${projectId}_${uid}_${Date.now()}`;
    const honeypotResult = honeypotService.validateHoneypots(sessionId, answers);
    const honeypotFlags = honeypotResult.triggered ? honeypotResult.flags : [];

    // 3. Flatline Detection (check for repetitive patterns)
    const responseValues = Object.values(answers).map(String);
    const responseObjects = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      questionText: `Question ${questionId}`, // Default text since we don't have the actual question text here
      answer: String(answer),
      questionType: 'text' as const
    }));
    const flatlineResult = flatlineDetectionService.detectFlatline(responseObjects);
    const flatlineFlags = flatlineResult.isFlatline ? 
      [`FLATLINE_DETECTION:${flatlineResult.patterns[0]?.type || 'unknown'}:confidence_${flatlineResult.score}`] : [];

    // 4. GenAI Detection (check for AI-generated responses)
    const textResponses = Object.entries(answers)
      .filter(([, answer]) => typeof answer === 'string' && String(answer).length > 20)
      .map(([questionId, answer]) => ({ questionId, text: String(answer) }));
    
    let aiFlags: string[] = [];
    if (textResponses.length > 0) {
      const aiResult = genAIDetectionService.analyzeTextResponses(textResponses);
      
      if (aiResult.isAIGenerated) {
        aiFlags.push(`AI_GENERATED:confidence_${aiResult.confidence}:${aiResult.riskLevel}`);
      }
    }

    // Combine all QC flags
    const allQcFlags = [...domainFlags, ...honeypotFlags, ...flatlineFlags, ...aiFlags];
    
    // Calculate overall suspicion score
    const suspicionScore = Math.min(100, 
      (domainFlags.length * 25) + 
      (honeypotFlags.length * 30) +
      (flatlineFlags.length * 20) +
      (aiFlags.length * 15)
    );

    // ========== QC CHECKS END ==========

    // Verify survey link exists and is valid
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

    // Check if link is still valid (not completed or expired)
    if (surveyLink.status && ['COMPLETED', 'DISQUALIFIED', 'QUOTA_FULL'].includes(surveyLink.status)) {
      return res.status(400).json({
        success: false,
        message: 'Survey link is no longer valid',
        status: surveyLink.status
      });
    }

    // Validate and sanitize answers
    const sanitizedAnswers = sanitizeAnswers(answers);
    const validationResult = validateAnswers(sanitizedAnswers);
    
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers format',
        errors: validationResult.errors
      });
    }

    // Check for existing presurvey submission
    const existingSubmissionResult = await amplifyServerService.listPresurveyAnswers({
      and: [
        { projectId: { eq: projectId } },
        { uid: { eq: uid } }
      ]
    });

    const timestamp = new Date().toISOString();
    
    // Get domain check result for metadata
    let domainCheckResult = null;
    if (emailAnswer && typeof emailAnswer === 'string') {
      domainCheckResult = await domainBlacklistService.checkDomain(emailAnswer.split('@')[1]);
    }
    
    // Create individual answer records for each question
    const answerRecords = Object.entries(sanitizedAnswers).map(([questionId, answerData]: [string, any]) => ({
      projectId,
      uid,
      questionId,
      questionText: answerData.questionText || questionId,
      answer: Array.isArray(answerData.answer) ? answerData.answer.join(', ') : String(answerData.answer || ''),
      answerType: answerData.type || 'text',
      metadata: JSON.stringify({
        ...metadata,
        submittedAt: timestamp,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || undefined,
        validationPassed: true,
        originalAnswer: answerData,
        // QC Results
        qcFlags: allQcFlags,
        suspicionScore,
        domainCheck: domainCheckResult,
        honeypotResult: honeypotResult.triggered ? honeypotResult : null,
        flatlineResult: flatlineResult.isFlatline ? flatlineResult : null,
        aiDetection: aiFlags.length > 0 ? { flagged: true, flags: aiFlags } : null
      }),
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || undefined,
      submittedAt: timestamp
    }));

    let results = [];
    
    if (existingSubmissionResult.data && existingSubmissionResult.data.length > 0) {
      // Check if answers already exist for this uid/project to avoid duplicates
      console.log('Existing presurvey answers found, checking for duplicates');
    }
    
    // Create all answer records
    try {
      for (const answerRecord of answerRecords) {
        const result = await amplifyServerService.createPresurveyAnswer(answerRecord);
        results.push(result);
      }
      console.log(`Created ${results.length} presurvey answer records`);
    } catch (error) {
      console.error('Error creating presurvey answers:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save presurvey answers'
      });
    }

    // Create a summary for analytics
    const answersSummary = createAnswersSummary(sanitizedAnswers);

    // Update survey link to mark that presurvey was completed
    const updatedLinkMetadata = {
      ...JSON.parse(surveyLink.metadata || '{}'),
      presurveyCompleted: true,
      presurveyCompletedAt: timestamp,
      presurveyAnswerCount: Object.keys(sanitizedAnswers).length,
      // Add QC analysis for raw data display
      qcAnalysis: {
        score: Math.max(0, 100 - suspicionScore),
        flags: allQcFlags,
        suspicionScore,
        domainCheckPassed: !domainFlags.length,
        honeypotPassed: !honeypotFlags.length,
        flatlineDetected: flatlineFlags.length > 0,
        aiDetected: aiFlags.length > 0,
        riskLevel: suspicionScore > 50 ? 'HIGH' : suspicionScore > 25 ? 'MEDIUM' : 'LOW'
      },
      // Add qualification status
      presurveyQualified: suspicionScore < 50 && allQcFlags.length < 3,
      presurveyAnalysis: answersSummary
    };

    await amplifyServerService.updateSurveyLink(surveyLink.id, {
      metadata: JSON.stringify(updatedLinkMetadata)
    });

    // Log successful submission
    await securityService.logSecurityEvent('PRESURVEY_SUBMISSION_SUCCESS', {
      projectId,
      uid,
      answerCount: Object.keys(sanitizedAnswers).length,
      isUpdate: !!(existingSubmissionResult.data && existingSubmissionResult.data.length > 0)
    });

    return res.status(200).json({
      success: true,
      submissionIds: results.map(r => r.data?.id).filter(Boolean),
      answerCount: Object.keys(sanitizedAnswers).length,
      summary: answersSummary,
      isUpdate: !!(existingSubmissionResult.data && existingSubmissionResult.data.length > 0)
    });

  } catch (error) {
    console.error('Error storing presurvey answers:', error);
    
    // Log error
    await securityService.logSecurityEvent('PRESURVEY_SUBMISSION_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to store presurvey answers',
      error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    });
  }
}

/**
 * Sanitize answers to prevent injection attacks and ensure data consistency
 */
function sanitizeAnswers(answers: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(answers)) {
    // Sanitize key - only allow alphanumeric, underscore, hyphen
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
    
    if (sanitizedKey.length === 0) continue;
    
    // Sanitize value based on type
    if (typeof value === 'string') {
      // Remove potentially dangerous characters but keep normal punctuation
      sanitized[sanitizedKey] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .substring(0, 1000); // Limit length
    } else if (typeof value === 'number') {
      sanitized[sanitizedKey] = isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = Boolean(value);
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      sanitized[sanitizedKey] = value
        .filter(item => typeof item === 'string' || typeof item === 'number')
        .map(item => {
          if (typeof item === 'string') {
            return item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').substring(0, 500);
          }
          return item;
        })
        .slice(0, 50); // Limit array size
    } else if (value && typeof value === 'object') {
      // Handle nested objects (limited depth)
      try {
        const stringified = JSON.stringify(value).substring(0, 2000);
        sanitized[sanitizedKey] = JSON.parse(stringified);
      } catch (e) {
        sanitized[sanitizedKey] = String(value).substring(0, 500);
      }
    } else {
      // Convert other types to string
      sanitized[sanitizedKey] = String(value).substring(0, 500);
    }
  }
  
  return sanitized;
}

/**
 * Validate answers format and content
 */
function validateAnswers(answers: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if answers object is empty
  if (Object.keys(answers).length === 0) {
    errors.push('No answers provided');
  }
  
  // Check for too many answers (potential spam)
  if (Object.keys(answers).length > 100) {
    errors.push('Too many answers provided (maximum 100)');
  }
  
  // Validate each answer
  for (const [key, value] of Object.entries(answers)) {
    // Check key format
    if (key.length === 0) {
      errors.push('Empty question key found');
      continue;
    }
    
    if (key.length > 100) {
      errors.push(`Question key too long: ${key.substring(0, 50)}...`);
      continue;
    }
    
    // Check value
    if (value === null || value === undefined) {
      errors.push(`No answer provided for question: ${key}`);
      continue;
    }
    
    // Check for suspiciously long text answers
    if (typeof value === 'string' && value.length > 5000) {
      errors.push(`Answer too long for question: ${key}`);
      continue;
    }
    
    // Check for suspicious patterns
    if (typeof value === 'string') {
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /eval\(/i,
        /expression\(/i
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(value))) {
        errors.push(`Suspicious content detected in answer for: ${key}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a summary of answers for analytics
 */
function createAnswersSummary(answers: Record<string, any>): any {
  const summary = {
    totalQuestions: Object.keys(answers).length,
    questionTypes: {} as Record<string, number>,
    averageAnswerLength: 0,
    hasTextAnswers: false,
    hasNumericAnswers: false,
    hasMultipleChoice: false,
    completionIndicators: {
      allQuestionsAnswered: true,
      hasLongFormAnswers: false,
      hasDetailedResponses: false
    }
  };
  
  let totalTextLength = 0;
  let textAnswerCount = 0;
  
  for (const [key, value] of Object.entries(answers)) {
    // Classify answer type
    if (typeof value === 'string') {
      summary.hasTextAnswers = true;
      summary.questionTypes['text'] = (summary.questionTypes['text'] || 0) + 1;
      totalTextLength += value.length;
      textAnswerCount++;
      
      if (value.length > 100) {
        summary.completionIndicators.hasLongFormAnswers = true;
      }
      
      if (value.length > 50 && value.includes(' ')) {
        summary.completionIndicators.hasDetailedResponses = true;
      }
    } else if (typeof value === 'number') {
      summary.hasNumericAnswers = true;
      summary.questionTypes['numeric'] = (summary.questionTypes['numeric'] || 0) + 1;
    } else if (Array.isArray(value)) {
      summary.hasMultipleChoice = true;
      summary.questionTypes['multiple_choice'] = (summary.questionTypes['multiple_choice'] || 0) + 1;
    } else if (typeof value === 'boolean') {
      summary.questionTypes['boolean'] = (summary.questionTypes['boolean'] || 0) + 1;
    } else {
      summary.questionTypes['other'] = (summary.questionTypes['other'] || 0) + 1;
    }
    
    // Check for empty or minimal answers
    if (!value || (typeof value === 'string' && value.trim().length < 2)) {
      summary.completionIndicators.allQuestionsAnswered = false;
    }
  }
  
  if (textAnswerCount > 0) {
    summary.averageAnswerLength = Math.round(totalTextLength / textAnswerCount);
  }
  
  return summary;
}

/**
 * Get presurvey answers by project and uid
 */
export async function getPresurveyAnswers(projectId: string, uid: string) {
  try {
    const amplifyServerService = getAmplifyServerService();
    
    const result = await amplifyServerService.listPresurveyAnswers({
      and: [
        { projectId: { eq: projectId } },
        { uid: { eq: uid } }
      ]
    });
    
    if (result.data && result.data.length > 0) {
      // Reconstruct answers object from individual answer records
      const answers: Record<string, any> = {};
      const metadata: Record<string, any> = {};
      let submittedAt = result.data[0].submittedAt;
      
      for (const answerRecord of result.data) {
        answers[answerRecord.questionId] = {
          answer: answerRecord.answer,
          questionText: answerRecord.questionText,
          answerType: answerRecord.answerType
        };
        
        // Merge metadata (take from the first record)
        if (Object.keys(metadata).length === 0 && answerRecord.metadata) {
          try {
            Object.assign(metadata, JSON.parse(answerRecord.metadata));
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      return {
        success: true,
        answers,
        metadata,
        submittedAt
      };
    }
    
    return {
      success: false,
      message: 'No presurvey answers found'
    };
  } catch (error) {
    console.error('Error retrieving presurvey answers:', error);
    return {
      success: false,
      message: 'Failed to retrieve presurvey answers',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
