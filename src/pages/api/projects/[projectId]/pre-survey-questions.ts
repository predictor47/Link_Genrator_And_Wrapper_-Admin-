import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    const amplifyDataService = await getAmplifyDataService();
    
    // Get project to check if it exists and get settings
    const project = await amplifyDataService.projects.get(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Parse project settings to get pre-survey questions
    let preSurveyQuestions = [];
    
    if (project.settings) {
      try {
        const settings = typeof project.settings === 'string' 
          ? JSON.parse(project.settings) 
          : project.settings;
        
        // Look for pre-survey questions in settings
        if (settings.preSurveyQuestions) {
          preSurveyQuestions = settings.preSurveyQuestions;
        } else if (settings.presurveyQuestions) {
          // Legacy format support
          preSurveyQuestions = settings.presurveyQuestions.map((q: any) => ({
            id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: q.text,
            description: q.description || '',
            type: mapLegacyQuestionType(q.type),
            required: q.isRequired ?? true,
            isLead: q.isLead || false,
            isQualifying: q.isQualifier || false,
            options: q.options?.map((opt: any, index: number) => ({
              id: `opt_${index}`,
              text: typeof opt === 'string' ? opt : opt.text,
              value: typeof opt === 'string' ? opt.toLowerCase().replace(/\s+/g, '_') : opt.value,
              isDisqualifying: opt.isDisqualifying || false
            })) || [],
            disqualifyingAnswers: q.disqualifyingAnswers || []
          }));
        }
      } catch (parseError) {
        console.error('Error parsing project settings:', parseError);
      }
    }

    // Also get questions from the questions table (legacy support)
    const legacyQuestions = await amplifyDataService.questions.list({
      filter: { projectId: { eq: projectId } }
    });

    if (legacyQuestions?.data && legacyQuestions.data.length > 0) {
      const convertedQuestions = legacyQuestions.data.map((q: any) => ({
        id: q.id,
        text: q.text,
        description: '',
        type: mapLegacyQuestionType(q.type),
        required: q.isRequired ?? true,
        isLead: false,
        isQualifying: false,
        options: q.options ? JSON.parse(q.options).map((opt: string, index: number) => ({
          id: `opt_${index}`,
          text: opt,
          value: opt.toLowerCase().replace(/\s+/g, '_'),
          isDisqualifying: false
        })) : [],
        disqualifyingAnswers: []
      }));

      // If no pre-survey questions in settings, use legacy questions
      if (preSurveyQuestions.length === 0) {
        preSurveyQuestions = convertedQuestions;
      }
    }

    res.status(200).json({
      success: true,
      questions: preSurveyQuestions,
      projectName: project.name
    });

  } catch (error) {
    console.error('Error fetching pre-survey questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pre-survey questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to map legacy question types to new format
function mapLegacyQuestionType(legacyType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'short-text',
    'textarea': 'paragraph',
    'email': 'email',
    'number': 'number',
    'single_choice': 'multiple-choice',
    'multiple_choice': 'checkbox',
    'dropdown': 'dropdown',
    'scale': 'scale',
    'MULTIPLE_CHOICE': 'multiple-choice',
    'TEXT': 'short-text',
    'EMAIL': 'email',
    'NUMBER': 'number'
  };

  return typeMap[legacyType] || 'short-text';
}
