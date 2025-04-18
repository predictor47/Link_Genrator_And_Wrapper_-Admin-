import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, description, questions } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project name is required' 
      });
    }

    // Create a new project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
      }
    });

    // Add questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionPromises = questions.map((q: { text: string, options: string[] }) => 
        prisma.question.create({
          data: {
            projectId: project.id,
            text: q.text,
            options: q.options || []
          }
        })
      );
      
      await Promise.all(questionPromises);
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create project' 
    });
  }
}