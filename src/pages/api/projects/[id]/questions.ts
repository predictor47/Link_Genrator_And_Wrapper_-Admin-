import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: projectId } = req.query;

  if (typeof projectId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // GET: List all questions for a project
  if (req.method === 'GET') {
    try {
      const questions = await prisma.question.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      });

      // Parse options from JSON string to array
      const parsedQuestions = questions.map(q => ({
        ...q,
        options: JSON.parse(q.options || '[]')
      }));

      return res.status(200).json({ success: true, questions: parsedQuestions });
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
      const { text, options } = req.body;

      if (!text || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Question text and at least two options are required'
        });
      }

      // Store options as JSON string
      const optionsString = JSON.stringify(options);

      const question = await prisma.question.create({
        data: {
          text,
          options: optionsString,
          projectId
        }
      });

      return res.status(201).json({ 
        success: true, 
        question: {
          ...question,
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
      const { questionId } = req.body;

      if (!questionId) {
        return res.status(400).json({
          success: false,
          message: 'Question ID is required'
        });
      }

      // Ensure the question belongs to this project
      const question = await prisma.question.findFirst({
        where: {
          id: questionId,
          projectId
        }
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found or does not belong to this project'
        });
      }

      await prisma.question.delete({
        where: { id: questionId }
      });

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