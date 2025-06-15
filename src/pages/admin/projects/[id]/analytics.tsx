import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
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
import ProtectedRoute from '@/lib/protected-route';
import ComprehensiveAnalyticsDashboard from '@/components/ComprehensiveAnalyticsDashboard';
import QCDashboard from '@/components/QCDashboard';

// CSV Export Utilities
function exportToCSV(data: any[], filename: string, headers: string[]) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma
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
}

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
  linkType?: string; // Add linkType for flag type identification
}

interface GeoData {
  country: string;
  count: number;
  completedCount: number;
  flaggedCount: number; // Add flaggedCount for geo data statistics
  disqualifiedCount: number; // Changed from flaggedCount to disqualifiedCount
}

interface ProjectAnalyticsProps {
  projectId: string;
  projectName: string;
  vendors: Vendor[];
  flags: Flag[]; 
  geoData: GeoData[];  linkTypeData: {
    test: number;
    live: number;
    testCompleted: number;
    liveCompleted: number;
    testDisqualified: number;
    liveDisqualified: number;
    testFlagged: number; // Add testFlagged
    liveFlagged: number; // Add liveFlagged
  };
}

// Function to extract geographic data from survey links metadata
function extractGeographicData(links: any[]): GeoData[] {
  const countryStats: { [key: string]: { count: number; completedCount: number; flaggedCount: number; disqualifiedCount: number } } = {};

  links.forEach(link => {
    // Only process links that have been clicked or have geographic data
    // Skip unused links that don't have any activity
    if (link.status === 'UNUSED') {
      return;
    }

    let country = null;
    
    // Try to extract country from metadata
    if (link.metadata) {
      try {
        const metadata = JSON.parse(link.metadata);
        
        // Check multiple possible locations for country data
        country = metadata?.geoLocation?.country || 
                 metadata?.ip_location?.country || 
                 metadata?.country || 
                 metadata?.ipinfo?.country || null;
        
        // Clean up country name - remove country codes and normalize
        if (country) {
          // If it's a country code like "US", expand it
          const countryCodeMap: { [key: string]: string } = {
            'US': 'United States',
            'CA': 'Canada', 
            'GB': 'United Kingdom',
            'UK': 'United Kingdom',
            'AU': 'Australia',
            'DE': 'Germany',
            'FR': 'France',
            'IT': 'Italy',
            'ES': 'Spain',
            'NL': 'Netherlands',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
            'IN': 'India',
            'CN': 'China',
            'JP': 'Japan',
            'KR': 'South Korea',
            'BR': 'Brazil',
            'MX': 'Mexico',
            'AR': 'Argentina'
          };
          
          country = countryCodeMap[country.toUpperCase()] || country;
        }
      } catch (e) {
        console.error('Error parsing metadata for geographic data:', e);
      }
    }

    // Only count if we have actual geographic data or the link has been used
    // For links without geographic data but that have been clicked, use 'Unknown'
    if (!country && ['CLICKED', 'COMPLETED', 'DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)) {
      country = 'Unknown';
    }

    // Skip this link if we still don't have a country (unused links)
    if (!country) {
      return;
    }

    // Initialize country stats if not exists
    if (!countryStats[country]) {
      countryStats[country] = {
        count: 0,
        completedCount: 0,
        flaggedCount: 0,
        disqualifiedCount: 0
      };
    }

    // Increment total count
    countryStats[country].count++;

    // Count completed responses
    if (link.status === 'COMPLETED') {
      countryStats[country].completedCount++;
    }

    // Count flagged responses (includes both disqualified and quota full)
    if (['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)) {
      countryStats[country].flaggedCount++;
      
      // Separate disqualified count
      if (link.status === 'DISQUALIFIED') {
        countryStats[country].disqualifiedCount++;
      }
    }
  });

  // Convert to array and sort by count (descending)
  return Object.entries(countryStats)
    .map(([country, stats]) => ({
      country,
      ...stats
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Limit to top 20 countries for performance
}

function ProjectAnalyticsComponent({ 
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
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [linkStatusFilter, setLinkStatusFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [rawDataCurrentPage, setRawDataCurrentPage] = useState<number>(1);
  const [rawDataPageSize] = useState<number>(50);
  const [rawDataSortField, setRawDataSortField] = useState<string>('createdAt');
  const [rawDataSortDirection, setRawDataSortDirection] = useState<'asc' | 'desc'>('desc');
  const [rawDataLinks, setRawDataLinks] = useState<any[]>([]);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  
  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        window.location.reload();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Function to refresh data manually
  const refreshData = () => {
    setLastUpdated(new Date());
    window.location.reload();
  };

  // Filter vendors based on search query
  const filteredVendors = vendors.filter(vendor => 
    searchQuery === '' || 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter flags based on various criteria
  const filteredFlags = flags.filter(flag => {
    if (searchQuery && !flag.reason.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedVendor !== 'all' && flag.vendorName) {
      const vendor = vendors.find(v => v.name === flag.vendorName);
      if (!vendor || vendor.id !== selectedVendor) {
        return false;
      }
    }
    return true;
  });

  // Prepare chart data for status overview with filtering
  const getFilteredStatusData = () => {
    const filteredVendorsList = selectedVendor === 'all' ? vendors : vendors.filter(v => v.id === selectedVendor);
    return filteredVendorsList.reduce(
      (acc, vendor) => {
        if (vendor.stats) {
          acc[0] += vendor.stats.pending;  // UNUSED mapped to pending
          acc[1] += vendor.stats.started;  // CLICKED mapped to started
          acc[2] += vendor.stats.completed; // COMPLETED stays as completed
          acc[3] += vendor.stats.flagged / 2; // Split flagged between DISQUALIFIED
          acc[4] += vendor.stats.flagged / 2; // and QUOTA_FULL (approximate)
        }
        return acc;
      }, 
      [0, 0, 0, 0, 0]
    );
  };
  const statusData = {
    labels: ['Unused', 'Clicked', 'Completed', 'Disqualified', 'Quota Full'],
    datasets: [
      {
        data: getFilteredStatusData(),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // Blue - Unused (was Pending)
          'rgba(245, 158, 11, 0.8)', // Yellow - Clicked (was Started)
          'rgba(5, 150, 105, 0.8)',  // Emerald - Completed
          'rgba(239, 68, 68, 0.8)',  // Red - Disqualified
          'rgba(168, 85, 247, 0.8)', // Purple - Quota Full (new)
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(5, 150, 105, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare chart data for vendor comparison with filtering
  const vendorComparisonData = {
    labels: filteredVendors.map(v => v.name),
    datasets: [
      {
        label: 'Total Links',
        data: filteredVendors.map(v => v.stats?.total || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Completed',
        data: filteredVendors.map(v => v.stats?.completed || 0),
        backgroundColor: 'rgba(5, 150, 105, 0.6)',
      },
      {
        label: 'Disqualified/Quota Full',
        data: filteredVendors.map(v => v.stats?.flagged || 0),
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
        label: 'Disqualified/Quota Full',
        data: geoData.map(g => g.disqualifiedCount),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      }
    ]
  };
    // Prepare test vs. live comparison data
  // Enhanced export functionality with multiple formats
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
      a.download = `${projectName}-raw-data-${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting data:', err);
      setError(err?.response?.data?.message || 'Failed to export raw data');
    } finally {
      setIsLoading(false);
    }
  };

  // Export analytics summary data
  const exportAnalyticsSummary = () => {
    const summaryData = [
      {
        metric: 'Total Vendors',
        value: vendors.length,
        category: 'Vendors'
      },
      {
        metric: 'Total Links',
        value: vendors.reduce((sum, v) => sum + (v.stats?.total || 0), 0),
        category: 'Links'
      },
      {
        metric: 'Completed Links',
        value: vendors.reduce((sum, v) => sum + (v.stats?.completed || 0), 0),
        category: 'Links'
      },
      {
        metric: 'Flagged Links',
        value: vendors.reduce((sum, v) => sum + (v.stats?.flagged || 0), 0),
        category: 'Links'
      },
      {
        metric: 'Test Links',
        value: linkTypeData.test,
        category: 'Link Types'
      },
      {
        metric: 'Live Links',
        value: linkTypeData.live,
        category: 'Link Types'
      },
      {
        metric: 'Total Countries',
        value: geoData.length,
        category: 'Geography'
      },
      {
        metric: 'Total Flags',
        value: flags.length,
        category: 'Flags'
      }
    ];

    const headers = ['Metric', 'Value', 'Category'];
    exportToCSV(summaryData, `${projectName}-analytics-summary-${new Date().toISOString().split('T')[0]}.csv`, headers);
  };

  // Export vendor performance data
  const exportVendorPerformance = () => {
    const vendorData = vendors.map(vendor => ({
      vendorName: vendor.name,
      vendorCode: vendor.code,
      totalLinks: vendor.stats?.total || 0,
      pendingLinks: vendor.stats?.pending || 0,
      startedLinks: vendor.stats?.started || 0,
      completedLinks: vendor.stats?.completed || 0,
      flaggedLinks: vendor.stats?.flagged || 0,
      completionRate: vendor.stats?.total ? 
        ((vendor.stats.completed / vendor.stats.total) * 100).toFixed(2) + '%' : '0%',
      flagRate: vendor.stats?.total ? 
        ((vendor.stats.flagged / vendor.stats.total) * 100).toFixed(2) + '%' : '0%'
    }));

    const headers = ['vendorName', 'vendorCode', 'totalLinks', 'pendingLinks', 'startedLinks', 'completedLinks', 'flaggedLinks', 'completionRate', 'flagRate'];
    exportToCSV(vendorData, `${projectName}-vendor-performance-${new Date().toISOString().split('T')[0]}.csv`, headers);
  };

  // Export geographical analytics
  const exportGeographicalData = () => {
    const geoExportData = geoData.map(geo => ({
      country: geo.country,
      totalResponses: geo.count,
      completedResponses: geo.completedCount,
      flaggedResponses: geo.flaggedCount,
      disqualifiedResponses: geo.disqualifiedCount,
      completionRate: geo.count ? ((geo.completedCount / geo.count) * 100).toFixed(2) + '%' : '0%',
      flagRate: geo.count ? ((geo.flaggedCount / geo.count) * 100).toFixed(2) + '%' : '0%'
    }));

    const headers = ['country', 'totalResponses', 'completedResponses', 'flaggedResponses', 'disqualifiedResponses', 'completionRate', 'flagRate'];
    exportToCSV(geoExportData, `${projectName}-geographical-analytics-${new Date().toISOString().split('T')[0]}.csv`, headers);
  };

  // Export flag analysis
  const exportFlagAnalysis = () => {
    const flagData = flags.map(flag => ({
      flagReason: flag.reason,
      vendorName: flag.vendorName || 'Unknown',
      linkType: flag.linkType || 'Unknown',
      flaggedAt: flag.createdAt,
      flagDate: new Date(flag.createdAt).toLocaleDateString()
    }));

    const headers = ['flagReason', 'vendorName', 'linkType', 'flaggedAt', 'flagDate'];
    exportToCSV(flagData, `${projectName}-flag-analysis-${new Date().toISOString().split('T')[0]}.csv`, headers);
  };
  
  // Function to fetch raw data for the Raw Data tab
  const fetchRawData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/projects/${projectId}/export`, {
        params: {
          format: 'json',
          page: rawDataCurrentPage,
          limit: rawDataPageSize,
          sortField: rawDataSortField,
          sortDirection: rawDataSortDirection
        }
      });
      
      if (response.data && response.data.data) {
        // Transform the data to include wrapped URLs
        const transformedData = response.data.data.map((item: any) => ({
          ...item,
          wrappedUrl: `${window.location.origin}/s/${projectId}/${item.uid}`
        }));
        
        setRawDataLinks(transformedData);
      }
    } catch (err: any) {
      console.error('Error fetching raw data:', err);
      setError(err?.response?.data?.message || 'Failed to fetch raw data');
      setRawDataLinks([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle sorting for raw data
  const handleSort = (field: string) => {
    if (rawDataSortField === field) {
      setRawDataSortDirection(rawDataSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRawDataSortField(field);
      setRawDataSortDirection('asc');
    }
    setRawDataCurrentPage(1); // Reset to first page when sorting
  };
  
  // useEffect to fetch raw data when tab changes or pagination/sorting changes
  useEffect(() => {
    if (activeTab === 'rawdata') {
      fetchRawData();
    }
  }, [activeTab, rawDataCurrentPage, rawDataSortField, rawDataSortDirection, projectId]);
  
  return (
    <ProtectedRoute>
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
              {/* Auto-refresh controls */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>
              
              {/* Manual refresh button */}
              <button
                onClick={refreshData}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              {/* Enhanced Export Dropdown */}
              <div className="relative inline-block text-left">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
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
                  <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showExportMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={() => { exportData(); setShowExportMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Raw Data CSV
                      </button>
                      <button
                        onClick={() => { exportAnalyticsSummary(); setShowExportMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analytics Summary
                      </button>
                      <button
                        onClick={() => { exportVendorPerformance(); setShowExportMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Vendor Performance
                      </button>
                      <button
                        onClick={() => { exportGeographicalData(); setShowExportMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Geographic Analytics
                      </button>
                      <button
                        onClick={() => { exportFlagAnalysis(); setShowExportMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                        Flag Analysis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filter Controls */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Analytics Filters</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
              </button>
            </div>
          </div>
          <div className="p-6">
            {/* Basic Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
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

              <div>
                <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search-query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors, flags..."
                  className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedVendor('all');
                    setDateRange('all');
                    setSearchQuery('');
                    setLinkStatusFilter('all');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Link Status
                    </label>
                    <select
                      id="status-filter"
                      value={linkStatusFilter}
                      onChange={(e) => setLinkStatusFilter(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="all">All Statuses</option>
                      <option value="UNUSED">Unused</option>
                      <option value="CLICKED">Clicked</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DISQUALIFIED">Disqualified</option>
                      <option value="QUOTA_FULL">Quota Full</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quick Stats
                    </label>
                    <div className="text-sm text-gray-600">
                      <div>Total Links: {vendors.reduce((sum, v) => sum + (v.stats?.total || 0), 0)}</div>
                      <div>Completion Rate: {
                        (() => {
                          const total = vendors.reduce((sum, v) => sum + (v.stats?.total || 0), 0);
                          const completed = vendors.reduce((sum, v) => sum + (v.stats?.completed || 0), 0);
                          return total > 0 ? Math.round((completed / total) * 100) : 0;
                        })()
                      }%</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Performance Metrics
                    </label>
                    <div className="text-sm text-gray-600">
                      <div>Flags: {vendors.reduce((sum, v) => sum + (v.stats?.flagged || 0), 0)}</div>
                      <div>Active Vendors: {vendors.filter(v => (v.stats?.total || 0) > 0).length}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}        {/* Tab Navigation */}
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
              onClick={() => setActiveTab('flags')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'flags' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flags ({filteredFlags.length})
            </button>
            <button
              onClick={() => setActiveTab('qc')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'qc' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quality Control
            </button>
            <button
              onClick={() => setActiveTab('comprehensive')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'comprehensive' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Advanced Analytics
            </button>
            <button
              onClick={() => setActiveTab('rawdata')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'rawdata' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Raw Data
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
                      const completed = statusData.datasets[0].data[2];
                      return total > 0 ? Math.round((completed / total) * 100) : 0;
                    })()}%
                  </div>
                  <p className="text-green-100 mt-2">
                    {statusData.datasets[0].data[2]} of {statusData.datasets[0].data.reduce((a, b) => a + b, 0)} links completed
                  </p>
                </div>
                
                {/* Flag Rate Card */}
                <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">Flag Rate</h3>
                  <div className="text-4xl font-bold">
                    {(() => {
                      const total = statusData.datasets[0].data.reduce((a, b) => a + b, 0);
                      const flagged = statusData.datasets[0].data[3] + statusData.datasets[0].data[4];
                      return total > 0 ? Math.round((flagged / total) * 100) : 0;
                    })()}%
                  </div>
                  <p className="text-red-100 mt-2">
                    {statusData.datasets[0].data[3] + statusData.datasets[0].data[4]} of {statusData.datasets[0].data.reduce((a, b) => a + b, 0)} links flagged
                  </p>
                </div>
                
                {/* Quality Score Card */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-semibold mb-2">Quality Score</h3>
                  <div className="text-4xl font-bold">
                    {(() => {
                      const completed = statusData.datasets[0].data[2];
                      const flagged = statusData.datasets[0].data[3] + statusData.datasets[0].data[4];
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
                        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) + 0.00001) : 0;
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





        {activeTab === 'comprehensive' && (
          <div className="space-y-8">
            <ComprehensiveAnalyticsDashboard projectId={projectId} projectName={projectName} />
          </div>
        )}

        {activeTab === 'rawdata' && (
          <div className="space-y-8">
            {/* Raw Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Raw Survey Link Data</h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => window.open(`/api/projects/${projectId}/export?format=csv`, '_blank')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('uid')}
                      >
                        UID {rawDataSortField === 'uid' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('wrappedUrl')}
                      >
                        Wrapped URL {rawDataSortField === 'wrappedUrl' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('originalUrl')}
                      >
                        Original URL {rawDataSortField === 'originalUrl' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        Status {rawDataSortField === 'status' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('linkType')}
                      >
                        Type {rawDataSortField === 'linkType' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('vendorName')}
                      >
                        Vendor {rawDataSortField === 'vendorName' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        Created {rawDataSortField === 'createdAt' && (rawDataSortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QC Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Presurvey
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Security Flags
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rawDataLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {link.uid}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            <a 
                              href={link.wrappedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {link.wrappedUrl}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            <a 
                              href={link.originalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {link.originalUrl}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            link.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            link.status === 'CLICKED' ? 'bg-yellow-100 text-yellow-800' :
                            link.status === 'UNUSED' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {link.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            link.linkType === 'TEST' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {link.linkType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {link.vendorName || 'No Vendor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(link.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            try {
                              const metadata = link.metadata ? JSON.parse(link.metadata) : {};
                              
                              // Priority order: consent geo data > general geo data > geoData field
                              return metadata?.consent?.geoLocation?.country || 
                                     metadata?.geoLocation?.country || 
                                     metadata?.ip_location?.country || 
                                     metadata?.country || 
                                     (link.geoData && typeof link.geoData === 'object' ? 
                                       (typeof link.geoData === 'string' ? JSON.parse(link.geoData).country : link.geoData.country) : 
                                       null) ||
                                     'Unknown';
                            } catch {
                              return 'Unknown';
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            try {
                              const metadata = link.metadata ? JSON.parse(link.metadata) : {};
                              const qcScore = metadata?.qcAnalysis?.score || 
                                            metadata?.qualityScore || 
                                            metadata?.dataQualityScore;
                              if (qcScore !== undefined) {
                                return (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    qcScore >= 80 ? 'bg-green-100 text-green-800' :
                                    qcScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {qcScore}
                                  </span>
                                );
                              }
                              return '-';
                            } catch {
                              return '-';
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            try {
                              const metadata = link.metadata ? JSON.parse(link.metadata) : {};
                              const presurveyCompleted = metadata?.presurveyCompleted || false;
                              const qualified = metadata?.presurveyQualified || metadata?.isQualified;
                              
                              if (presurveyCompleted) {
                                return (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {qualified ? 'Qualified' : 'Disqualified'}
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Pending
                                </span>
                              );
                            } catch {
                              return '-';
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            try {
                              const metadata = link.metadata ? JSON.parse(link.metadata) : {};
                              const qcFlags = metadata?.qcAnalysis?.flags || [];
                              const securityFlags = metadata?.securityFlags || [];
                              const generalFlags = metadata?.flags || [];
                              const vpnDetected = metadata?.vpnDetected || 
                                                metadata?.securityContext?.vpnDetection?.isVPN ||
                                                metadata?.consent?.geoLocation?.isVPN;
                              
                              const allFlags = [...qcFlags, ...securityFlags, ...generalFlags];
                              if (vpnDetected) allFlags.push('VPN');
                              
                              if (allFlags.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {allFlags.slice(0, 2).map((flag, index) => (
                                      <span key={index} className="inline-flex px-1 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                        {flag}
                                      </span>
                                    ))}
                                    {allFlags.length > 2 && (
                                      <span className="text-xs text-gray-500">+{allFlags.length - 2}</span>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Clean
                                </span>
                              );
                            } catch {
                              return '-';
                            }
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setRawDataCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={rawDataCurrentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setRawDataCurrentPage(prev => prev + 1)}
                    disabled={rawDataLinks.length < rawDataPageSize}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{rawDataCurrentPage}</span> of survey links
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setRawDataCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={rawDataCurrentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Page {rawDataCurrentPage}
                      </span>
                      <button
                        onClick={() => setRawDataCurrentPage(prev => prev + 1)}
                        disabled={rawDataLinks.length < rawDataPageSize}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Quality Control Tab */}
        {activeTab === 'qc' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Quality Control Dashboard</h2>
              <p className="mt-1 text-sm text-gray-500">
                Comprehensive quality assurance and fraud detection for survey responses
              </p>
            </div>
            <div className="p-6">
              <QCDashboard projectId={projectId} />
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}

// Main page component that fetches data and passes to ProjectAnalyticsComponent
export default function ProjectAnalyticsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [projectData, setProjectData] = useState<{
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
      testDisqualified: number;
      liveDisqualified: number;
      testFlagged: number;
      liveFlagged: number;
    };
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        const amplifyDataService = await getAmplifyDataService();
        
        // Fetch project using the correct API method
        const projectResult = await amplifyDataService.projects.get(id as string);
        if (!projectResult.data) {
          throw new Error('Project not found');
        }
        const project = projectResult.data;

        // Fetch project vendors using the correct API method
        const vendorsResult = await amplifyDataService.vendors.listByProject(id as string);
        const vendors: Vendor[] = vendorsResult.data?.map((vendor: any) => {
          // Get vendor code from settings
          let code = '';
          try {
            const settings = vendor.settings ? JSON.parse(vendor.settings) : {};
            code = settings.code || '';
          } catch (e) {
            code = '';
          }
          return {
            id: vendor.id,
            name: vendor.name,
            code
          };
        }) || [];

        // Fetch survey links for this project using the correct API method
        const linksResult = await amplifyDataService.surveyLinks.listByProject(id as string);
        const links: any[] = linksResult.data || [];

        // Calculate vendor statistics
        const vendorsWithStats = vendors.map(vendor => {
          const vendorLinks = links.filter((link: any) => link.vendorId === vendor.id);
          const stats = {
            total: vendorLinks.length,
            pending: vendorLinks.filter((link: any) => link.status === 'UNUSED').length,
            started: vendorLinks.filter((link: any) => link.status === 'CLICKED').length,
            inProgress: vendorLinks.filter((link: any) => link.status === 'CLICKED').length,
            completed: vendorLinks.filter((link: any) => link.status === 'COMPLETED').length,
            flagged: vendorLinks.filter((link: any) => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)).length
          };
          return { ...vendor, stats };
        });

        // Generate mock flags data (in a real app, this would come from a flags table)
        const flags: Flag[] = links
          .filter((link: any) => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status))
          .slice(0, 100) // Limit to recent flags
          .map((link: any) => {
            const vendor = vendors.find(v => v.id === link.vendorId);
            let linkType = 'LIVE';
            try {
              const metadata = link.metadata ? JSON.parse(link.metadata) : {};
              linkType = metadata.linkType || 'LIVE';
            } catch (e) {
              linkType = 'LIVE';
            }
            
            return {
              id: link.id,
              reason: link.status === 'DISQUALIFIED' ? 'Failed validation checks' : 'Quota reached',
              createdAt: link.updatedAt || link.createdAt,
              vendorName: vendor?.name,
              linkType
            };
          });

        // Extract real geographical data from survey link metadata
        const geoData: GeoData[] = extractGeographicData(links);

        // Calculate link type data
        const testLinks = links.filter((link: any) => {
          try {
            const metadata = link.metadata ? JSON.parse(link.metadata) : {};
            return metadata.linkType === 'TEST';
          } catch (e) {
            return false;
          }
        });
        
        const liveLinks = links.filter((link: any) => {
          try {
            const metadata = link.metadata ? JSON.parse(link.metadata) : {};
            return metadata.linkType !== 'TEST'; // Default to LIVE
          } catch (e) {
            return true; // Default to LIVE
          }
        });

        const linkTypeData = {
          test: testLinks.length,
          live: liveLinks.length,
          testCompleted: testLinks.filter((link: any) => link.status === 'COMPLETED').length,
          liveCompleted: liveLinks.filter((link: any) => link.status === 'COMPLETED').length,
          testDisqualified: testLinks.filter((link: any) => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)).length,
          liveDisqualified: liveLinks.filter((link: any) => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)).length,
          testFlagged: testLinks.filter((link: any) => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)).length,
          liveFlagged: liveLinks.filter(link => ['DISQUALIFIED', 'QUOTA_FULL'].includes(link.status)).length
        };

        setProjectData({
          projectId: project.id,
          projectName: project.name,
          vendors: vendorsWithStats,
          flags,
          geoData,
          linkTypeData
        });

      } catch (err: any) {
        console.error('Error loading analytics data:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Error state
  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <button 
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Project data not found
  if (!projectData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Project Not Found</h1>
            <p className="text-gray-700 mb-6">The project analytics data could not be loaded.</p>
            <button 
              onClick={() => router.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Render the analytics component with data
  return (
    <ProjectAnalyticsComponent
      projectId={projectData.projectId}
      projectName={projectData.projectName}
      vendors={projectData.vendors}
      flags={projectData.flags}
      geoData={projectData.geoData}
      linkTypeData={projectData.linkTypeData}
    />
  );
}

export async function getServerSideProps() {
  // All data fetching is now client-side. Do not use amplifyDataService here.
  return { props: {} };
}