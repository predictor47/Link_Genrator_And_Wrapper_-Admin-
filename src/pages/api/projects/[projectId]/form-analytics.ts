import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    const amplifyDataService = await getAmplifyDataService();
    
    // Get project to verify it exists
    const project = await amplifyDataService.projects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all enhanced form responses
    const enhancedResponses = await amplifyDataService.enhancedFormResponses?.list({
      filter: { projectId: { eq: projectId } }
    });

    // Get all presurvey answers for detailed analysis
    const presurveyAnswers = await amplifyDataService.presurveyAnswers?.list({
      filter: { projectId: { eq: projectId } }
    });

    const responses = enhancedResponses?.data || [];
    const answers = presurveyAnswers?.data || [];

    // Calculate comprehensive analytics
    const analytics = {
      overview: calculateOverviewStats(responses),
      qualificationAnalysis: calculateQualificationAnalysis(responses),
      responsePatterns: calculateResponsePatterns(answers),
      timeAnalysis: calculateTimeAnalysis(responses),
      dropoffAnalysis: calculateDropoffAnalysis(responses, answers),
      leadAnalysis: calculateLeadAnalysis(responses),
      geographicDistribution: calculateGeographicDistribution(responses),
      deviceAnalysis: calculateDeviceAnalysis(responses)
    };

    res.status(200).json({
      success: true,
      analytics,
      projectName: project.name,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating form analytics:', error);
    res.status(500).json({ 
      error: 'Failed to generate form analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function calculateOverviewStats(responses: any[]) {
  return {
    totalResponses: responses.length,
    qualifiedResponses: responses.filter(r => r.qualified).length,
    disqualifiedResponses: responses.filter(r => !r.qualified).length,
    qualificationRate: responses.length > 0 ? 
      (responses.filter(r => r.qualified).length / responses.length * 100).toFixed(1) : '0',
    averageCompletionTime: calculateAverageTime(responses.map(r => r.completionTime)),
    responsesLast24h: responses.filter(r => 
      new Date(r.submittedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
  };
}

function calculateQualificationAnalysis(responses: any[]) {
  const qualified = responses.filter(r => r.qualified);
  const disqualified = responses.filter(r => !r.qualified);
  
  const disqualificationReasons = disqualified.reduce((acc, r) => {
    const reason = r.disqualificationReason || 'Unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  return {
    qualificationBreakdown: {
      qualified: qualified.length,
      disqualified: disqualified.length
    },
    disqualificationReasons,
    qualificationTrends: calculateTrends(responses, 'qualified')
  };
}

function calculateResponsePatterns(answers: any[]) {
  const questionStats = answers.reduce((acc, answer) => {
    const qId = answer.questionId;
    if (!acc[qId]) {
      acc[qId] = {
        questionText: answer.questionText,
        totalResponses: 0,
        answerDistribution: {}
      };
    }
    acc[qId].totalResponses++;
    
    const answerText = typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer);
    acc[qId].answerDistribution[answerText] = (acc[qId].answerDistribution[answerText] || 0) + 1;
    
    return acc;
  }, {});

  return questionStats;
}

function calculateTimeAnalysis(responses: any[]) {
  const times = responses.map(r => r.completionTime).filter(t => t && t > 0);
  
  if (times.length === 0) {
    return {
      averageTime: 0,
      medianTime: 0,
      minTime: 0,
      maxTime: 0,
      timeDistribution: {}
    };
  }

  times.sort((a, b) => a - b);
  
  return {
    averageTime: Math.round(times.reduce((sum, t) => sum + t, 0) / times.length),
    medianTime: times[Math.floor(times.length / 2)],
    minTime: times[0],
    maxTime: times[times.length - 1],
    timeDistribution: {
      'under30s': times.filter(t => t < 30).length,
      '30s-1min': times.filter(t => t >= 30 && t < 60).length,
      '1-2min': times.filter(t => t >= 60 && t < 120).length,
      'over2min': times.filter(t => t >= 120).length
    }
  };
}

function calculateDropoffAnalysis(responses: any[], answers: any[]) {
  // This would require more detailed tracking of partial responses
  // For now, we'll provide basic completion vs abandonment stats
  const totalStarted = responses.length;
  const totalCompleted = responses.filter(r => r.responseData && 
    JSON.parse(r.responseData).length > 0).length;
  
  return {
    completionRate: totalStarted > 0 ? 
      (totalCompleted / totalStarted * 100).toFixed(1) : '0',
    abandonmentRate: totalStarted > 0 ? 
      ((totalStarted - totalCompleted) / totalStarted * 100).toFixed(1) : '0',
    totalStarted,
    totalCompleted
  };
}

function calculateLeadAnalysis(responses: any[]) {
  const responsesWithLeads = responses.filter(r => r.leadData);
  
  return {
    totalLeads: responsesWithLeads.length,
    leadConversionRate: responses.length > 0 ? 
      (responsesWithLeads.length / responses.length * 100).toFixed(1) : '0',
    qualifiedLeads: responsesWithLeads.filter(r => r.qualified).length
  };
}

function calculateGeographicDistribution(responses: any[]) {
  // Extract geographic data from metadata
  const geoData = responses.map(r => {
    try {
      const metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
      return metadata?.geoData || null;
    } catch {
      return null;
    }
  }).filter(Boolean);

  const countryDistribution = geoData.reduce((acc, geo) => {
    const country = geo.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  return {
    totalWithGeoData: geoData.length,
    countryDistribution,
    topCountries: Object.entries(countryDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
  };
}

function calculateDeviceAnalysis(responses: any[]) {
  const deviceData = responses.map(r => {
    const userAgent = r.userAgent || '';
    return {
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
      browser: getBrowserFromUserAgent(userAgent),
      os: getOSFromUserAgent(userAgent)
    };
  });

  const deviceTypes = deviceData.reduce((acc: Record<string, number>, device) => {
    const type = device.isMobile ? 'Mobile' : 'Desktop';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const browsers = deviceData.reduce((acc: Record<string, number>, device) => {
    acc[device.browser] = (acc[device.browser] || 0) + 1;
    return acc;
  }, {});

  return {
    deviceTypes,
    browsers,
    mobilePercentage: responses.length > 0 ? 
      (deviceData.filter(d => d.isMobile).length / responses.length * 100).toFixed(1) : '0'
  };
}

function calculateTrends(responses: any[], field: string) {
  // Group by day for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toDateString();
  }).reverse();

  return last7Days.map(day => {
    const dayResponses = responses.filter(r => 
      new Date(r.submittedAt).toDateString() === day
    );
    return {
      date: day,
      count: field === 'qualified' ? 
        dayResponses.filter(r => r.qualified).length : dayResponses.length
    };
  });
}

function calculateAverageTime(times: (number | null)[]): number {
  const validTimes = times.filter(t => t && t > 0) as number[];
  if (validTimes.length === 0) return 0;
  return Math.round(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length);
}

function getBrowserFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Other';
}

function getOSFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Other';
}
