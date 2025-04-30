import { NextApiRequest, NextApiResponse } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';

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

    // Create a new project using Amplify Data service
    const projectResult = await amplifyDataService.projects.create({
      name,
      description: description || '',
    });

    // Check if projectResult is null before accessing its properties
    if (!projectResult) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create project. Project creation returned null.'
      });
    }

    // Add questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionPromises = questions.map((q: { text: string, options: string[] }) => 
        amplifyDataService.questions.create({
          projectId: projectResult.id,
          text: q.text,
          options: JSON.stringify(q.options || [])
        })
      );
      
      await Promise.all(questionPromises);
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: projectResult
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create project. Please ensure you are authenticated and have correct permissions.' 
    });
  }
}