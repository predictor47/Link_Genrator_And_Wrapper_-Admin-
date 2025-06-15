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

    // Fetch all related data including presurvey answers and raw data
    const [linksResult, flagsResult, vendorsResult, presurveyResult, rawDataResult] = await Promise.all([
      amplifyServerService.listSurveyLinksByProject(projectId),
      amplifyServerService.listFlagsByProject(projectId),
      amplifyServerService.listVendorsByProject(projectId),
      amplifyServerService.listPresurveyAnswersByProject(projectId).catch(() => ({ data: [] })), // Handle if this fails
      amplifyServerService.listRawDataRecordsByProject(projectId).catch(() => ({ data: [] })) // Handle if this fails
    ]);

    const links = linksResult.data || [];
    const flags = flagsResult.data || [];
    const vendors = vendorsResult.data || [];
    const presurveyAnswers = presurveyResult.data || [];
    const rawDataRecords = rawDataResult.data || [];

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

    // Process links with enhanced metadata parsing
    let totalTimeToComplete = 0;
    let completedCount = 0;
    let totalMouseMovements = 0;
    let totalKeyboardEvents = 0;
    let totalIdleTime = 0;
    let behaviorDataCount = 0;

    // Create enhanced metadata lookup from presurvey answers and raw data
    const enhancedMetadataMap = new Map();
    
    // Parse presurvey answers for enhanced metadata
    presurveyAnswers.forEach((answer: any) => {
      const key = `${answer.projectId}_${answer.uid}`;
      if (!enhancedMetadataMap.has(key)) {
        enhancedMetadataMap.set(key, {
          presurveyData: {},
          rawData: {},
          qcFlags: [],
          deviceInfo: {},
          securityInfo: {}
        });
      }
      
      const enhanced = enhancedMetadataMap.get(key);
      
      // Parse metadata from presurvey answers
      try {
        if (answer.metadata) {
          const metadata = JSON.parse(answer.metadata);
          
          // Extract IP and geo information
          if (metadata.ipAddress) {
            enhanced.ipAddress = metadata.ipAddress;
          }
          
          // Extract QC flags
          if (metadata.qcFlags) {
            enhanced.qcFlags.push(...metadata.qcFlags);
          }
          
          // Extract device information
          if (metadata.deviceInfo) {
            enhanced.deviceInfo = { ...enhanced.deviceInfo, ...metadata.deviceInfo };
          }
          
          // Extract security information
          if (metadata.domainCheck || metadata.honeypotResult || metadata.aiDetection) {
            enhanced.securityInfo = {
              domainCheck: metadata.domainCheck,
              honeypotResult: metadata.honeypotResult,
              aiDetection: metadata.aiDetection,
              suspicionScore: metadata.suspicionScore || 0
            };
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      enhanced.presurveyData[answer.questionId] = answer.answer;
    });

    // Parse raw data submissions for behavioral and enhanced fingerprinting data
    rawDataRecords.forEach((submission: any) => {
      const key = `${submission.projectId}_${submission.uid}`;
      if (!enhancedMetadataMap.has(key)) {
        enhancedMetadataMap.set(key, {
          presurveyData: {},
          rawData: {},
          qcFlags: [],
          deviceInfo: {},
          securityInfo: {}
        });
      }
      
      const enhanced = enhancedMetadataMap.get(key);
      
      try {
        if (submission.metadata) {
          const metadata = JSON.parse(submission.metadata);
          
          // Extract enhanced fingerprinting data
          if (submission.enhancedFingerprint) {
            const fingerprint = typeof submission.enhancedFingerprint === 'string' 
              ? JSON.parse(submission.enhancedFingerprint) 
              : submission.enhancedFingerprint;
              
            enhanced.deviceInfo = {
              ...enhanced.deviceInfo,
              ...fingerprint,
              browser: fingerprint.browser || 'Unknown',
              os: fingerprint.os || 'Unknown',
              device: fingerprint.device || 'Unknown',
              screenResolution: fingerprint.screenResolution || 'Unknown'
            };
          }
          
          // Extract behavioral data
          if (submission.behavioralData) {
            const behavioral = typeof submission.behavioralData === 'string' 
              ? JSON.parse(submission.behavioralData) 
              : submission.behavioralData;
              
            enhanced.rawData.behavioral = behavioral;
          }
          
          // Extract security context
          if (submission.securityContext) {
            const security = typeof submission.securityContext === 'string' 
              ? JSON.parse(submission.securityContext) 
              : submission.securityContext;
              
            enhanced.securityInfo = {
              ...enhanced.securityInfo,
              ...security
            };
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    links.forEach((link: any) => {
      const key = `${link.projectId}_${link.uid}`;
      const enhancedData = enhancedMetadataMap.get(key) || {};
      
      // Basic status analysis
      analytics.summary.byStatus[link.status] = (analytics.summary.byStatus[link.status] || 0) + 1;

      // Parse metadata from link
      let linkMetadata = {};
      try {
        linkMetadata = link.metadata ? JSON.parse(link.metadata) : {};
      } catch (e) {
        linkMetadata = {};
      }

      // Link type analysis - prefer enhanced data
      const linkType = (linkMetadata as any).linkType || 'UNKNOWN';
      analytics.summary.byType[linkType] = (analytics.summary.byType[linkType] || 0) + 1;

      // Vendor analysis
      if (link.vendorId && vendorMap[link.vendorId]) {
        const vendorName = vendorMap[link.vendorId].name;
        if (!analytics.summary.byVendor[vendorName]) {
          analytics.summary.byVendor[vendorName] = { name: vendorName, count: 0 };
        }
        analytics.summary.byVendor[vendorName].count++;
      }

      // Enhanced geographic analysis
      let country = 'Unknown';
      if (link.geoData) {
        try {
          const geoData = typeof link.geoData === 'string' ? JSON.parse(link.geoData) : link.geoData;
          country = geoData.country || 'Unknown';
        } catch (e) {
          // Try enhanced data
          if (enhancedData.securityInfo && enhancedData.securityInfo.geoLocation) {
            country = enhancedData.securityInfo.geoLocation.country || 'Unknown';
          }
        }
      }
      analytics.summary.byCountry[country] = (analytics.summary.byCountry[country] || 0) + 1;

      // Enhanced device and browser analysis
      const deviceInfo = enhancedData.deviceInfo || {};
      
      // Browser detection
      const browser = deviceInfo.browser || extractBrowserFromUA(link.userAgent) || 'Unknown';
      analytics.deviceAnalysis.browsers[browser] = (analytics.deviceAnalysis.browsers[browser] || 0) + 1;

      // Device detection
      const device = deviceInfo.device || extractDeviceFromUA(link.userAgent) || 'Desktop';
      analytics.deviceAnalysis.devices[device] = (analytics.deviceAnalysis.devices[device] || 0) + 1;

      // OS detection
      const os = deviceInfo.os || extractOSFromUA(link.userAgent) || 'Unknown';
      analytics.deviceAnalysis.operatingSystems[os] = (analytics.deviceAnalysis.operatingSystems[os] || 0) + 1;

      // Screen resolution
      if (deviceInfo.screenResolution) {
        analytics.deviceAnalysis.screenResolutions[deviceInfo.screenResolution] = 
          (analytics.deviceAnalysis.screenResolutions[deviceInfo.screenResolution] || 0) + 1;
      }

      // Enhanced security analysis
      const securityInfo = enhancedData.securityInfo || {};
      if (securityInfo.vpnDetection && securityInfo.vpnDetection.isVPN) {
        analytics.securityAnalysis.vpnDetected++;
      }
      if (securityInfo.vpnDetection && securityInfo.vpnDetection.isProxy) {
        analytics.securityAnalysis.proxyDetected++;
      }
      if (securityInfo.vpnDetection && securityInfo.vpnDetection.isTor) {
        analytics.securityAnalysis.torDetected++;
      }
      if (securityInfo.threatLevel === 'HIGH' || securityInfo.threatLevel === 'CRITICAL') {
        analytics.securityAnalysis.suspiciousIPs++;
      }
      if (deviceInfo.deviceId) {
        analytics.securityAnalysis.fingerprintMatches++;
      }

      // Enhanced behavior analysis
      const behavioralData = enhancedData.rawData.behavioral || {};
      if (behavioralData.mouseMovements !== undefined) {
        totalMouseMovements += behavioralData.mouseMovements || 0;
        behaviorDataCount++;
      }
      if (behavioralData.keyboardEvents !== undefined) {
        totalKeyboardEvents += behavioralData.keyboardEvents || 0;
      }
      if (behavioralData.idleTime !== undefined) {
        totalIdleTime += behavioralData.idleTime || 0;
      }
      if (behavioralData.suspiciousActivity || (enhancedData.qcFlags && enhancedData.qcFlags.length > 0)) {
        analytics.behaviorAnalysis.suspiciousBehavior++;
      }

      // Time to complete analysis
      if (link.status === 'COMPLETED' && link.clickedAt && link.completedAt) {
        const timeToComplete = new Date(link.completedAt).getTime() - new Date(link.clickedAt).getTime();
        totalTimeToComplete += timeToComplete;
        completedCount++;
      }

      // Prepare enhanced raw data
      analytics.rawData.links.push({
        id: link.id,
        uid: link.uid,
        status: link.status,
        linkType,
        vendorId: link.vendorId,
        vendorName: link.vendorId && vendorMap[link.vendorId] ? vendorMap[link.vendorId].name : null,
        ipAddress: enhancedData.ipAddress || link.ipAddress || 'Unknown',
        userAgent: link.userAgent,
        country: country,
        browser: browser,
        device: device,
        os: os,
        screenResolution: deviceInfo.screenResolution || 'Unknown',
        geoData: link.geoData,
        metadata: link.metadata,
        enhancedMetadata: enhancedData,
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

// Helper functions for user agent parsing
function extractBrowserFromUA(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('firefox') && !ua.includes('seamonkey')) {
    return 'Firefox';
  } else if (ua.includes('seamonkey')) {
    return 'SeaMonkey';
  } else if (ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('edg')) {
    return 'Chrome';
  } else if (ua.includes('chromium')) {
    return 'Chromium';
  } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    return 'Safari';
  } else if (ua.includes('edg')) {
    return 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    return 'Opera';
  } else if (ua.includes('trident') || ua.includes('msie')) {
    return 'Internet Explorer';
  }
  
  return 'Unknown';
}

function extractDeviceFromUA(userAgent: string): string {
  if (!userAgent) return 'Desktop';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  } else if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('tv')) {
    return 'Smart TV';
  }
  
  return 'Desktop';
}

function extractOSFromUA(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows nt 10.0') || ua.includes('windows 10')) {
    return 'Windows 10';
  } else if (ua.includes('windows nt 6.3') || ua.includes('windows 8.1')) {
    return 'Windows 8.1';
  } else if (ua.includes('windows nt 6.2') || ua.includes('windows 8')) {
    return 'Windows 8';
  } else if (ua.includes('windows nt 6.1') || ua.includes('windows 7')) {
    return 'Windows 7';
  } else if (ua.includes('windows')) {
    return 'Windows';
  } else if (ua.includes('mac os x')) {
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    if (match) {
      return `macOS ${match[1].replace('_', '.')}`;
    }
    return 'macOS';
  } else if (ua.includes('linux')) {
    if (ua.includes('android')) {
      return 'Android';
    } else if (ua.includes('ubuntu')) {
      return 'Ubuntu';
    }
    return 'Linux';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    const match = ua.match(/os (\d+[._]\d+)/);
    if (match) {
      return `iOS ${match[1].replace('_', '.')}`;
    }
    return 'iOS';
  } else if (ua.includes('android')) {
    const match = ua.match(/android (\d+\.?\d*)/);
    if (match) {
      return `Android ${match[1]}`;
    }
    return 'Android';
  }
  
  return 'Unknown';
}
