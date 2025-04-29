import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface VendorRequest {
  projectId: string;
  name: string;
  code: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, name, code }: VendorRequest = req.body;

    if (!projectId || !name || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, name, and code are required' 
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

    // Check if vendor code is already used in this project
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        projectId,
        code
      }
    });

    if (existingVendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor code already exists in this project' 
      });
    }

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        name,
        code,
        projectId
      }
    });

    return res.status(201).json({ 
      success: true, 
      vendor 
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create vendor' 
    });
  }
}