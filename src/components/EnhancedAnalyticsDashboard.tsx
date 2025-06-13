import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Treemap
} from 'recharts';

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
    mobileVsDesktop: Record<string, number>;
  };
  
  // Behavioral analytics
  behavioralAnalytics: {
    averageTimeOnSite: number;
    mouseMovements: {
      average: number;
      median: number;
      suspicious: number;
    };
    keyboardEvents: {
      average: number;
      median: number;
      suspicious: number;
    };
    suspiciousPatterns: Record<string, number>;
    automationDetected: number;
    humanLikeScore: number;
  };
  
  // Data quality metrics
  dataQuality: {
    scores: {
      high: number;
      medium: number;
      low: number;
    };
    completeness: {
      withFingerprint: number;
      withBehavioral: number;
      withPresurvey: number;
      withGeoData: number;
    };
    flags: Record<string, number>;
  };
  
  // Time-based trends
  timeSeriesData: Array<{
    date: string;
    completions: number;
    blocks: number;
    dataQuality: number;
    threatLevel: number;
  }>;
  
  // Vendor performance (if applicable)
  vendorAnalytics?: Record<string, {
    completionRate: number;
    averageQuality: number;
    securityRisk: number;
    geoDistribution: Record<string, number>;
  }>;
}

interface EnhancedAnalyticsDashboardProps {
  projectId: string;
  dateRange?: {
    start: string;
    end: string;
  };
  refreshInterval?: number;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  indigo: '#6366F1'
};

const CHART_COLORS = [
  COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger,
  COLORS.info, COLORS.purple, COLORS.pink, COLORS.indigo
];

