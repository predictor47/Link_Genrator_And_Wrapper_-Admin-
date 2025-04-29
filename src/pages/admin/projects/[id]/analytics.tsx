import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import axios from 'axios';
import { Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface Vendor {
  id: string;
  name: string;
  code: string;
  stats?: {
    total: number;
    pending: number;
    started: number;
    inProgress: number;
    completed: number;
    flagged: number;
  }
}

interface Flag {
  id: string;
  reason: string;
  createdAt: string;
  vendorName?: string;
  linkType?: string;
}

interface GeoData {
  country: string;
  count: number;
  completedCount: number;
  flaggedCount: number;
}

interface ProjectAnalyticsProps {
  projectId: string;
  projectName: string;
  vendors: Vendor[];
  flags: Flag[];
  geoData: GeoData[];
  linkTypeData: {
    test: number;
    live: number;
    testCompleted: number;
    liveCompleted: number;
    testFlagged: number;
    liveFlagged: number;
  };
}

export default function ProjectAnalytics({ 
  projectId,
  projectName,
  vendors,
  flags,
  geoData,
  linkTypeData
}: ProjectAnalyticsProps) {
  const router = useRouter();
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prepare chart data for status overview
  const statusData = {
    labels: ['Pending', 'Started', 'In Progress', 'Completed', 'Flagged'],
    datasets: [
      {
        data: vendors.reduce(
          (acc, vendor) => {
            if (selectedVendor === 'all' || selectedVendor === vendor.id) {
              if (vendor.stats) {
                acc[0] += vendor.stats.pending;
                acc[1] += vendor.stats.started;
                acc[2] += vendor.stats.inProgress;
                acc[3] += vendor.stats.completed;
                acc[4] += vendor.stats.flagged;
              }
            }
            return acc;
          }, 
          [0, 0, 0, 0, 0]
        ),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // Blue
          'rgba(16, 185, 129, 0.8)', // Green
          'rgba(245, 158, 11, 0.8)', // Yellow
          'rgba(5, 150, 105, 0.8)',  // Emerald
          'rgba(239, 68, 68, 0.8)',  // Red
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(5, 150, 105, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare chart data for vendor comparison
  const vendorComparisonData = {
    labels: vendors.map(v => v.name),
    datasets: [
      {
        label: 'Total Links',
        data: vendors.map(v => v.stats?.total || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Completed',
        data: vendors.map(v => v.stats?.completed || 0),
        backgroundColor: 'rgba(5, 150, 105, 0.6)',
      },
      {
        label: 'Flagged',
        data: vendors.map(v => v.stats?.flagged || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
    ],
  };
  
  // Prepare chart data for geographical distribution
  const geoChartData = {
    labels: geoData.map(g => g.country),
    datasets: [
      {
        label: 'All Responses',
        data: geoData.map(g => g.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Completed',
        data: geoData.map(g => g.completedCount),
        backgroundColor: 'rgba(5, 150, 105, 0.6)',
      },
      {
        label: 'Flagged',
        data: geoData.map(g => g.flaggedCount),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      }
    ]
  };
  
  // Prepare test vs. live comparison data
  const linkTypeChartData = {
    labels: ['Test Links', 'Live Links'],
    datasets: [
      {
        label: 'Total',
        data: [linkTypeData.test, linkTypeData.live],
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
      },
      {
        label: 'Completed',
        data: [linkTypeData.testCompleted, linkTypeData.liveCompleted],
        backgroundColor: 'rgba(5, 150, 105, 0.6)',
      },
      {
        label: 'Flagged',
        data: [linkTypeData.testFlagged, linkTypeData.liveFlagged],
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
    ],
  };
  
  const exportData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/projects/${projectId}/export`, {
        params: {
          vendor: selectedVendor !== 'all' ? selectedVendor : undefined,
          dateRange,
          format: 'csv'
        }
      });
      
      // Create a download link for the CSV data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${projectName}-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting data:', err);
      setError(err?.response?.data?.message || 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/admin/projects/${projectId}`} className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Project
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{projectName} Analytics</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportData}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filter Controls */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Analytics Filters</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="vendor-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                id="vendor-filter"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedVendor('all');
                  setDateRange('all');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'vendors' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendor Comparison
            </button>
            <button
              onClick={() => setActiveTab('geo')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'geo' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Geographic Distribution
            </button>
            <button
              onClick={() => setActiveTab('testlive')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'testlive' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test vs. Live
            </button>
            <button
              onClick={() => setActiveTab('flags')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'flags' 
                  ? 'border-b-2 border-border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flags
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Status Overview</h2>
              {selectedVendor !== 'all' && (
                <p className="mt-1 text-sm text-gray-500">
                  Filtered by vendor: {vendors.find(v => v.id === selectedVendor)?.name}
                </p>
              )}
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                  <Doughnut 
                    data={statusData} 
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context: any) {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                              return `${label}: ${value} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Completion Rate Card */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">Completion Rate</h3>
                  <div className="text-4xl font-bold">
                    {(() => {
                      const total = statusData.datasets[0].data.reduce((a, b) => a + b, 0);
                      const completed = statusData.datasets[0].data[3];
                      return total > 0 ? Math.round((completed / total) * 100) : 0;
                    })()}%
                  </div>
                  <p className="text-green-100 mt-2">
                    {statusData.datasets[0].data[3]} of {statusData.datasets[0].data.reduce((a, b) => a + b, 0)} links completed
                  </p>
                </div>
                
                {/* Flag Rate Card */}
                <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">Flag Rate</h3>
                  <div className="text-4xl font-bold">
                    {(() => {
                      const total = statusData.datasets[0].data.reduce((a, b) => a + b, 0);
                      const flagged = statusData.datasets[0].data[4];
                      return total > 0 ? Math.round((flagged / total) * 100) : 0;
                    })()}%
                  </div>
                  <p className="text-red-100 mt-2">
                    {statusData.datasets[0].data[4]} of {statusData.datasets[0].data.reduce((a, b) => a + b, 0)} links flagged
                  </p>
                </div>
                
                {/* Quality Score Card */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">Quality Score</h3>
                  <div className="text-4xl font-bold">
                    {(() => {
                      const completed = statusData.datasets[0].data[3];
                      const flagged = statusData.datasets[0].data[4];
                      const total = completed + flagged;
                      // Quality score formula: 100 - (flagged / (completed + flagged) * 100)
                      return total > 0 ? Math.round(100 - ((flagged / total) * 100)) : 100;
                    })()}/100
                  </div>
                  <p className="text-blue-100 mt-2">
                    Based on completion to flag ratio
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'vendors' && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Vendor Comparison</h2>
            </div>
            <div className="p-6">
              {vendors.length > 1 ? (
                <div className="h-96">
                  <Bar 
                    data={vendorComparisonData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          stacked: false,
                          title: {
                            display: true,
                            text: 'Vendors'
                          }
                        },
                        y: {
                          stacked: false,
                          title: {
                            display: true,
                            text: 'Number of Links'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  You need at least two vendors to compare performance.
                </p>
              )}
              
              {/* Vendor Stats Table */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Statistics</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Links
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Rate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flagged
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quality Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendors.map((vendor) => {
                        const stats = vendor.stats || { total: 0, pending: 0, started: 0, inProgress: 0, completed: 0, flagged: 0 };
                        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        const qualityScore = stats.completed + stats.flagged > 0
                          ? Math.round(100 - ((stats.flagged / (stats.completed + stats.flagged)) * 100))
                          : 100;
                          
                        return (
                          <tr key={vendor.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {vendor.name} <span className="text-xs text-gray-500">({vendor.code})</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stats.total}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stats.completed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {completionRate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stats.flagged}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  qualityScore >= 90
                                    ? 'bg-green-100 text-green-800'
                                    : qualityScore >= 70
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {qualityScore}/100
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'geo' && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Geographic Distribution</h2>
              {selectedVendor !== 'all' && (
                <p className="mt-1 text-sm text-gray-500">
                  Filtered by vendor: {vendors.find(v => v.id === selectedVendor)?.name}
                </p>
              )}
            </div>
            <div className="p-6">
              {geoData.length > 0 ? (
                <div className="h-96">
                  <Bar 
                    data={geoChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          stacked: false,
                          title: {
                            display: true,
                            text: 'Countries'
                          }
                        },
                        y: {
                          stacked: false,
                          title: {
                            display: true,
                            text: 'Number of Responses'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  No geographic data available. Geographic data is collected when users complete surveys.
                </p>
              )}
              
              {/* Geo Stats Table */}
              {geoData.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Statistics</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Responses
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completed
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Flagged
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {geoData.map((geo) => {
                          const completionRate = geo.count > 0 ? Math.round((geo.completedCount / geo.count) * 100) : 0;
                          
                          return (
                            <tr key={geo.country}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {geo.country}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {geo.count}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {geo.completedCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {geo.flaggedCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {completionRate}%
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
          </div>
        )}
        
        {activeTab === 'testlive' && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Test vs. Live Comparison</h2>
              {selectedVendor !== 'all' && (
                <p className="mt-1 text-sm text-gray-500">
                  Filtered by vendor: {vendors.find(v => v.id === selectedVendor)?.name}
                </p>
              )}
            </div>
            <div className="p-6">
              <div className="h-96">
                <Bar 
                  data={linkTypeChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Link Type'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Number of Links'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              {/* Test/Live Comparison Table */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test vs. Live Metrics</h3>
                <div className="overflow-hidden bg-gray-50 shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Comparison</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Detailed metrics for test and live environments.</p>
                  </div>
                  <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Metric</dt>
                        <dd className="text-sm font-medium text-gray-700 sm:col-span-1">Test Links</dd>
                        <dd className="text-sm font-medium text-gray-700 sm:col-span-1">Live Links</dd>
                        <dd className="text-sm font-medium text-gray-700 sm:col-span-1">Difference</dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Total Links</dt>
                        <dd className="text-sm text-gray-900 sm:col-span-1">{linkTypeData.test}</dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">{linkTypeData.live}</dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">-</dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Completion Rate</dt>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {linkTypeData.test > 0 ? Math.round((linkTypeData.testCompleted / linkTypeData.test) * 100) : 0}%
                        </dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {linkTypeData.live > 0 ? Math.round((linkTypeData.liveCompleted / linkTypeData.live) * 100) : 0}%
                        </dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {(() => {
                            const testRate = linkTypeData.test > 0 ? (linkTypeData.testCompleted / linkTypeData.test) * 100 : 0;
                            const liveRate = linkTypeData.live > 0 ? (linkTypeData.liveCompleted / linkTypeData.live) * 100 : 0;
                            const diff = Math.round(testRate - liveRate);
                            const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600';
                            const prefix = diff > 0 ? '+' : '';
                            return <span className={color}>{prefix}{diff}%</span>;
                          })()}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Flag Rate</dt>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {linkTypeData.test > 0 ? Math.round((linkTypeData.testFlagged / linkTypeData.test) * 100) : 0}%
                        </dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {linkTypeData.live > 0 ? Math.round((linkTypeData.liveFlagged / linkTypeData.live) * 100) : 0}%
                        </dd>
                        <dd className="text-sm text-gray-900 sm:col-span-1">
                          {(() => {
                            const testRate = linkTypeData.test > 0 ? (linkTypeData.testFlagged / linkTypeData.test) * 100 : 0;
                            const liveRate = linkTypeData.live > 0 ? (linkTypeData.liveFlagged / linkTypeData.live) * 100 : 0;
                            const diff = Math.round(testRate - liveRate);
                            const color = diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-600';
                            const prefix = diff > 0 ? '+' : '';
                            return <span className={color}>{prefix}{diff}%</span>;
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'flags' && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Flag Analysis</h2>
              {selectedVendor !== 'all' && (
                <p className="mt-1 text-sm text-gray-500">
                  Filtered by vendor: {vendors.find(v => v.id === selectedVendor)?.name}
                </p>
              )}
            </div>
            <div className="p-6">
              {flags.length > 0 ? (
                <>
                  {/* Flag Reason Analysis */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Flag Reasons</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                          {(() => {
                            // Group flags by reason and count
                            const reasonCounts: Record<string, number> = {};
                            flags.forEach(flag => {
                              reasonCounts[flag.reason] = (reasonCounts[flag.reason] || 0) + 1;
                            });
                            
                            // Sort reasons by count
                            return Object.entries(reasonCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([reason, count]) => {
                                const percentage = Math.round((count / flags.length) * 100);
                                return (
                                  <li key={reason} className="py-4">
                                    <div className="flex justify-between">
                                      <p className="text-sm font-medium text-gray-900">{reason}</p>
                                      <p className="text-sm text-gray-500">{count} ({percentage}%)</p>
                                    </div>
                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                      <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                  </li>
                                );
                              });
                          })()}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Flags */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Flags</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reason
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vendor
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Link Type
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {flags.slice(0, 10).map((flag) => (
                            <tr key={flag.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(flag.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {flag.reason}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {flag.vendorName || 'None'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  flag.linkType === 'TEST' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {flag.linkType || 'LIVE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 italic">
                  No flags found. Flags are created when suspicious behavior is detected.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // Fetch project info
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      }
    });

    if (!project) {
      return {
        notFound: true
      };
    }

    // Fetch vendors with their stats
    const vendors = await prisma.vendor.findMany({
      where: { projectId: id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        surveyLinks: {
          select: { status: true }
        }
      }
    });

    // Calculate stats for each vendor
    const vendorsWithStats = vendors.map(vendor => {
      const stats = {
        total: vendor.surveyLinks.length,
        pending: vendor.surveyLinks.filter(link => link.status === 'PENDING').length,
        started: vendor.surveyLinks.filter(link => link.status === 'STARTED').length,
        inProgress: vendor.surveyLinks.filter(link => link.status === 'IN_PROGRESS').length,
        completed: vendor.surveyLinks.filter(link => link.status === 'COMPLETED').length,
        flagged: vendor.surveyLinks.filter(link => link.status === 'FLAGGED').length,
      };

      return {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
        createdAt: vendor.createdAt.toISOString(),
        stats
      };
    });

    // Fetch flags
    const flags = await prisma.flag.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        reason: true,
        createdAt: true,
        surveyLink: {
          select: {
            linkType: true,
            vendor: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const processedFlags = flags.map(flag => ({
      id: flag.id,
      reason: flag.reason,
      createdAt: flag.createdAt.toISOString(),
      linkType: flag.surveyLink?.linkType || null,
      vendorName: flag.surveyLink?.vendor?.name || null
    }));

    // Fetch geographic data
    // In a real implementation, this would come from actual response metadata
    // Here we'll create some sample data based on existing responses
    const responses = await prisma.response.findMany({
      where: { projectId: id },
      select: {
        metadata: true,
        surveyLink: {
          select: {
            status: true
          }
        }
      }
    });

    // Extract geo data from responses
    const geoData: Record<string, GeoData> = {};
    
    // Process responses to extract country info
    responses.forEach(response => {
      try {
        const metadata = JSON.parse(response.metadata || '{}');
        const country = metadata?.geoLocation?.country || 
                       metadata?.ip_location?.country ||
                       metadata?.country ||
                       'Unknown';
        
        if (!geoData[country]) {
          geoData[country] = {
            country,
            count: 0,
            completedCount: 0,
            flaggedCount: 0
          };
        }
        
        geoData[country].count++;
        
        if (response.surveyLink.status === 'COMPLETED') {
          geoData[country].completedCount++;
        } else if (response.surveyLink.status === 'FLAGGED') {
          geoData[country].flaggedCount++;
        }
      } catch (e) {
        console.error('Error parsing response metadata:', e);
      }
    });
    
    // Convert to array and sort
    const processedGeoData = Object.values(geoData).sort((a, b) => b.count - a.count);

    // Fetch test vs live data
    const linkTypeStats = await prisma.surveyLink.groupBy({
      by: ['linkType', 'status'],
      where: { projectId: id },
      _count: {
        id: true
      }
    });

    // Process test vs live data
    const linkTypeData = {
      test: 0,
      live: 0,
      testCompleted: 0,
      liveCompleted: 0,
      testFlagged: 0,
      liveFlagged: 0
    };

    linkTypeStats.forEach(stat => {
      if (stat.linkType === 'TEST') {
        linkTypeData.test += stat._count.id;
        if (stat.status === 'COMPLETED') {
          linkTypeData.testCompleted += stat._count.id;
        } else if (stat.status === 'FLAGGED') {
          linkTypeData.testFlagged += stat._count.id;
        }
      } else {
        linkTypeData.live += stat._count.id;
        if (stat.status === 'COMPLETED') {
          linkTypeData.liveCompleted += stat._count.id;
        } else if (stat.status === 'FLAGGED') {
          linkTypeData.liveFlagged += stat._count.id;
        }
      }
    });

    return {
      props: {
        projectId: project.id,
        projectName: project.name,
        vendors: vendorsWithStats,
        flags: processedFlags,
        geoData: processedGeoData,
        linkTypeData
      }
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return {
      props: {
        projectId: id,
        projectName: 'Error loading project',
        vendors: [],
        flags: [],
        geoData: [],
        linkTypeData: {
          test: 0,
          live: 0,
          testCompleted: 0,
          liveCompleted: 0,
          testFlagged: 0,
          liveFlagged: 0
        }
      }
    };
  }
}