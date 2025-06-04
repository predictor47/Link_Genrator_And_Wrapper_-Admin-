import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

interface ComprehensiveAnalytics {
  project: {
    id: string;
    name: string;
    status: string;
  };
  summary: {
    totalLinks: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byVendor: Record<string, { name: string; count: number; }>;
    byCountry: Record<string, number>;
  };
  flagAnalysis: {
    totalFlagged: number;
    byReason: Record<string, number>;
    byVendor: Record<string, Record<string, number>>;
    byCountry: Record<string, Record<string, number>>;
  };
  deviceAnalysis: {
    browsers: Record<string, number>;
    devices: Record<string, number>;
    operatingSystems: Record<string, number>;
    screenResolutions: Record<string, number>;
  };
  securityAnalysis: {
    vpnDetected: number;
    proxyDetected: number;
    torDetected: number;
    fingerprintMatches: number;
    suspiciousIPs: number;
    geoMismatches: number;
  };
  behaviorAnalysis: {
    averageTimeToComplete: number;
    averageMouseMovements: number;
    averageKeyboardEvents: number;
    averageIdleTime: number;
    suspiciousBehavior: number;
  };
  rawData: {
    links: any[];
    responses: any[];
    flags: any[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id: projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  try {
    const amplifyServerService = getAmplifyServerService();

    // Fetch project
    const projectResult = await amplifyServerService.getProject(projectId);
    const project = projectResult.data;

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Fetch all related data
    const [linksResult, flagsResult, vendorsResult] = await Promise.all([
      amplifyServerService.listSurveyLinksByProject(projectId),
      amplifyServerService.listFlagsByProject(projectId),
      amplifyServerService.listVendorsByProject(projectId)
    ]);

    const links = linksResult.data || [];
    const flags = flagsResult.data || [];
    const vendors = vendorsResult.data || [];

    // Create vendor lookup map
    const vendorMap = vendors.reduce((acc: Record<string, any>, vendor: any) => {
      acc[vendor.id] = vendor;
      return acc;
    }, {});

    // Initialize analytics object
    const analytics: ComprehensiveAnalytics = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      },
      summary: {
        totalLinks: links.length,
        byStatus: {},
        byType: {},
        byVendor: {},
        byCountry: {}
      },
      flagAnalysis: {
        totalFlagged: 0,
        byReason: {},
        byVendor: {},
        byCountry: {}
      },
      deviceAnalysis: {
        browsers: {},
        devices: {},
        operatingSystems: {},
        screenResolutions: {}
      },
      securityAnalysis: {
        vpnDetected: 0,
        proxyDetected: 0,
        torDetected: 0,
        fingerprintMatches: 0,
        suspiciousIPs: 0,
        geoMismatches: 0
      },
      behaviorAnalysis: {
        averageTimeToComplete: 0,
        averageMouseMovements: 0,
        averageKeyboardEvents: 0,
        averageIdleTime: 0,
        suspiciousBehavior: 0
      },
      rawData: {
        links: [],
        responses: [],
        flags: []
      }
    };

    // Process links
    let totalTimeToComplete = 0;
    let completedCount = 0;
    let totalMouseMovements = 0;
    let totalKeyboardEvents = 0;
    let totalIdleTime = 0;
    let behaviorDataCount = 0;

    links.forEach((link: any) => {
      // Basic status analysis
      analytics.summary.byStatus[link.status] = (analytics.summary.byStatus[link.status] || 0) + 1;

      // Parse metadata
      let metadata = {};
      try {
        metadata = link.metadata ? JSON.parse(link.metadata) : {};
      } catch (e) {
        metadata = {};
      }

      // Link type analysis
      const linkType = (metadata as any).linkType || 'UNKNOWN';
      analytics.summary.byType[linkType] = (analytics.summary.byType[linkType] || 0) + 1;

      // Vendor analysis
      if (link.vendorId && vendorMap[link.vendorId]) {
        const vendorName = vendorMap[link.vendorId].name;
        if (!analytics.summary.byVendor[vendorName]) {
          analytics.summary.byVendor[vendorName] = { name: vendorName, count: 0 };
        }
        analytics.summary.byVendor[vendorName].count++;
      }

      // Geographic analysis
      if (link.geoData) {
        try {
          const geoData = typeof link.geoData === 'string' ? JSON.parse(link.geoData) : link.geoData;
          const country = geoData.country || 'Unknown';
          analytics.summary.byCountry[country] = (analytics.summary.byCountry[country] || 0) + 1;
        } catch (e) {
          analytics.summary.byCountry['Unknown'] = (analytics.summary.byCountry['Unknown'] || 0) + 1;
        }
      }

      // Device and browser analysis
      if (link.userAgent) {
        // Simple user agent parsing (in production, use a proper library)
        const ua = link.userAgent.toLowerCase();
        
        // Browser detection
        let browser = 'Unknown';
        if (ua.includes('chrome')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari')) browser = 'Safari';
        else if (ua.includes('edge')) browser = 'Edge';
        analytics.deviceAnalysis.browsers[browser] = (analytics.deviceAnalysis.browsers[browser] || 0) + 1;

        // Device detection
        let device = 'Desktop';
        if (ua.includes('mobile')) device = 'Mobile';
        else if (ua.includes('tablet')) device = 'Tablet';
        analytics.deviceAnalysis.devices[device] = (analytics.deviceAnalysis.devices[device] || 0) + 1;

        // OS detection
        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'MacOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios')) os = 'iOS';
        analytics.deviceAnalysis.operatingSystems[os] = (analytics.deviceAnalysis.operatingSystems[os] || 0) + 1;
      }

      // Security analysis
      if (metadata && typeof metadata === 'object') {
        const metaObj = metadata as any;
        if (metaObj.vpnDetected) analytics.securityAnalysis.vpnDetected++;
        if (metaObj.proxyDetected) analytics.securityAnalysis.proxyDetected++;
        if (metaObj.torDetected) analytics.securityAnalysis.torDetected++;
        if (metaObj.fingerprintMatch) analytics.securityAnalysis.fingerprintMatches++;
        if (metaObj.suspiciousIP) analytics.securityAnalysis.suspiciousIPs++;
        if (metaObj.geoMismatch) analytics.securityAnalysis.geoMismatches++;

        // Behavior analysis
        if (metaObj.behaviorData) {
          const behavior = metaObj.behaviorData;
          if (behavior.mouseMovements) {
            totalMouseMovements += behavior.mouseMovements;
            behaviorDataCount++;
          }
          if (behavior.keyboardEvents) {
            totalKeyboardEvents += behavior.keyboardEvents;
          }
          if (behavior.idleTime) {
            totalIdleTime += behavior.idleTime;
          }
          if (behavior.suspiciousBehavior) {
            analytics.behaviorAnalysis.suspiciousBehavior++;
          }
        }
      }

      // Time to complete analysis
      if (link.status === 'COMPLETED' && link.clickedAt && link.completedAt) {
        const timeToComplete = new Date(link.completedAt).getTime() - new Date(link.clickedAt).getTime();
        totalTimeToComplete += timeToComplete;
        completedCount++;
      }

      // Prepare raw data
      analytics.rawData.links.push({
        id: link.id,
        uid: link.uid,
        status: link.status,
        linkType,
        vendorId: link.vendorId,
        vendorName: link.vendorId && vendorMap[link.vendorId] ? vendorMap[link.vendorId].name : null,
        ipAddress: link.ipAddress,
        userAgent: link.userAgent,
        geoData: link.geoData,
        metadata: link.metadata,
        createdAt: link.createdAt,
        clickedAt: link.clickedAt,
        completedAt: link.completedAt
      });
    });

