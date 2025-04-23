import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

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
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        surveyLinks: true,
        presurveyQuestions: true,
        responses: true,
        flags: true
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Delete related records first (to avoid foreign key constraint issues)
    // Delete all flags associated with the project
    await prisma.flag.deleteMany({
      where: { projectId: id }
    });

    // Delete all responses associated with the project
    await prisma.response.deleteMany({
      where: { projectId: id }
    });

    // Delete all questions associated with the project
    await prisma.question.deleteMany({
      where: { projectId: id }
    });

    // Delete all survey links associated with the project
    await prisma.surveyLink.deleteMany({
      where: { projectId: id }
    });

    // Finally, delete the project itself
    await prisma.project.delete({
      where: { id }
    });

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