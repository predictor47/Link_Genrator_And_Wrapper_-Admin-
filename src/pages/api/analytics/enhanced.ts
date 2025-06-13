import type { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

interface EnhancedAnalyticsData {
  // Survey completion data
  completionStats: {
    total: number;
    completed: number;
    disqualified: number;
    quotaFull: number;
    abandoned: number;
    completionRate: number;
  };
  
  // Enhanced security analytics
  securityAnalytics: {
    threatLevels: Record<string, number>;
    vpnDetections: number;
    torDetections: number;
    proxyDetections: number;
    hostingDetections: number;
    blockedAttempts: number;
    securityFlags: Record<string, number>;
  };
  
  // Geographic distribution
  geoAnalytics: {
    countries: Record<string, number>;
    regions: Record<string, number>;
    cities: Record<string, number>;
    geoAccuracy: Record<string, number>;
    geoConfidence: {
      high: number;
      medium: number;
      low: number;
    };
  };
  
  // Device and browser analytics
  deviceAnalytics: {
    devices: Record<string, number>;
    browsers: Record<string, number>;
    operatingSystems: Record<string, number>;
    screenResolutions: Record<string, number>;
    mobileVsDesktop: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  };
  
  // Behavioral analytics
  behavioralAnalytics: {
    averageTimeOnPage: number;
    averageIdleTime: number;
    mouseMovementPatterns: Record<string, number>;
    keyboardEventStats: Record<string, number>;
    suspiciousPatterns: Record<string, number>;
    humanLikeScore: number;
    automationDetected: number;
  };
  
  // Data quality metrics
  dataQuality: {
    scores: {
      high: number;
      medium: number;
      low: number;
    };
    averageScore: number;
    completenessRate: number;
    reliabilityRate: number;
  };
  
  // Time-based trends
  timeAnalytics: {
    hourlyDistribution: Record<string, number>;
    dailyTrends: Record<string, number>;
    weeklyPatterns: Record<string, number>;
    peakHours: string[];
  };
  
  // Vendor performance
  vendorAnalytics: {
    performance: Record<string, {
      completions: number;
      flags: number;
      quality: number;
      conversionRate: number;
    }>;
    topPerformers: string[];
    qualityLeaders: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, startDate, endDate, vendorId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }

    const amplifyServerService = getAmplifyServerService();
    
    // Verify project exists
    const projectResult = await amplifyServerService.getProject(projectId);
    if (!projectResult.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Fetch survey links for the project
    let surveyLinksResult = await amplifyServerService.listSurveyLinksByProject(projectId);
    let surveyLinks = surveyLinksResult.data;

    // Apply vendor filter if specified
    if (vendorId && typeof vendorId === 'string') {
      surveyLinks = surveyLinks.filter(link => link.vendorId === vendorId);
    }

    // Apply date filters if specified
    if (startDate || endDate) {
      surveyLinks = surveyLinks.filter(link => {
        const linkDate = new Date(link.createdAt);
        if (startDate && linkDate < new Date(startDate as string)) return false;
        if (endDate && linkDate > new Date(endDate as string)) return false;
        return true;
      });
    }

    // Fetch vendors for analytics
    const vendorsResult = await amplifyServerService.listVendors();
    const vendors = vendorsResult.data;
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    // Initialize analytics data
    const analytics: EnhancedAnalyticsData = {
      completionStats: {
        total: surveyLinks.length,
        completed: 0,
        disqualified: 0,
        quotaFull: 0,
        abandoned: 0,
        completionRate: 0
      },
      securityAnalytics: {
        threatLevels: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        vpnDetections: 0,
        torDetections: 0,
        proxyDetections: 0,
        hostingDetections: 0,
        blockedAttempts: 0,
        securityFlags: {}
      },
      geoAnalytics: {
        countries: {},
        regions: {},
        cities: {},
        geoAccuracy: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        geoConfidence: { high: 0, medium: 0, low: 0 }
      },
      deviceAnalytics: {
        devices: {},
        browsers: {},
        operatingSystems: {},
        screenResolutions: {},
        mobileVsDesktop: { mobile: 0, desktop: 0, tablet: 0 }
      },
      behavioralAnalytics: {
        averageTimeOnPage: 0,
        averageIdleTime: 0,
        mouseMovementPatterns: {},
        keyboardEventStats: {},
        suspiciousPatterns: {},
        humanLikeScore: 0,
        automationDetected: 0
      },
      dataQuality: {
        scores: { high: 0, medium: 0, low: 0 },
        averageScore: 0,
        completenessRate: 0,
        reliabilityRate: 0
      },
      timeAnalytics: {
        hourlyDistribution: {},
        dailyTrends: {},
        weeklyPatterns: {},
        peakHours: []
      },
      vendorAnalytics: {
        performance: {},
        topPerformers: [],
        qualityLeaders: []
      }
    };

    // Accumulative variables for averages
    let totalTimeOnPage = 0;
    let totalIdleTime = 0;
    let totalDataQuality = 0;
    let humanLikeScoreSum = 0;
    let processedLinksCount = 0;

    // Process each survey link for analytics
    for (const link of surveyLinks) {
      processedLinksCount++;

      // Completion stats
      switch (link.status) {
        case 'COMPLETED':
          analytics.completionStats.completed++;
          break;
        case 'DISQUALIFIED':
          analytics.completionStats.disqualified++;
          break;
        case 'QUOTA_FULL':
          analytics.completionStats.quotaFull++;
          break;
        case 'CLICKED':
        case 'UNUSED':
          analytics.completionStats.abandoned++;
          break;
      }

      // Time analytics
      const linkDate = new Date(link.createdAt);
      const hour = linkDate.getHours().toString();
      const dayOfWeek = linkDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = linkDate.toISOString().split('T')[0];

      analytics.timeAnalytics.hourlyDistribution[hour] = 
        (analytics.timeAnalytics.hourlyDistribution[hour] || 0) + 1;
      analytics.timeAnalytics.weeklyPatterns[dayOfWeek] = 
        (analytics.timeAnalytics.weeklyPatterns[dayOfWeek] || 0) + 1;
      analytics.timeAnalytics.dailyTrends[dateStr] = 
        (analytics.timeAnalytics.dailyTrends[dateStr] || 0) + 1;

      // Process metadata if available
      if (link.metadata) {
        try {
          const metadata = JSON.parse(link.metadata as string);

          // Enhanced fingerprinting data
          if (metadata.enhancedFingerprint) {
            const fp = metadata.enhancedFingerprint;

            // Device analytics
            if (fp.browser?.name) {
              analytics.deviceAnalytics.browsers[fp.browser.name] = 
                (analytics.deviceAnalytics.browsers[fp.browser.name] || 0) + 1;
            }

            if (fp.platform) {
              analytics.deviceAnalytics.operatingSystems[fp.platform] = 
                (analytics.deviceAnalytics.operatingSystems[fp.platform] || 0) + 1;
            }

            if (fp.screen) {
              const resolution = `${fp.screen.width}x${fp.screen.height}`;
              analytics.deviceAnalytics.screenResolutions[resolution] = 
                (analytics.deviceAnalytics.screenResolutions[resolution] || 0) + 1;
            }

            // Behavioral analytics
            if (fp.behavioral) {
              totalTimeOnPage += fp.behavioral.timeOnPage || 0;
              totalIdleTime += fp.behavioral.idleTime || 0;

              if (fp.behavioral.suspiciousPatterns) {
                fp.behavioral.suspiciousPatterns.forEach((pattern: string) => {
                  analytics.behavioralAnalytics.suspiciousPatterns[pattern] = 
                    (analytics.behavioralAnalytics.suspiciousPatterns[pattern] || 0) + 1;
                });
              }

              // Automation detection
              if (fp.advanced?.automationDetected) {
                analytics.behavioralAnalytics.automationDetected++;
              }
            }
          }

          // Security analytics
          if (metadata.securityContext) {
            const sec = metadata.securityContext;

            if (sec.threatLevel) {
              analytics.securityAnalytics.threatLevels[sec.threatLevel] = 
                (analytics.securityAnalytics.threatLevels[sec.threatLevel] || 0) + 1;
            }

            if (sec.vpnDetection?.isVPN) {
              analytics.securityAnalytics.vpnDetections++;
            }

            if (sec.vpnDetection?.isTor) {
              analytics.securityAnalytics.torDetections++;
            }

            if (sec.vpnDetection?.isProxy) {
              analytics.securityAnalytics.proxyDetections++;
            }

            if (sec.vpnDetection?.isHosting) {
              analytics.securityAnalytics.hostingDetections++;
            }

            if (sec.isBlocked) {
              analytics.securityAnalytics.blockedAttempts++;
            }
          }

          // Geographic analytics
          if (metadata.geoLocationData) {
            const geo = metadata.geoLocationData;

            if (geo.country) {
              analytics.geoAnalytics.countries[geo.country] = 
                (analytics.geoAnalytics.countries[geo.country] || 0) + 1;
            }

            if (geo.region) {
              analytics.geoAnalytics.regions[geo.region] = 
                (analytics.geoAnalytics.regions[geo.region] || 0) + 1;
            }

            if (geo.city) {
              analytics.geoAnalytics.cities[geo.city] = 
                (analytics.geoAnalytics.cities[geo.city] || 0) + 1;
            }

            if (geo.accuracy) {
              const accuracyLevel = geo.accuracy > 80 ? 'HIGH' : 
                                   geo.accuracy > 50 ? 'MEDIUM' : 'LOW';
              analytics.geoAnalytics.geoAccuracy[accuracyLevel]++;

              if (geo.confidence > 80) analytics.geoAnalytics.geoConfidence.high++;
              else if (geo.confidence > 50) analytics.geoAnalytics.geoConfidence.medium++;
              else analytics.geoAnalytics.geoConfidence.low++;
            }
          }

          // Data quality
          if (metadata.dataQualityScore !== undefined) {
            totalDataQuality += metadata.dataQualityScore;

            if (metadata.dataQualityScore >= 80) {
              analytics.dataQuality.scores.high++;
            } else if (metadata.dataQualityScore >= 60) {
              analytics.dataQuality.scores.medium++;
            } else {
              analytics.dataQuality.scores.low++;
            }
          }

          // Human-like score calculation
          let humanScore = 100;
          if (metadata.securityContext?.vpnDetection?.isVPN) humanScore -= 20;
          if (metadata.enhancedFingerprint?.advanced?.automationDetected) humanScore -= 30;
          if (metadata.enhancedFingerprint?.behavioral?.suspiciousPatterns?.length > 2) humanScore -= 15;
          
          humanLikeScoreSum += Math.max(0, humanScore);

        } catch (error) {
          console.error('Error parsing metadata for link:', link.id, error);
        }
      }

      // Vendor analytics
      if (link.vendorId) {
        const vendor = vendorMap.get(link.vendorId);
        if (vendor) {
          if (!analytics.vendorAnalytics.performance[vendor.name]) {
            analytics.vendorAnalytics.performance[vendor.name] = {
              completions: 0,
              flags: 0,
              quality: 0,
              conversionRate: 0
            };
          }

          const vendorPerf = analytics.vendorAnalytics.performance[vendor.name];
          
          if (link.status === 'COMPLETED') {
            vendorPerf.completions++;
          } else if (['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status || '')) {
            vendorPerf.flags++;
          }

          // Calculate conversion rate
          const totalVendorLinks = surveyLinks.filter(l => l.vendorId === link.vendorId).length;
          vendorPerf.conversionRate = totalVendorLinks > 0 ? 
            (vendorPerf.completions / totalVendorLinks) * 100 : 0;
        }
      }
    }

    // Calculate averages and derived metrics
    if (processedLinksCount > 0) {
      analytics.behavioralAnalytics.averageTimeOnPage = totalTimeOnPage / processedLinksCount;
      analytics.behavioralAnalytics.averageIdleTime = totalIdleTime / processedLinksCount;
      analytics.behavioralAnalytics.humanLikeScore = humanLikeScoreSum / processedLinksCount / 100;
      analytics.dataQuality.averageScore = totalDataQuality / processedLinksCount;
      analytics.completionStats.completionRate = 
        (analytics.completionStats.completed / analytics.completionStats.total) * 100;
    }

    // Calculate data quality rates
    const totalQualityScores = analytics.dataQuality.scores.high + 
                              analytics.dataQuality.scores.medium + 
                              analytics.dataQuality.scores.low;
    
    if (totalQualityScores > 0) {
      analytics.dataQuality.completenessRate = 
        ((analytics.dataQuality.scores.high + analytics.dataQuality.scores.medium) / 
         totalQualityScores) * 100;
      
      analytics.dataQuality.reliabilityRate = 
        (analytics.dataQuality.scores.high / totalQualityScores) * 100;
    }

    // Find peak hours
    const hourlyEntries = Object.entries(analytics.timeAnalytics.hourlyDistribution)
      .sort(([,a], [,b]) => b - a);
    analytics.timeAnalytics.peakHours = hourlyEntries.slice(0, 3).map(([hour]) => hour);

    // Find top performing vendors
    const vendorEntries = Object.entries(analytics.vendorAnalytics.performance)
      .sort(([,a], [,b]) => b.conversionRate - a.conversionRate);
    analytics.vendorAnalytics.topPerformers = vendorEntries.slice(0, 5).map(([name]) => name);

    // Find quality leaders
    const qualityEntries = Object.entries(analytics.vendorAnalytics.performance)
      .sort(([,a], [,b]) => (b.completions / (b.completions + b.flags + 1)) - 
                           (a.completions / (a.completions + a.flags + 1)));
    analytics.vendorAnalytics.qualityLeaders = qualityEntries.slice(0, 5).map(([name]) => name);

    return res.status(200).json({
      success: true,
      data: analytics,
      metadata: {
        projectId,
        totalLinksProcessed: processedLinksCount,
        dateRange: { startDate, endDate },
        vendorFilter: vendorId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating enhanced analytics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate enhanced analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
