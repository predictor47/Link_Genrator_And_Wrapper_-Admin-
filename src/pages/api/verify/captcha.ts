import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { verifyCaptcha } from '@/lib/captcha';
import { collectMetadata, detectAnomalies, enhanceMetadataWithVPNDetection } from '@/lib/metadata';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token, projectId, uid, clientMetadata, answers } = req.body;

    if (!token || !projectId || !uid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Verify CAPTCHA token
    const isValidCaptcha = await verifyCaptcha(token);
    if (!isValidCaptcha) {
      return res.status(400).json({ 
        success: false, 
        message: 'CAPTCHA validation failed' 
      });
    }

    // Get the survey link
    const surveyLink = await prisma.surveyLink.findFirst({
      where: {
        projectId,
        uid,
        status: 'PENDING'
      },
      include: {
        project: true
      }
    });

    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found or already used' 
      });
    }

    // Collect server-side metadata
    const serverMetadata = collectMetadata(req);
    
    // Enhance metadata with VPN detection
    const enhancedMetadata = await enhanceMetadataWithVPNDetection(serverMetadata);
    
    // Merge with client metadata
    const mergedMetadata = {
      ...enhancedMetadata,
      timezone: clientMetadata?.timezone || null,
      fingerprint: clientMetadata?.fingerprint || null,
    };
    
    // Check for anomalies in metadata
    const { isBot, reasons } = detectAnomalies(mergedMetadata);
    
    // If bot is detected, flag the link
    if (isBot) {
      await prisma.flag.create({
        data: {
          surveyLinkId: surveyLink.id,
          projectId: surveyLink.projectId,
          reason: `Bot detection: ${reasons.join(', ')}`,
          metadata: mergedMetadata,
        }
      });
      
      await prisma.surveyLink.update({
        where: { id: surveyLink.id },
        data: { status: 'FLAGGED' }
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Suspicious activity detected' 
      });
    }
    
    // Store the user's answers to pre-survey questions
    if (answers && answers.length > 0) {
      for (const answer of answers) {
        await prisma.response.create({
          data: {
            surveyLinkId: surveyLink.id,
            projectId: surveyLink.projectId,
            questionId: answer.questionId,
            answer: answer.value,
            metadata: mergedMetadata
          }
        });
      }
    }

    // Create a session token for mid-survey validation
    const sessionToken = uuidv4();
    
    // Return success response with original URL and session token
    return res.status(200).json({
      success: true,
      originalUrl: surveyLink.originalUrl,
      sessionToken,
    });
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}