import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    // Check if project exists
    const projectResult = await amplifyDataService.projects.get(id);
    if (!projectResult || !projectResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // With Amplify, we need to delete related records first to avoid foreign key constraint issues
    
    // Get all flags associated with the project and delete them
    const flagsResult = await amplifyDataService.flags.list({
      filter: { projectId: { eq: id } }
    });
    
    if (flagsResult.data && flagsResult.data.length > 0) {
      const flagDeletions = flagsResult.data.map(flag => {
        if (flag && flag.id) {
          return amplifyDataService.flags.delete(flag.id);
        }
        return Promise.resolve();
      }).filter(Boolean);
      
      await Promise.all(flagDeletions);
    }

    // Get all responses associated with the project and delete them
    const responsesResult = await amplifyDataService.responses.list({
      filter: { projectId: { eq: id } }
    });
    
    if (responsesResult.data && responsesResult.data.length > 0) {
      const responseDeletions = responsesResult.data.map(response => {
        if (response && response.id) {
          return amplifyDataService.responses.delete(response.id);
        }
        return Promise.resolve();
      }).filter(Boolean);
      
      await Promise.all(responseDeletions);
    }

    // Get all questions associated with the project and delete them
    const questionsResult = await amplifyDataService.questions.list({
      filter: { projectId: { eq: id } }
    });
    
    if (questionsResult.data && questionsResult.data.length > 0) {
      const questionDeletions = questionsResult.data.map(question => {
        if (question && question.id) {
          return amplifyDataService.questions.delete(question.id);
        }
        return Promise.resolve();
      }).filter(Boolean);
      
      await Promise.all(questionDeletions);
    }

    // Get all survey links associated with the project and delete them
    const surveyLinksResult = await amplifyDataService.surveyLinks.list({
      filter: { projectId: { eq: id } }
    });
    
    if (surveyLinksResult.data && surveyLinksResult.data.length > 0) {
      const linkDeletions = surveyLinksResult.data.map(link => {
        if (link && link.id) {
          return amplifyDataService.surveyLinks.delete(link.id);
        }
        return Promise.resolve();
      }).filter(Boolean);
      
      await Promise.all(linkDeletions);
    }
    
    // Finally, delete the project itself
    await amplifyDataService.projects.delete(id);

    return res.status(200).json({
      success: true,
      message: 'Project and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete project' 
    });
  }
}