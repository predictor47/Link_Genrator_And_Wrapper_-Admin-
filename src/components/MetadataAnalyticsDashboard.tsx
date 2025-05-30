import React, { useState, useEffect } from 'react';

interface MetadataAnalyticsProps {
  projectId: string;
}

interface AnalyticsData {
  project: {
    id: string;
    name: string;
  };
  analysis: {
    totalLinks: number;
    analyzedLinks: number;
    botDetectionSummary: {
      totalBots: number;
      totalSuspicious: number;
      totalClean: number;
      averageBotScore: number;
    };
    deviceAnalysis: {
      browsers: Record<string, number>;
      devices: Record<string, number>;
      operatingSystems: Record<string, number>;
    };
    securityAnalysis: {
      vpnUsers: number;
      proxyUsers: number;
      torUsers: number;
      geoMismatches: number;
    };
    behaviorAnalysis: {
      averageMouseMovements: number;
      averageKeyboardEvents: number;
      averageTotalTime: number;
      averageIdleTime: number;
    };
    riskLevels: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      CRITICAL: number;
    };
    topBotReasons: [string, number][];
    topBrowsers: [string, number][];
    topDevices: [string, number][];
    topOperatingSystems: [string, number][];
    topSuspiciousPatterns: [string, number][];
    topCountries: [string, number][];
  };
  generatedAt: string;
}

// Alert Triangle Icon Component
const AlertTriangleIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

// Shield Icon Component
const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// Users Icon Component
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

// Activity Icon Component
const ActivityIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// Globe Icon Component
const GlobeIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Monitor Icon Component
const MonitorIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// Card Component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

// Card Header Component
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

// Card Title Component
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-800 ${className}`}>
    {children}
  </h3>
);

// Card Content Component
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

// Badge Component
const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' 
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'bg-white text-gray-800 border border-gray-300',
    secondary: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const MetadataAnalyticsDashboard: React.FC<MetadataAnalyticsProps> = ({ projectId }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1 minute default
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/metadata-analytics`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metadata analytics');
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAnalytics();
    }
  }, [projectId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !projectId) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, projectId]);

  const handleRefresh = () => {
    fetchAnalytics();
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangleIcon />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const { analysis } = data;
  const botPercentage = analysis.analyzedLinks > 0 ? 
    (analysis.botDetectionSummary.totalBots / analysis.analyzedLinks) * 100 : 0;
  const suspiciousPercentage = analysis.analyzedLinks > 0 ? 
    (analysis.botDetectionSummary.totalSuspicious / analysis.analyzedLinks) * 100 : 0;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">Metadata Analytics</h2>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto-refresh" className="text-sm text-gray-700">
                Auto-refresh
              </label>
            </div>

            {/* Refresh interval */}
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={600000}>10 minutes</option>
              </select>
            )}

            {/* Manual refresh button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <UsersIcon />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalLinks}</div>
            <p className="text-xs text-gray-500">
              {analysis.analyzedLinks} analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Detection</CardTitle>
            <ShieldIcon />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysis.botDetectionSummary.totalBots}
            </div>
            <p className="text-xs text-gray-500">
              {botPercentage.toFixed(1)}% of analyzed links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangleIcon />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analysis.botDetectionSummary.totalSuspicious}
            </div>
            <p className="text-xs text-gray-500">
              {suspiciousPercentage.toFixed(1)}% flagged as suspicious
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bot Score</CardTitle>
            <ActivityIcon />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.botDetectionSummary.averageBotScore.toFixed(1)}
            </div>
            <p className="text-xs text-gray-500">
              Out of 100 (higher = more suspicious)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Levels Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analysis.riskLevels).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(level)}`}></div>
                  <span className="text-sm font-medium">{level}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{count} links</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getRiskColor(level)}`}
                      style={{ 
                        width: `${analysis.analyzedLinks > 0 ? (count / analysis.analyzedLinks) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShieldIcon />
              <span>Security Threats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">VPN Users</span>
                <Badge variant="destructive">{analysis.securityAnalysis.vpnUsers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Proxy Users</span>
                <Badge variant="destructive">{analysis.securityAnalysis.proxyUsers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Tor Users</span>
                <Badge variant="destructive">{analysis.securityAnalysis.torUsers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Geo Mismatches</span>
                <Badge variant="secondary">{analysis.securityAnalysis.geoMismatches}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ActivityIcon />
              <span>Behavior Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Mouse Movements</span>
                <span className="font-medium">{Math.round(analysis.behaviorAnalysis.averageMouseMovements)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Keyboard Events</span>
                <span className="font-medium">{Math.round(analysis.behaviorAnalysis.averageKeyboardEvents)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Session Time</span>
                <span className="font-medium">{Math.round(analysis.behaviorAnalysis.averageTotalTime / 1000)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Idle Time</span>
                <span className="font-medium">{Math.round(analysis.behaviorAnalysis.averageIdleTime)}s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MonitorIcon />
              <span>Top Browsers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.topBrowsers.slice(0, 5).map(([browser, count]) => (
                <div key={browser} className="flex justify-between items-center">
                  <span className="text-sm">{browser}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GlobeIcon />
              <span>Top Countries</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.topCountries.slice(0, 5).map(([country, count]) => (
                <div key={country} className="flex justify-between items-center">
                  <span className="text-sm">{country}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangleIcon />
              <span>Bot Detection Reasons</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.topBotReasons.slice(0, 5).map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center">
                  <span className="text-sm truncate">{reason}</span>
                  <Badge variant="destructive">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Patterns */}
      {analysis.topSuspiciousPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangleIcon />
              <span>Suspicious Behavioral Patterns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.topSuspiciousPatterns.map(([pattern, count]) => (
                <div key={pattern} className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                  <span className="text-sm text-red-800">{pattern}</span>
                  <Badge variant="destructive">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Analytics generated at {new Date(data.generatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default MetadataAnalyticsDashboard;