    // Process flags
    flags.forEach((flag: any) => {
      analytics.flagAnalysis.totalFlagged++;
      
      // Flag reasons
      const reason = flag.reason || 'Unknown';
      analytics.flagAnalysis.byReason[reason] = (analytics.flagAnalysis.byReason[reason] || 0) + 1;

      // Flags by vendor
      const vendorId = flag.vendorId || 'No Vendor';
      const vendorName = vendorId !== 'No Vendor' && vendorMap[vendorId] ? vendorMap[vendorId].name : vendorId;
      
      if (!analytics.flagAnalysis.byVendor[vendorName]) {
        analytics.flagAnalysis.byVendor[vendorName] = {};
      }
      analytics.flagAnalysis.byVendor[vendorName][reason] = (analytics.flagAnalysis.byVendor[vendorName][reason] || 0) + 1;

      // Flags by country
      let country = 'Unknown';
      if (flag.geoData) {
        try {
          const geoData = typeof flag.geoData === 'string' ? JSON.parse(flag.geoData) : flag.geoData;
          country = geoData.country || 'Unknown';
        } catch (e) {
          country = 'Unknown';
        }
      }
      
      if (!analytics.flagAnalysis.byCountry[country]) {
        analytics.flagAnalysis.byCountry[country] = {};
      }
      analytics.flagAnalysis.byCountry[country][reason] = (analytics.flagAnalysis.byCountry[country][reason] || 0) + 1;

      // Add to raw data
      analytics.rawData.flags.push({
        id: flag.id,
        reason: flag.reason,
        vendorId: flag.vendorId,
        vendorName: flag.vendorId && vendorMap[flag.vendorId] ? vendorMap[flag.vendorId].name : null,
        country,
        geoData: flag.geoData,
        metadata: flag.metadata,
        createdAt: flag.createdAt
      });
    });

    // Calculate averages
    if (completedCount > 0) {
      analytics.behaviorAnalysis.averageTimeToComplete = totalTimeToComplete / completedCount;
    }
    if (behaviorDataCount > 0) {
      analytics.behaviorAnalysis.averageMouseMovements = totalMouseMovements / behaviorDataCount;
      analytics.behaviorAnalysis.averageKeyboardEvents = totalKeyboardEvents / behaviorDataCount;
      analytics.behaviorAnalysis.averageIdleTime = totalIdleTime / behaviorDataCount;
    }

    return res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error generating comprehensive analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate analytics'
    });
  }
}
