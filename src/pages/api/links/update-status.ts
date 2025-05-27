import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

// Define proper types that match our server service
interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface UpdateStatusRequest {
  projectId: string;
  uid: string;
  status: string;
  vendorId?: string;
  token?: string;
  questionId?: string;
  answer?: string;
  metadata?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS for cross-domain requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  try {
    const amplifyServerService = getAmplifyServerService();
    const { projectId, uid, status, vendorId, metadata, token, questionId, answer } = req.body as UpdateStatusRequest;

    if (!projectId || !uid || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Validate status values
    const validStatuses = [
      'PENDING', 
      'STARTED', 
      'IN_PROGRESS', 
      'COMPLETED', 
      'QUOTA_FULL', 
      'DISQUALIFIED', 
      'FLAGGED'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values are: ${validStatuses.join(', ')}`
      });
    }

    // Get the survey link using Amplify
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid);
    const surveyLink = surveyLinkResult.data;
    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        message: 'Survey link not found' 
      });
    }

    // Verify this survey link belongs to the specified project
    if (surveyLink.projectId !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Survey link does not belong to the specified project'
      });
    }

    // Prepare update data
    const updateData: any = { 
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Update vendor information if provided and different from current
    if (vendorId && vendorId !== surveyLink.vendorId) {
      // Verify vendor belongs to this project by checking ProjectVendor relationship
      const projectVendors = await amplifyServerService.listProjectVendors(projectId);
      const validVendor = projectVendors.data.find(pv => pv.vendorId === vendorId);
      
      if (validVendor) {
        updateData.vendorId = vendorId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Vendor not found or does not belong to this project'
        });
      }
    }
    
    // Update survey link status using Amplify
    if (!surveyLink.id) {
      throw new Error('Survey link ID is null or undefined');
    }
    await amplifyServerService.updateSurveyLink(surveyLink.id, updateData);    // Get vendor info if available
    let vendorCode = null;
    if (surveyLink.vendorId || updateData.vendorId) {
      const vendorId = updateData.vendorId || surveyLink.vendorId;
      if (vendorId) {
        const vendorResult = await amplifyServerService.getVendor(vendorId);
        const vendor = vendorResult.data;
        if (vendor?.settings) {
          try {
            const settings = JSON.parse(vendor.settings as string);
            vendorCode = settings.code || null;
          } catch (e) {
            console.error('Error parsing vendor settings:', e);
          }
        }
      }
    }

    // Store metadata if provided
    if (metadata) {
      // Store response data in the link's metadata field instead of creating a separate response record
      const currentMetadata = surveyLink.metadata ? 
        JSON.parse(surveyLink.metadata as string) : {};
      
      const updatedMetadata = {
        ...currentMetadata,
        responses: [
          ...(currentMetadata.responses || []),
          {
            timestamp: new Date().toISOString(),
            status,
            questionId: questionId || '00000000-0000-0000-0000-000000000000',
            answer: answer || null,            metadata: {
              statusUpdateTimestamp: new Date().toISOString(),
              previousStatus: surveyLink.status,
              ...(metadata || {})
            }
          }
        ]
      };
      
      // Update the link with the new metadata
      await amplifyServerService.updateSurveyLink(surveyLink.id, {
        metadata: JSON.stringify(updatedMetadata)
      });
    }

    return res.status(200).json({
      success: true,
      message: `Survey link status updated to ${status}`,
      updatedLink: {
        uid: surveyLink.uid,
        status,
        vendor: vendorCode
      }
    });
  } catch (error) {
    console.error('Error updating survey link status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}