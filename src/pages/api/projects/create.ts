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

    console.log('Creating project with name:', name);
      // Create a new project using Amplify Data service
    const projectResult = await amplifyDataService.projects.create({
      name,
      description: description || '',
    });

    // Check if projectResult is null before accessing its properties
    if (!projectResult || projectResult.data === null) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create project. Project creation returned null.'
      });
    }

    // Add questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const projectId = projectResult.data.id;
      const questionPromises = questions.map((q: { text: string, options: string[] }) => 
        amplifyDataService.questions.create({
          projectId,
          text: q.text,
          options: JSON.stringify(q.options || [])
        })
      );
      
      await Promise.all(questionPromises);
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: projectResult.data
    });  } catch (error: any) {
    console.error('Error creating project:', error);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown error';
    const errorName = error.name || 'Error';
    
    console.error(`Project creation failed: ${errorName} - ${errorMessage}`);
    
    // Special handling for authentication errors
    if (errorName.includes('Auth') || errorMessage.includes('auth') || errorMessage.includes('token')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication error. Please sign in again.',
        error: `${errorName}: ${errorMessage}`
      });
    }
    
    // Handle sandbox-specific errors
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        message: 'Development environment error: ' + errorMessage,
        error: error,
        hint: 'In sandbox environment, make sure to login first and have the Amplify sandbox running with "npx ampx sandbox"'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create project. Please ensure you are authenticated and have correct permissions.',
      error: `${errorName}: ${errorMessage}`
    });
  }
}