export const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  projectId,
  dateRange,
  refreshInterval = 30000
}) => {
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          projectId,
          ...(dateRange && { 
            startDate: dateRange.start,
            endDate: dateRange.end 
          })
        });
        
        const response = await fetch(`/api/analytics/enhanced?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        
        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [projectId, dateRange, refreshInterval]);

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!data) return {};

    return {
      completionPie: [
        { name: 'Completed', value: data.completionStats.completed, color: COLORS.success },
        { name: 'Disqualified', value: data.completionStats.disqualified, color: COLORS.warning },
        { name: 'Quota Full', value: data.completionStats.quotaFull, color: COLORS.info },
        { name: 'Abandoned', value: data.completionStats.abandoned, color: COLORS.danger }
      ],
      
      securityPie: [
        { name: 'Low Risk', value: data.securityAnalytics.threatLevels.LOW || 0, color: COLORS.success },
        { name: 'Medium Risk', value: data.securityAnalytics.threatLevels.MEDIUM || 0, color: COLORS.warning },
        { name: 'High Risk', value: data.securityAnalytics.threatLevels.HIGH || 0, color: COLORS.danger },
        { name: 'Critical Risk', value: data.securityAnalytics.threatLevels.CRITICAL || 0, color: '#DC2626' }
      ],
      
      geoAccuracyPie: [
        { name: 'High Accuracy', value: data.geoAnalytics.geoAccuracy.HIGH || 0, color: COLORS.success },
        { name: 'Medium Accuracy', value: data.geoAnalytics.geoAccuracy.MEDIUM || 0, color: COLORS.warning },
        { name: 'Low Accuracy', value: data.geoAnalytics.geoAccuracy.LOW || 0, color: COLORS.danger }
      ],
      
      dataQualityPie: [
        { name: 'High Quality', value: data.dataQuality.scores.high, color: COLORS.success },
        { name: 'Medium Quality', value: data.dataQuality.scores.medium, color: COLORS.warning },
        { name: 'Low Quality', value: data.dataQuality.scores.low, color: COLORS.danger }
      ],
      
      topCountries: Object.entries(data.geoAnalytics.countries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([country, count]) => ({ country, count })),
        
      deviceTypes: Object.entries(data.deviceAnalytics.devices)
        .map(([device, count]) => ({ device, count })),
        
      browsers: Object.entries(data.deviceAnalytics.browsers)
        .map(([browser, count]) => ({ browser, count })),
        
      suspiciousPatterns: Object.entries(data.behavioralAnalytics.suspiciousPatterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([pattern, count]) => ({ 
          pattern: pattern.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
          count 
        }))
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Loading enhanced analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-lg font-semibold">Error Loading Analytics</div>
        <div className="text-red-500 mt-2">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Enhanced Survey Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Completion Rate</div>
            <div className="text-2xl font-bold text-blue-900">
              {(data.completionStats.completionRate * 100).toFixed(1)}%
            </div>
            <div className="text-blue-600 text-sm">
              {data.completionStats.completed} / {data.completionStats.total}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Security Status</div>
            <div className="text-2xl font-bold text-green-900">
              {data.securityAnalytics.blockedAttempts} Blocked
            </div>
            <div className="text-green-600 text-sm">
              {data.securityAnalytics.vpnDetections} VPN • {data.securityAnalytics.torDetections} Tor
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-600 text-sm font-medium">Data Quality</div>
            <div className="text-2xl font-bold text-purple-900">
              {((data.dataQuality.scores.high / (data.dataQuality.scores.high + data.dataQuality.scores.medium + data.dataQuality.scores.low)) * 100).toFixed(1)}%
            </div>
            <div className="text-purple-600 text-sm">High Quality Responses</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-orange-600 text-sm font-medium">Human-like Score</div>
            <div className="text-2xl font-bold text-orange-900">
              {(data.behavioralAnalytics.humanLikeScore * 100).toFixed(1)}%
            </div>
            <div className="text-orange-600 text-sm">
              {data.behavioralAnalytics.automationDetected} Bots Detected
            </div>
          </div>
        </div>
      </div>

      {/* Metric Selection Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'security', label: 'Security' },
              { id: 'geography', label: 'Geography' },
              { id: 'devices', label: 'Devices' },
              { id: 'behavior', label: 'Behavior' },
              { id: 'quality', label: 'Data Quality' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedMetric === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedMetric === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Completion Status */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Survey Completion Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.completionPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.completionPie?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Time Series Trend */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Completion Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="completions" 
                      stroke={COLORS.success}
                      strokeWidth={2}
                      name="Completions"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="blocks" 
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      name="Blocks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Threat Levels */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Security Threat Levels</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.securityPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.securityPie?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Security Detection Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Security Detections</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">VPN Detected</span>
                    <span className="text-red-600 font-bold">{data.securityAnalytics.vpnDetections}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Proxy Detected</span>
                    <span className="text-gray-600 font-bold">{data.securityAnalytics.proxyDetections}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-black bg-opacity-10 rounded">
                    <span className="font-medium">Tor Network</span>
                    <span className="text-black font-bold">{data.securityAnalytics.torDetections}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="font-medium">Hosting/Cloud</span>
                    <span className="text-blue-600 font-bold">{data.securityAnalytics.hostingDetections}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedMetric === 'geography' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Countries */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.topCountries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Geo Accuracy */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Geographic Accuracy</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.geoAccuracyPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.geoAccuracyPie?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'devices' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Types */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Device Types</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.deviceTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="device" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.info} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Browsers */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Browser Usage</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.browsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="browser" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.purple} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'behavior' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Behavioral Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Behavioral Metrics</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 font-medium">Average Time on Site</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {Math.round(data.behavioralAnalytics.averageTimeOnSite / 1000)} seconds
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 font-medium">Mouse Movements</div>
                    <div className="text-lg font-bold text-green-900">
                      Avg: {data.behavioralAnalytics.mouseMovements.average}
                    </div>
                    <div className="text-green-600 text-sm">
                      Suspicious: {data.behavioralAnalytics.mouseMovements.suspicious}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 font-medium">Keyboard Events</div>
                    <div className="text-lg font-bold text-purple-900">
                      Avg: {data.behavioralAnalytics.keyboardEvents.average}
                    </div>
                    <div className="text-purple-600 text-sm">
                      Suspicious: {data.behavioralAnalytics.keyboardEvents.suspicious}
                    </div>
                  </div>
                </div>
              </div>

              {/* Suspicious Patterns */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Suspicious Patterns</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.suspiciousPatterns} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="pattern" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedMetric === 'quality' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Quality Distribution */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Quality Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.dataQualityPie}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.dataQualityPie?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Data Completeness */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Completeness</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="font-medium">With Fingerprint</span>
                    <span className="text-green-600 font-bold">
                      {((data.dataQuality.completeness.withFingerprint / data.completionStats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="font-medium">With Behavioral Data</span>
                    <span className="text-blue-600 font-bold">
                      {((data.dataQuality.completeness.withBehavioral / data.completionStats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="font-medium">With Presurvey</span>
                    <span className="text-purple-600 font-bold">
                      {((data.dataQuality.completeness.withPresurvey / data.completionStats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded">
                    <span className="font-medium">With Geo Data</span>
                    <span className="text-indigo-600 font-bold">
                      {((data.dataQuality.completeness.withGeoData / data.completionStats.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Analytics (if applicable) */}
      {data.vendorAnalytics && Object.keys(data.vendorAnalytics).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Vendor Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Vendor</th>
                  <th className="px-4 py-2 text-center">Completion Rate</th>
                  <th className="px-4 py-2 text-center">Avg Quality</th>
                  <th className="px-4 py-2 text-center">Security Risk</th>
                  <th className="px-4 py-2 text-center">Top Country</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.vendorAnalytics).map(([vendorId, stats]) => {
                  const topCountry = Object.entries(stats.geoDistribution)
                    .sort(([,a], [,b]) => b - a)[0];
                  
                  return (
                    <tr key={vendorId} className="border-t">
                      <td className="px-4 py-2 font-medium">{vendorId}</td>
                      <td className="px-4 py-2 text-center">
                        {(stats.completionRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-center">
                        {stats.averageQuality.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          stats.securityRisk < 30 ? 'bg-green-100 text-green-800' :
                          stats.securityRisk < 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stats.securityRisk.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {topCountry ? `${topCountry[0]} (${topCountry[1]})` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAnalyticsDashboard;
