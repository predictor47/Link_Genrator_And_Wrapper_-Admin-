import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    const amplifyDataService = await getAmplifyDataService();

    if (req.method === 'GET') {
      // Get form schema and metadata
      const project = await amplifyDataService.projects.get(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      let formSchema = null;
      let formMetadata = {};

      if (project.settings) {
        try {
          const settings = typeof project.settings === 'string' 
            ? JSON.parse(project.settings) 
            : project.settings;
          
          formSchema = settings.preSurveyQuestions || settings.presurveyQuestions || [];
          formMetadata = {
            consentItems: settings.consentItems || [],
            geoRestrictions: settings.geoRestrictions || [],
            enableVpnDetection: settings.enableVpnDetection || false,
            enableMidSurveyValidation: settings.enableMidSurveyValidation || false
          };
        } catch (parseError) {
          console.error('Error parsing project settings:', parseError);
        }
      }

      // Get response statistics
      const enhancedResponses = await amplifyDataService.enhancedFormResponses?.list({
        filter: { projectId: { eq: projectId } }
      });

      const stats = {
        totalResponses: enhancedResponses?.data?.length || 0,
        qualifiedResponses: enhancedResponses?.data?.filter((r: any) => r.qualified).length || 0,
        disqualifiedResponses: enhancedResponses?.data?.filter((r: any) => !r.qualified).length || 0,
        averageCompletionTime: calculateAverageCompletionTime(enhancedResponses?.data || [])
      };

      return res.status(200).json({
        success: true,
        formSchema,
        formMetadata,
        stats,
        projectName: project.name
      });

    } else if (req.method === 'PUT') {
      // Update form schema
      const { formData, formMetadata } = req.body;

      if (!formData) {
        return res.status(400).json({ error: 'Form data is required' });
      }

      // Get current project
      const project = await amplifyDataService.projects.get(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Parse current settings
      let currentSettings = {};
      if (project.settings) {
        try {
          currentSettings = typeof project.settings === 'string' 
            ? JSON.parse(project.settings) 
            : project.settings;
        } catch (parseError) {
          console.error('Error parsing current project settings:', parseError);
        }
      }

      // Update settings with new form data
      const updatedSettings = {
        ...currentSettings,
        preSurveyQuestions: formData.questions || [],
        ...formMetadata,
        lastFormUpdate: new Date().toISOString()
      };

      // Update project
      await amplifyDataService.projects.update({
        id: projectId,
        settings: JSON.stringify(updatedSettings),
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Form schema updated successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in form schema API:', error);
    res.status(500).json({ 
      error: 'Failed to process form schema request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function calculateAverageCompletionTime(responses: any[]): number {
  const validTimes = responses
    .map(r => r.completionTime)
    .filter(t => t && t > 0);
  
  if (validTimes.length === 0) return 0;
  
  return Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length);
}
