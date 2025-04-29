import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Get all vendors for this project
    const vendors = await prisma.vendor.findMany({
      where: { projectId },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({ 
      success: true, 
      vendors 
    });
  } catch (error) {
    console.error('Error listing vendors:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to list vendors' 
    });
  }
}