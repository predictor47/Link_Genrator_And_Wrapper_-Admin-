// Enhanced Project Status Analytics Component
import React from 'react';

interface StatusAnalyticsProps {
  stats: {
    totalProjects: number;
    draftProjects: number;
    liveProjects: number;
    completeProjects: number;
    totalLinks: number;
    pendingLinks: number;
    startedLinks: number;
    inProgressLinks: number;
    completedLinks: number;
    flaggedLinks: number;
  };
  onStatusFilter: (status: string) => void;
  currentFilter: string;
}

const StatusAnalytics: React.FC<StatusAnalyticsProps> = ({ 
  stats, 
  onStatusFilter, 
  currentFilter 
}) => {
  const statusData = [
    {
      status: 'DRAFT',
      count: stats.draftProjects,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      description: 'Projects being configured',
      icon: '📝'
    },
    {
      status: 'LIVE',
      count: stats.liveProjects,
      color: 'bg-green-500',
      textColor: 'text-green-800',
      bgColor: 'bg-green-100',
      description: 'Currently collecting responses',
      icon: '🟢'
    },
    {
      status: 'COMPLETE',
      count: stats.completeProjects,
      color: 'bg-blue-500',
      textColor: 'text-blue-800',
      bgColor: 'bg-blue-100',
      description: 'Finished projects',
      icon: '✅'
    }
  ];

  const linkStatusData = [
    {
      label: 'Pending',
      count: stats.pendingLinks,
      color: 'bg-gray-500',
      description: 'Unused survey links'
    },
    {
      label: 'Started',
      count: stats.startedLinks,
      color: 'bg-orange-500',
      description: 'Clicked but not completed'
    },
    {
      label: 'In Progress',
      count: stats.inProgressLinks,
      color: 'bg-blue-500',
      description: 'Currently being completed'
    },
    {
      label: 'Completed',
      count: stats.completedLinks,
      color: 'bg-green-500',
      description: 'Successfully completed'
    },
    {
      label: 'Flagged',
      count: stats.flaggedLinks,
      color: 'bg-red-500',
      description: 'Disqualified or flagged'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Project Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusData.map((item) => (
            <div
              key={item.status}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                currentFilter === item.status
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onStatusFilter(item.status)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.bgColor} ${item.textColor}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{item.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Survey Links Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Survey Links Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {linkStatusData.map((item) => (
            <div key={item.label} className="text-center">
              <div className={`mx-auto w-16 h-16 rounded-full ${item.color} flex items-center justify-center mb-2`}>
                <span className="text-white font-bold text-lg">{item.count}</span>
              </div>
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Completion Progress</span>
            <span>{stats.totalLinks > 0 ? Math.round((stats.completedLinks / stats.totalLinks) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${stats.totalLinks > 0 ? (stats.completedLinks / stats.totalLinks) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusAnalytics;
