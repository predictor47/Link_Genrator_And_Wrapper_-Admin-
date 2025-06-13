import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

interface QCFlag {
  id: string;
  projectId: string;
  uid: string;
  qcScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  details?: any;
  recommendations?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { projectId, filter = 'ALL' } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Get survey links for the project
    const surveyLinksResult = await amplifyServerService.listSurveyLinks({
      filter: { projectId: { eq: projectId } }
    });

    if (!surveyLinksResult.data) {
      return res.status(200).json({
        success: true,
        flags: [],
        summary: {
          total: 0,
          pending: 0,
          highRisk: 0,
          resolved: 0
        }
      });
    }

    const flags: QCFlag[] = [];

    // Extract QC data from survey link metadata
    for (const link of surveyLinksResult.data) {
      if (!link.metadata) continue;

      try {
        const metadata = JSON.parse(link.metadata as string);
        
        if (metadata.qcAnalysis) {
          const qcData = metadata.qcAnalysis;
          
          // Determine status based on QC results and any manual reviews
          let status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' = 'PENDING';
          
          // Check if there's a manual review status
          if (metadata.manualReview) {
            status = metadata.manualReview.status;
          } else {
            // Auto-determine based on QC score and flags
            if (qcData.shouldExclude) {
              status = 'PENDING'; // Needs manual review for exclusion
            } else if (qcData.score < 20) {
              status = 'APPROVED'; // Low risk, auto-approve
            }
          }

          const flag: QCFlag = {
            id: link.id,
            projectId: link.projectId,
            uid: link.uid,
            qcScore: qcData.score || 0,
            riskLevel: qcData.riskLevel || 'LOW',
            flags: qcData.flags || [],
            timestamp: qcData.timestamp || link.createdAt,
            status,
            details: qcData.details,
            recommendations: qcData.recommendations
          };

          // Apply filters
          const shouldInclude = (() => {
            switch (filter) {
              case 'PENDING':
                return status === 'PENDING';
              case 'HIGH_RISK':
                return ['HIGH', 'CRITICAL'].includes(flag.riskLevel);
              case 'ALL':
              default:
                return true;
            }
          })();

          if (shouldInclude) {
            flags.push(flag);
          }
        }
      } catch (error) {
        console.error('Error parsing metadata for link:', link.id, error);
      }
    }

    // Sort by timestamp (newest first) and QC score (highest first)
    flags.sort((a, b) => {
      const timestampDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (timestampDiff !== 0) return timestampDiff;
      return b.qcScore - a.qcScore;
    });

    // Calculate summary statistics
    const summary = {
      total: flags.length,
      pending: flags.filter(f => f.status === 'PENDING').length,
      highRisk: flags.filter(f => ['HIGH', 'CRITICAL'].includes(f.riskLevel)).length,
      resolved: flags.filter(f => ['APPROVED', 'REJECTED'].includes(f.status)).length
    };

    return res.status(200).json({
      success: true,
      flags,
      summary
    });

  } catch (error) {
    console.error('Error fetching QC flags:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch QC flags',
      error: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}
