import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface FormAnalytics {
  overview: {
    totalResponses: number;
    qualifiedResponses: number;
    disqualifiedResponses: number;
    qualificationRate: string;
    averageCompletionTime: number;
    responsesLast24h: number;
  };
  qualificationAnalysis: {
    qualificationBreakdown: {
      qualified: number;
      disqualified: number;
    };
    disqualificationReasons: Record<string, number>;
    qualificationTrends: Array<{ date: string; count: number }>;
  };
  responsePatterns: Record<string, {
    questionText: string;
    totalResponses: number;
    answerDistribution: Record<string, number>;
  }>;
  timeAnalysis: {
    averageTime: number;
    medianTime: number;
    minTime: number;
    maxTime: number;
    timeDistribution: Record<string, number>;
  };
  leadAnalysis: {
    totalLeads: number;
    leadConversionRate: string;
    qualifiedLeads: number;
  };
  deviceAnalysis: {
    deviceTypes: Record<string, number>;
    browsers: Record<string, number>;
    mobilePercentage: string;
  };
}

interface EnhancedFormDashboardProps {
  projectId: string;
}

const EnhancedFormDashboard: React.FC<EnhancedFormDashboardProps> = ({ projectId }) => {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (projectId) {
      fetchAnalytics();
    }
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/form-analytics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data.analytics);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const StatCard = ({ title, value, subtitle, color = 'blue' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${color}-500`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );

  const ProgressBar = ({ value, max, label }: { value: number; max: number; label: string }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{value} ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button 
          onClick={fetchAnalytics}
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Form Analytics</h1>
        <p className="text-gray-600">Comprehensive analysis of your pre-survey form performance</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'qualification', label: 'Qualification Analysis' },
            { key: 'responses', label: 'Response Patterns' },
            { key: 'performance', label: 'Performance' },
            { key: 'leads', label: 'Lead Generation' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Responses" 
              value={analytics.overview.totalResponses}
              color="blue"
            />
            <StatCard 
              title="Qualification Rate" 
              value={`${analytics.overview.qualificationRate}%`}
              subtitle={`${analytics.overview.qualifiedResponses} qualified`}
              color="green"
            />
            <StatCard 
              title="Avg. Completion Time" 
              value={formatTime(analytics.overview.averageCompletionTime)}
              color="purple"
            />
            <StatCard 
              title="Last 24 Hours" 
              value={analytics.overview.responsesLast24h}
              subtitle="new responses"
              color="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualification Breakdown</h3>
              <ProgressBar 
                value={analytics.overview.qualifiedResponses}
                max={analytics.overview.totalResponses}
                label="Qualified Responses"
              />
              <ProgressBar 
                value={analytics.overview.disqualifiedResponses}
                max={analytics.overview.totalResponses}
                label="Disqualified Responses"
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution</h3>
              {Object.entries(analytics.deviceAnalysis.deviceTypes).map(([device, count]) => (
                <ProgressBar 
                  key={device}
                  value={count}
                  max={analytics.overview.totalResponses}
                  label={device}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Qualification Analysis Tab */}
      {activeTab === 'qualification' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Disqualification Reasons</h3>
              {Object.entries(analytics.qualificationAnalysis.disqualificationReasons).map(([reason, count]) => (
                <div key={reason} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{reason}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${(count / analytics.overview.disqualifiedResponses * 100) || 0}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualification Trends (7 Days)</h3>
              <div className="space-y-2">
                {analytics.qualificationAnalysis.qualificationTrends.map((trend, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{new Date(trend.date).toLocaleDateString()}</span>
                    <span className="font-medium">{trend.count} qualified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Patterns Tab */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          {Object.entries(analytics.responsePatterns).map(([questionId, questionData]) => (
            <div key={questionId} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{questionData.questionText}</h3>
              <p className="text-sm text-gray-600 mb-4">Total Responses: {questionData.totalResponses}</p>
              
              <div className="space-y-2">
                {Object.entries(questionData.answerDistribution).map(([answer, count]) => (
                  <div key={answer} className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate max-w-xs">{answer}</span>
                      <span className="font-medium ml-2">{count} ({((count / questionData.totalResponses) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / questionData.totalResponses) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Time Analysis</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Time:</span>
                  <span className="font-medium">{formatTime(analytics.timeAnalysis.averageTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Median Time:</span>
                  <span className="font-medium">{formatTime(analytics.timeAnalysis.medianTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fastest:</span>
                  <span className="font-medium">{formatTime(analytics.timeAnalysis.minTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slowest:</span>
                  <span className="font-medium">{formatTime(analytics.timeAnalysis.maxTime)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution</h3>
              {Object.entries(analytics.timeAnalysis.timeDistribution).map(([range, count]) => (
                <ProgressBar 
                  key={range}
                  value={count}
                  max={analytics.overview.totalResponses}
                  label={range}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lead Generation Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Leads" 
              value={analytics.leadAnalysis.totalLeads}
              color="green"
            />
            <StatCard 
              title="Lead Conversion Rate" 
              value={`${analytics.leadAnalysis.leadConversionRate}%`}
              color="blue"
            />
            <StatCard 
              title="Qualified Leads" 
              value={analytics.leadAnalysis.qualifiedLeads}
              subtitle="qualified for survey"
              color="purple"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Generation Performance</h3>
            <p className="text-gray-600 mb-4">
              Your form is capturing lead information from {analytics.leadAnalysis.leadConversionRate}% of respondents.
              {analytics.leadAnalysis.qualifiedLeads > 0 && ` ${analytics.leadAnalysis.qualifiedLeads} of these leads also qualified for the main survey.`}
            </p>
            
            {analytics.leadAnalysis.totalLeads === 0 && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p><strong>Tip:</strong> Consider adding questions marked as "Lead Questions" to capture contact information from respondents.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex space-x-4">
        <button 
          onClick={fetchAnalytics}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
        <button 
          onClick={() => router.push(`/admin/projects/${projectId}/edit`)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Edit Form
        </button>
      </div>
    </div>
  );
};

export default EnhancedFormDashboard;
