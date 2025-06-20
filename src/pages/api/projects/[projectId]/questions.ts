import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import type { Schema } from '../../../../../amplify/data/resource';

type Question = Schema['Question']['type'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // GET: List all questions for a project
  if (req.method === 'GET') {
    try {
      const amplifyServerService = getAmplifyServerService();
      const questionsResult = await amplifyServerService.listQuestionsByProject(projectId);
      const questions = questionsResult.data;      // Parse options from JSON string to array
      const parsedQuestions = questions.map((q: Question) => {
        let parsedOptions: string[] = [];
        try {
          parsedOptions = JSON.parse(q.options?.toString() || '[]');
        } catch (e) {
          console.error(`Error parsing options for question ${q.id}:`, e);
        }
        return {
          ...q,
          options: parsedOptions
        };
      });

      // Sort by creation date descending
      const sortedQuestions = parsedQuestions.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return res.status(200).json({ success: true, questions: sortedQuestions });
    } catch (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch questions' 
      });
    }
  }

  // POST: Create a new question
  if (req.method === 'POST') {
    try {
      const amplifyServerService = getAmplifyServerService();
      const { text, options } = req.body;

      if (!text || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Question text and at least two options are required'
        });
      }

      // Store options as JSON string
      const optionsString = JSON.stringify(options);

      const questionResult = await amplifyServerService.createQuestion({
        text,
        options: optionsString,
        projectId,
        type: 'multiple_choice',
        sequence: 1
      });

      return res.status(201).json({ 
        success: true, 
        question: {
          ...questionResult.data,
          options
        }
      });
    } catch (error) {
      console.error('Error creating question:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create question' 
      });
    }
  }

  // DELETE: Remove a question
  if (req.method === 'DELETE') {
    try {
      const amplifyServerService = getAmplifyServerService();
      const { questionId } = req.body;

      if (!questionId) {
        return res.status(400).json({
          success: false,
          message: 'Question ID is required'
        });
      }

      await amplifyServerService.deleteQuestion(questionId);

      return res.status(200).json({ 
        success: true, 
        message: 'Question deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete question' 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}