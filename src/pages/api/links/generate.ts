import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, originalUrl, count = 1 } = req.body;

    if (!projectId || !originalUrl) {
      return res.status(400).json({ message: 'Missing required fields: projectId, originalUrl' });
    }

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Generate survey links
    const links = [];
    for (let i = 0; i < count; i++) {
      const uid = uuidv4().replace(/-/g, '').slice(0, 12);
      
      const link = await prisma.surveyLink.create({
        data: {
          uid,
          projectId,
          originalUrl,
          status: 'PENDING',
        },
      });

      links.push({
        id: link.id,
        uid: link.uid,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/s/${projectId}/${link.uid}`,
      });
    }

    return res.status(200).json({ 
      success: true, 
      links 
    });
  } catch (error) {
    console.error('Error generating survey links:', error);
    return res.status(500).json({ message: 'Failed to generate survey links' });
  }
}