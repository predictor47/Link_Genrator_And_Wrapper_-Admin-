import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface ComprehensiveAnalyticsProps {
  projectId: string;
  projectName: string;
}

interface AnalyticsData {
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

const ComprehensiveAnalyticsDashboard: React.FC<ComprehensiveAnalyticsProps> = ({ projectId, projectName }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    vendor: 'ALL',
    country: 'ALL',
    status: 'ALL',
    flagReason: 'ALL',
    linkType: 'ALL'
  });

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/comprehensive-analytics`);
      setAnalytics(response.data.analytics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string, customHeaders?: string[]) => {
    if (!data.length) return;

    const headers = customHeaders || Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllData = () => {
    if (!analytics) return;

    // Export comprehensive data
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Links data
    exportToCSV(analytics.rawData.links, `${projectName}_links_${timestamp}.csv`, [
      'id', 'uid', 'status', 'linkType', 'vendorName', 'ipAddress', 'userAgent', 'createdAt', 'clickedAt', 'completedAt'
    ]);

    // Flags data
    if (analytics.rawData.flags.length > 0) {
      exportToCSV(analytics.rawData.flags, `${projectName}_flags_${timestamp}.csv`, [
        'id', 'reason', 'vendorName', 'country', 'createdAt'
      ]);
    }

    // Summary analytics
    const summaryData = [
      { metric: 'Total Links', value: analytics.summary.totalLinks },
      { metric: 'Total Flagged', value: analytics.flagAnalysis.totalFlagged },
      { metric: 'VPN Detected', value: analytics.securityAnalysis.vpnDetected },
      { metric: 'Proxy Detected', value: analytics.securityAnalysis.proxyDetected },
      { metric: 'Suspicious Behavior', value: analytics.behaviorAnalysis.suspiciousBehavior },
      { metric: 'Average Time to Complete (ms)', value: analytics.behaviorAnalysis.averageTimeToComplete },
      { metric: 'Average Mouse Movements', value: analytics.behaviorAnalysis.averageMouseMovements }
    ];
    exportToCSV(summaryData, `${projectName}_summary_${timestamp}.csv`);
  };

  const getFilteredData = () => {
    if (!analytics) return { links: [], flags: [] };

    let filteredLinks = analytics.rawData.links;
    let filteredFlags = analytics.rawData.flags;

    // Apply filters
    if (filters.vendor !== 'ALL') {
      filteredLinks = filteredLinks.filter(link => link.vendorName === filters.vendor);
      filteredFlags = filteredFlags.filter(flag => flag.vendorName === filters.vendor);
    }

    if (filters.country !== 'ALL') {
      filteredLinks = filteredLinks.filter(link => {
        try {
          const geoData = link.geoData ? JSON.parse(link.geoData) : {};
          return geoData.country === filters.country;
        } catch {
          return false;
        }
      });
      filteredFlags = filteredFlags.filter(flag => flag.country === filters.country);
    }

    if (filters.status !== 'ALL') {
      filteredLinks = filteredLinks.filter(link => link.status === filters.status);
    }

    if (filters.linkType !== 'ALL') {
      filteredLinks = filteredLinks.filter(link => link.linkType === filters.linkType);
    }

    if (filters.flagReason !== 'ALL') {
      filteredFlags = filteredFlags.filter(flag => flag.reason === filters.flagReason);
    }

    return { links: filteredLinks, flags: filteredFlags };
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    const statusData = {
      labels: Object.keys(analytics.summary.byStatus),
      datasets: [{
        data: Object.values(analytics.summary.byStatus),
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#8B5CF6']
      }]
    };

    const typeData = {
      labels: Object.keys(analytics.summary.byType),
      datasets: [{
        data: Object.values(analytics.summary.byType),
        backgroundColor: ['#3B82F6', '#EC4899']
      }]
    };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Total Links</h3>
            <p className="text-3xl font-bold text-blue-600">{analytics.summary.totalLinks}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{analytics.summary.byStatus.COMPLETED || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Flagged</h3>
            <p className="text-3xl font-bold text-red-600">{analytics.flagAnalysis.totalFlagged}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Success Rate</h3>
            <p className="text-3xl font-bold text-purple-600">
              {analytics.summary.totalLinks > 0 
                ? Math.round(((analytics.summary.byStatus.COMPLETED || 0) / analytics.summary.totalLinks) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Link Status Distribution</h3>
            <div className="h-64">
              <Doughnut data={statusData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Link Type Distribution</h3>
            <div className="h-64">
              <Doughnut data={typeData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVendorAnalysisTab = () => {
    if (!analytics) return null;

    const vendorData = {
      labels: Object.keys(analytics.summary.byVendor),
      datasets: [{
        label: 'Links by Vendor',
        data: Object.values(analytics.summary.byVendor).map(v => v.count),
        backgroundColor: '#3B82F6'
      }]
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Links by Vendor</h3>
          <div className="h-64">
            <Bar data={vendorData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Vendor Flags Table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Flags by Vendor</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Vendor</th>
                  {Object.keys(analytics.flagAnalysis.byReason).map(reason => (
                    <th key={reason} className="px-4 py-2 text-left">{reason}</th>
                  ))}
                  <th className="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.flagAnalysis.byVendor).map(([vendor, reasons]) => (
                  <tr key={vendor} className="border-t">
                    <td className="px-4 py-2 font-medium">{vendor}</td>
                    {Object.keys(analytics.flagAnalysis.byReason).map(reason => (
                      <td key={reason} className="px-4 py-2">{(reasons as any)[reason] || 0}</td>
                    ))}
                    <td className="px-4 py-2 font-semibold">
                      {Object.values(reasons as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityTab = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">VPN Detection</h3>
            <p className="text-3xl font-bold text-orange-600">{analytics.securityAnalysis.vpnDetected}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Proxy Detection</h3>
            <p className="text-3xl font-bold text-red-600">{analytics.securityAnalysis.proxyDetected}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800">Tor Detection</h3>
            <p className="text-3xl font-bold text-purple-600">{analytics.securityAnalysis.torDetected}</p>
          </div>
        </div>

        {/* Flag Reasons */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Flag Reasons</h3>
          <div className="space-y-2">
            {Object.entries(analytics.flagAnalysis.byReason).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{reason}</span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGeographicTab = () => {
    if (!analytics) return null;

    const countryData = {
      labels: Object.keys(analytics.summary.byCountry),
      datasets: [{
        label: 'Links by Country',
        data: Object.values(analytics.summary.byCountry),
        backgroundColor: '#10B981'
      }]
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Geographic Distribution</h3>
          <div className="h-64">
            <Bar data={countryData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Country Flags Table */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Flags by Country</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Country</th>
                  {Object.keys(analytics.flagAnalysis.byReason).map(reason => (
                    <th key={reason} className="px-4 py-2 text-left">{reason}</th>
                  ))}
                  <th className="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.flagAnalysis.byCountry).map(([country, reasons]) => (
                  <tr key={country} className="border-t">
                    <td className="px-4 py-2 font-medium">{country}</td>
                    {Object.keys(analytics.flagAnalysis.byReason).map(reason => (
                      <td key={reason} className="px-4 py-2">{(reasons as any)[reason] || 0}</td>
                    ))}
                    <td className="px-4 py-2 font-semibold">
                      {Object.values(reasons as Record<string, number>).reduce((sum: number, count: number) => sum + count, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderRawDataTab = () => {
    if (!analytics) return null;
    
    const { links, flags } = getFilteredData();

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <select
              value={filters.vendor}
              onChange={(e) => setFilters({...filters, vendor: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Vendors</option>
              {Object.keys(analytics.summary.byVendor).map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
            
            <select
              value={filters.country}
              onChange={(e) => setFilters({...filters, country: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Countries</option>
              {Object.keys(analytics.summary.byCountry).map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Statuses</option>
              {Object.keys(analytics.summary.byStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filters.linkType}
              onChange={(e) => setFilters({...filters, linkType: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Types</option>
              {Object.keys(analytics.summary.byType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filters.flagReason}
              onChange={(e) => setFilters({...filters, flagReason: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Flag Reasons</option>
              {Object.keys(analytics.flagAnalysis.byReason).map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex space-x-4">
            <button
              onClick={exportAllData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Export All Data
            </button>
            <button
              onClick={() => exportToCSV(links, `${projectName}_filtered_links.csv`)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              Export Filtered Links
            </button>
            <button
              onClick={() => exportToCSV(flags, `${projectName}_filtered_flags.csv`)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Export Filtered Flags
            </button>
          </div>
        </div>

        {/* Data Tables */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Links Data ({links.length} records)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">UID</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Vendor</th>
                  <th className="px-2 py-1 text-left">IP</th>
                  <th className="px-2 py-1 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {links.slice(0, 100).map((link) => (
                  <tr key={link.id} className="border-t">
                    <td className="px-2 py-1 font-mono text-xs">{link.uid}</td>
                    <td className="px-2 py-1">{link.status}</td>
                    <td className="px-2 py-1">{link.linkType}</td>
                    <td className="px-2 py-1">{link.vendorName || 'No Vendor'}</td>
                    <td className="px-2 py-1 font-mono text-xs">{link.ipAddress || '-'}</td>
                    <td className="px-2 py-1 text-xs">{new Date(link.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {links.length > 100 && (
              <p className="text-gray-500 text-sm mt-2">Showing first 100 records. Export for full data.</p>
            )}
          </div>
        </div>

        {flags.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Flags Data ({flags.length} records)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left">Reason</th>
                    <th className="px-2 py-1 text-left">Vendor</th>
                    <th className="px-2 py-1 text-left">Country</th>
                    <th className="px-2 py-1 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.slice(0, 100).map((flag) => (
                    <tr key={flag.id} className="border-t">
                      <td className="px-2 py-1">{flag.reason}</td>
                      <td className="px-2 py-1">{flag.vendorName || 'No Vendor'}</td>
                      <td className="px-2 py-1">{flag.country}</td>
                      <td className="px-2 py-1 text-xs">{new Date(flag.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {flags.length > 100 && (
                <p className="text-gray-500 text-sm mt-2">Showing first 100 records. Export for full data.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading comprehensive analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
        No analytics data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Comprehensive Analytics</h2>
            <p className="text-gray-600">{projectName}</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'vendors', label: 'Vendor Analysis' },
              { id: 'security', label: 'Security & Flags' },
              { id: 'geographic', label: 'Geographic' },
              { id: 'rawdata', label: 'Raw Data & Export' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
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
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'vendors' && renderVendorAnalysisTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'geographic' && renderGeographicTab()}
          {activeTab === 'rawdata' && renderRawDataTab()}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveAnalyticsDashboard;
