import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;
  const { uid, responses, leadData, qualified, completionTime } = req.body;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (!uid || !responses) {
    return res.status(400).json({ error: 'UID and responses are required' });
  }

  try {
    const amplifyDataService = await getAmplifyDataService();
    
    // Verify the project exists
    const project = await amplifyDataService.projects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get project settings to understand the form structure
    let formData = null;
    if (project.settings) {
      try {
        const settings = typeof project.settings === 'string' 
          ? JSON.parse(project.settings) 
          : project.settings;
        formData = settings.preSurveyQuestions || settings.presurveyQuestions || null;
      } catch (parseError) {
        console.error('Error parsing project settings:', parseError);
      }
    }

    const now = new Date().toISOString();
    
    // Create enhanced form response record
    const enhancedFormResponse = await amplifyDataService.enhancedFormResponses?.create({
      projectId,
      uid,
      formData: JSON.stringify(formData),
      responseData: JSON.stringify(responses),
      leadData: leadData ? JSON.stringify(leadData) : null,
      qualified,
      disqualificationReason: qualified ? null : 'Did not meet qualification criteria',
      completionTime: completionTime || null,
      metadata: JSON.stringify({
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
        timestamp: Date.now(),
        source: 'enhanced-form-builder'
      }),
      ipAddress: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown',
      userAgent: req.headers['user-agent'] as string || 'unknown',
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    });

    // Also store individual answers for backward compatibility and analytics
    if (responses && Array.isArray(responses)) {
      const answerPromises = responses.map((response: any) => 
        amplifyDataService.presurveyAnswers?.create({
          projectId,
          uid,
          questionId: response.questionId || 'unknown',
          questionText: response.questionText || response.question || 'Unknown question',
          answer: JSON.stringify(response.answer),
          answerType: response.type || 'unknown',
          metadata: JSON.stringify({
            ...response.metadata,
            isLead: response.isLead || false,
            isQualifying: response.isQualifying || false
          }),
          ipAddress: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown',
          submittedAt: now,
          createdAt: now,
          updatedAt: now
        })
      );
      
      await Promise.all(answerPromises);
    }

    // If there's lead data, you might want to store it separately or trigger lead processing
    if (leadData && Object.keys(leadData).length > 0) {
      console.log('Lead data captured:', leadData);
      // TODO: Integrate with lead management system
    }

    // Update survey link status based on qualification
    if (qualified) {
      try {
        await amplifyDataService.surveyLinks?.update({
          id: uid,
          status: 'QUALIFIED',
          metadata: JSON.stringify({
            qualifiedAt: now,
            preSurveyCompleted: true,
            enhancedFormResponseId: enhancedFormResponse?.data?.id
          })
        });
      } catch (linkUpdateError) {
        console.error('Error updating survey link status:', linkUpdateError);
        // Don't fail the whole request if link update fails
      }
    } else {
      try {
        await amplifyDataService.surveyLinks?.update({
          id: uid,
          status: 'DISQUALIFIED',
          metadata: JSON.stringify({
            disqualifiedAt: now,
            preSurveyCompleted: true,
            disqualificationReason: 'Did not meet qualification criteria',
            enhancedFormResponseId: enhancedFormResponse?.data?.id
          })
        });
      } catch (linkUpdateError) {
        console.error('Error updating survey link status:', linkUpdateError);
      }
    }

    res.status(200).json({
      success: true,
      qualified,
      responseId: enhancedFormResponse?.data?.id,
      message: qualified 
        ? 'Pre-survey completed successfully. You may now proceed to the main survey.'
        : 'Thank you for your responses. Unfortunately, you do not qualify for this survey.',
      data: {
        formResponseId: enhancedFormResponse?.data?.id,
        answersRecorded: responses?.length || 0,
        leadDataCaptured: leadData ? Object.keys(leadData).length : 0
      }
    });

  } catch (error) {
    console.error('Error saving pre-survey response:', error);
    res.status(500).json({ 
      error: 'Failed to save pre-survey response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
