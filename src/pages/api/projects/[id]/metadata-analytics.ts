import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';
import { detectAnomalies, generateMetadataReport, extractMetadataForExport } from '@/lib/metadata';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Project ID is required' 
    });
  }

  try {
    const amplifyServerService = getAmplifyServerService();
    
    // Verify project exists
    const projectResult = await amplifyServerService.getProject(id);
    const project = projectResult.data;
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Fetch survey links for the project
    const surveyLinksResult = await amplifyServerService.listSurveyLinksByProject(id);
    const surveyLinks = surveyLinksResult.data;

    // Analyze metadata for each link
    const metadataAnalysis = {
      totalLinks: surveyLinks.length,
      analyzedLinks: 0,
      botDetectionSummary: {
        totalBots: 0,
        totalSuspicious: 0,
        totalClean: 0,
        averageBotScore: 0,
        commonBotReasons: {} as Record<string, number>,
      },
      deviceAnalysis: {
        browsers: {} as Record<string, number>,
        devices: {} as Record<string, number>,
        operatingSystems: {} as Record<string, number>,
        screenResolutions: {} as Record<string, number>,
      },
      securityAnalysis: {
        vpnUsers: 0,
        proxyUsers: 0,
        torUsers: 0,
        geoMismatches: 0,
      },
      behaviorAnalysis: {
        averageMouseMovements: 0,
        averageKeyboardEvents: 0,
        averageTotalTime: 0,
        averageIdleTime: 0,
        suspiciousPatterns: {} as Record<string, number>,
      },
      networkAnalysis: {
        connectionTypes: {} as Record<string, number>,
        countries: {} as Record<string, number>,
      },
      riskLevels: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
    };

    let totalBotScore = 0;
    let totalMouseMovements = 0;
    let totalKeyboardEvents = 0;
    let totalTime = 0;
    let totalIdleTime = 0;

    // Process each survey link
    for (const link of surveyLinks) {
      if (!link.metadata) continue;

      try {
        const metadata = JSON.parse(link.metadata as string);
        metadataAnalysis.analyzedLinks++;

        // Extract enhanced metadata
        const exportMetadata = extractMetadataForExport(metadata);
        
        // Bot detection analysis
        const anomalies = detectAnomalies(metadata);
        const report = generateMetadataReport(metadata);
        
        totalBotScore += anomalies.score;
        metadataAnalysis.riskLevels[report.riskLevel]++;
        
        if (anomalies.isBot) {
          metadataAnalysis.botDetectionSummary.totalBots++;
        } else if (anomalies.score > 30) {
          metadataAnalysis.botDetectionSummary.totalSuspicious++;
        } else {
          metadataAnalysis.botDetectionSummary.totalClean++;
        }

        // Count bot reasons
        anomalies.reasons.forEach(reason => {
          metadataAnalysis.botDetectionSummary.commonBotReasons[reason] = 
            (metadataAnalysis.botDetectionSummary.commonBotReasons[reason] || 0) + 1;
        });

        // Device analysis
        const browser = exportMetadata.browser || 'Unknown';
        const device = exportMetadata.device || 'Unknown';
        const os = exportMetadata.os || 'Unknown';
        const screenRes = exportMetadata.screenResolution || 'Unknown';

        metadataAnalysis.deviceAnalysis.browsers[browser] = 
          (metadataAnalysis.deviceAnalysis.browsers[browser] || 0) + 1;
        metadataAnalysis.deviceAnalysis.devices[device] = 
          (metadataAnalysis.deviceAnalysis.devices[device] || 0) + 1;
        metadataAnalysis.deviceAnalysis.operatingSystems[os] = 
          (metadataAnalysis.deviceAnalysis.operatingSystems[os] || 0) + 1;
        metadataAnalysis.deviceAnalysis.screenResolutions[screenRes] = 
          (metadataAnalysis.deviceAnalysis.screenResolutions[screenRes] || 0) + 1;

        // Security analysis
        if (exportMetadata.isVPN) metadataAnalysis.securityAnalysis.vpnUsers++;
        if (exportMetadata.isProxy) metadataAnalysis.securityAnalysis.proxyUsers++;
        if (exportMetadata.isTor) metadataAnalysis.securityAnalysis.torUsers++;
        if (metadata.geoLocation?.isMismatch) metadataAnalysis.securityAnalysis.geoMismatches++;

        // Behavior analysis
        totalMouseMovements += exportMetadata.mouseMovements || 0;
        totalKeyboardEvents += exportMetadata.keyboardEvents || 0;
        totalTime += exportMetadata.totalTime || 0;
        totalIdleTime += exportMetadata.idleTime || 0;

        // Count suspicious patterns
        const patterns = exportMetadata.suspiciousPatterns || '';
        if (patterns !== 'None' && patterns) {
          patterns.split('; ').forEach((pattern: string) => {
            metadataAnalysis.behaviorAnalysis.suspiciousPatterns[pattern] = 
              (metadataAnalysis.behaviorAnalysis.suspiciousPatterns[pattern] || 0) + 1;
          });
        }

        // Network analysis
        const connectionType = exportMetadata.connectionType || 'Unknown';
        const country = exportMetadata.country || 'Unknown';

        metadataAnalysis.networkAnalysis.connectionTypes[connectionType] = 
          (metadataAnalysis.networkAnalysis.connectionTypes[connectionType] || 0) + 1;
        metadataAnalysis.networkAnalysis.countries[country] = 
          (metadataAnalysis.networkAnalysis.countries[country] || 0) + 1;

      } catch (error) {
        console.error('Error parsing metadata for link:', link.id, error);
      }
    }

    // Calculate averages
    if (metadataAnalysis.analyzedLinks > 0) {
      metadataAnalysis.botDetectionSummary.averageBotScore = totalBotScore / metadataAnalysis.analyzedLinks;
      metadataAnalysis.behaviorAnalysis.averageMouseMovements = totalMouseMovements / metadataAnalysis.analyzedLinks;
      metadataAnalysis.behaviorAnalysis.averageKeyboardEvents = totalKeyboardEvents / metadataAnalysis.analyzedLinks;
      metadataAnalysis.behaviorAnalysis.averageTotalTime = totalTime / metadataAnalysis.analyzedLinks;
      metadataAnalysis.behaviorAnalysis.averageIdleTime = totalIdleTime / metadataAnalysis.analyzedLinks;
    }

    // Sort results for top items
    const sortByCount = (obj: Record<string, number>) => 
      Object.entries(obj).sort(([,a], [,b]) => b - a).slice(0, 10);

    return res.status(200).json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
      },
      analysis: {
        ...metadataAnalysis,
        topBotReasons: sortByCount(metadataAnalysis.botDetectionSummary.commonBotReasons),
        topBrowsers: sortByCount(metadataAnalysis.deviceAnalysis.browsers),
        topDevices: sortByCount(metadataAnalysis.deviceAnalysis.devices),
        topOperatingSystems: sortByCount(metadataAnalysis.deviceAnalysis.operatingSystems),
        topScreenResolutions: sortByCount(metadataAnalysis.deviceAnalysis.screenResolutions),
        topSuspiciousPatterns: sortByCount(metadataAnalysis.behaviorAnalysis.suspiciousPatterns),
        topConnectionTypes: sortByCount(metadataAnalysis.networkAnalysis.connectionTypes),
        topCountries: sortByCount(metadataAnalysis.networkAnalysis.countries),
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating metadata analytics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate metadata analytics' 
    });
  }
}
