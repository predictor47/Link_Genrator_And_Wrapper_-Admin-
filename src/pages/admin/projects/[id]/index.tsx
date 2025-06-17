import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
import ProtectedRoute from '@/lib/protected-route';
import { ComprehensiveAnalyticsView } from '@/components/ComprehensiveAnalyticsView';

// Define proper types based on your Amplify data schema
interface Question {
  id: string;
  text: string;
  options: string;
}

interface ProjectStats {
  total: number;
  pending: number;
  started: number;
  inProgress: number;
  completed: number;
  flagged: number;
}

interface Vendor {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  questions: Question[];
  stats: ProjectStats;
  vendors: Vendor[];
}

// CircleProgress component for better UI visualization
const CircleProgress = ({ value, max, color, label, percentage }: { 
  value: number, 
  max: number, 
  color: string,
  label: string,
  percentage: number
}) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            stroke="#e5e7eb" 
            strokeWidth="10" 
          />
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            stroke={color} 
            strokeWidth="10" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <text 
            x="60"
            y="65" 
            textAnchor="middle" 
            fontSize="18" 
            fontWeight="bold" 
            fill="#374151"
          >
            {value}
          </text>
        </svg>
      </div>
      <div className="text-sm font-medium text-gray-600 mt-2">{label}</div>
    </div>
  );
}

// LinksTab component for comprehensive link management
interface SurveyLink {
  id: string;
  uid: string;
  status: string;
  vendorId?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
  clickedAt?: string;
  completedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  geoData?: any;
}

interface LinksTabProps {
  projectId: string;
}

const LinksTab = ({ projectId }: LinksTabProps) => {
  const [links, setLinks] = useState<SurveyLink[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [linkTypeFilter, setLinkTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [linksPerPage] = useState(50);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch links and vendors
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const amplifyDataService = await getAmplifyDataService();
        
        // Fetch all survey links for this project
        const linksResult = await amplifyDataService.surveyLinks.listByProject(projectId);
        const linksData = linksResult.data || [];
        
        // Fetch vendors for this project
        const vendorsResult = await amplifyDataService.vendors.listByProject(projectId);
        const vendorsData = vendorsResult.data || [];
        
        setLinks(linksData);
        setVendors(vendorsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load links');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, refreshTrigger]); // Added refreshTrigger to dependency array

  // Function to manually refresh the links
  const refreshLinks = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Helper function to get vendor name
  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return 'No Vendor';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'Unknown Vendor';
  };

  // Helper function to parse metadata
  const parseMetadata = (metadata?: string) => {
    try {
      return metadata ? JSON.parse(metadata) : {};
    } catch {
      return {};
    }
  };

  // Helper function to get link type from metadata
  const getLinkType = (metadata?: string) => {
    const parsed = parseMetadata(metadata);
    return parsed.linkType || 'UNKNOWN';
  };

  // Helper function to get original URL from metadata
  const getOriginalUrl = (metadata?: string) => {
    const parsed = parseMetadata(metadata);
    return parsed.originalUrl || '';
  };

  // Helper function to get geo restrictions
  const getGeoRestrictions = (metadata?: string) => {
    const parsed = parseMetadata(metadata);
    return parsed.geoRestriction || [];
  };

  // Filter links based on search and filters
  const filteredLinks = links.filter(link => {
    const matchesSearch = searchTerm === '' || 
      link.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOriginalUrl(link.metadata).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVendorName(link.vendorId).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || link.status === statusFilter;
    const matchesVendor = vendorFilter === 'ALL' || link.vendorId === vendorFilter;
    const matchesLinkType = linkTypeFilter === 'ALL' || getLinkType(link.metadata) === linkTypeFilter;

    return matchesSearch && matchesStatus && matchesVendor && matchesLinkType;
  });

  // Pagination
  const totalLinks = filteredLinks.length;
  const totalPages = Math.ceil(totalLinks / linksPerPage);
  const startIndex = (currentPage - 1) * linksPerPage;
  const endIndex = startIndex + linksPerPage;
  const currentLinks = filteredLinks.slice(startIndex, endIndex);

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Export links to CSV
  const exportToCSV = () => {
    const headers = [
      'UID',
      'Status',
      'Link Type',
      'Vendor',
      'Original URL',
      'Geo Restrictions',
      'Created At',
      'Clicked At',
      'Completed At',
      'IP Address',
      'User Agent'
    ];

    const csvData = filteredLinks.map(link => [
      link.uid,
      link.status,
      getLinkType(link.metadata),
      getVendorName(link.vendorId),
      getOriginalUrl(link.metadata),
      getGeoRestrictions(link.metadata).join('; '),
      new Date(link.createdAt).toLocaleString(),
      link.clickedAt ? new Date(link.clickedAt).toLocaleString() : '',
      link.completedAt ? new Date(link.completedAt).toLocaleString() : '',
      link.ipAddress || '',
      link.userAgent || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${projectId}_links_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNUSED': return 'bg-gray-100 text-gray-800';
      case 'CLICKED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'DISQUALIFIED': return 'bg-red-100 text-red-800';
      case 'QUOTA_FULL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Loading links...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Generated Links</h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalLinks} total links • {filteredLinks.filter(l => l.status === 'COMPLETED').length} completed
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/admin/projects/${projectId}/generate`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Generate More Links
            </Link>
            <button
              onClick={refreshLinks}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={exportToCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search by UID, URL, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNUSED">Unused</option>
              <option value="CLICKED">Clicked</option>
              <option value="COMPLETED">Completed</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="QUOTA_FULL">Quota Full</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Vendors</option>
              <option value="">No Vendor</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Link Type Filter */}
          <div>
            <select
              value={linkTypeFilter}
              onChange={(e) => setLinkTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="TEST">Test Links</option>
              <option value="LIVE">Live Links</option>
            </select>
          </div>
        </div>
      </div>

      {/* Links Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLinks.map((link) => {
              const linkType = getLinkType(link.metadata);
              const originalUrl = getOriginalUrl(link.metadata);
              const geoRestrictions = getGeoRestrictions(link.metadata);
              const fullUrl = `${window.location.origin}/s/${projectId}/${link.uid}`;

              return (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {link.uid}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs" title={originalUrl}>
                        {originalUrl}
                      </div>
                      {geoRestrictions.length > 0 && (
                        <div className="text-xs text-blue-600">
                          Geo: {geoRestrictions.join(', ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(link.status)}`}>
                      {link.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      linkType === 'TEST' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {linkType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getVendorName(link.vendorId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {link.completedAt ? `Completed ${new Date(link.completedAt).toLocaleDateString()}` :
                     link.clickedAt ? `Clicked ${new Date(link.clickedAt).toLocaleDateString()}` :
                     'No activity'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => copyToClipboard(fullUrl)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Copy link"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-900"
                        title="Open link"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, totalLinks)} of {totalLinks} links
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredLinks.length === 0 && (
        <div className="px-6 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No links found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {links.length === 0 
              ? "No links have been generated for this project yet."
              : "No links match your current filters."}
          </p>
          {links.length === 0 && (
            <div className="mt-6">
              <Link
                href={`/admin/projects/${projectId}/generate`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Your First Links
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ProjectView() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('stats');
  const [newVendor, setNewVendor] = useState({ name: '', code: '' });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch project and related data client-side
  useEffect(() => {
    if (!id || id === 'new') return;
    setIsLoading(true);
    setError('');
    (async () => {
      try {
        const amplifyDataService = await getAmplifyDataService();
        // Fetch project
        const projectResult = await amplifyDataService.projects.get(id as string);
        const projectData = projectResult.data;
        if (!projectData) {
          setProject(null);
          setIsLoading(false);
          return;
        }
        // Fetch questions
        const questionsResult = await amplifyDataService.questions.listByProject(id as string);
        const questions = questionsResult.data || [];
        // Fetch vendors
        const vendorsResult = await amplifyDataService.vendors.listByProject(id as string);
        const vendorsData = (vendorsResult.data || []).map((v: any) => ({
          id: v.id,
          name: v.name || 'Unknown Vendor',
          code: v.code || (v.id ? v.id.substring(0, 8) : ''),
          createdAt: v.createdAt || new Date().toISOString()
        }));
        setVendors(vendorsData);
        // Fetch survey links
        const surveyLinksResult = await amplifyDataService.surveyLinks.listByProject(id as string);
        const surveyLinks = surveyLinksResult.data || [];
        // Calculate stats
        const stats = {
          total: surveyLinks.length,
          pending: 0,
          started: 0,
          inProgress: 0,
          completed: 0,
          flagged: 0
        };
        surveyLinks.forEach((link: any) => {
          switch (link.status) {
            case 'UNUSED':
              stats.pending++;
              break;
            case 'CLICKED':
              stats.started++;
              stats.inProgress++;
              break;
            case 'COMPLETED':
              stats.completed++;
              break;
            case 'DISQUALIFIED':
            case 'QUOTA_FULL':
              stats.flagged++;
              break;
          }
        });
        setProject({
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          createdAt: projectData.createdAt,
          questions: questions.map((q: any) => ({
            id: q.id,
            text: q.text,
            options: q.options
          })),
          vendors: vendorsData,
          stats
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  // Fetch vendors when component mounts or when project changes
  useEffect(() => {
    if (project) {
      fetchVendors();
    }
  }, [project?.id]);

  // Add a function to refresh project stats
  const refreshProjectStats = async () => {
    if (!id || id === 'new') return;
    setIsRefreshing(true);
    try {
      const amplifyDataService = await getAmplifyDataService();
      const surveyLinksResult = await amplifyDataService.surveyLinks.listByProject(id as string);
      const surveyLinks = surveyLinksResult.data || [];
      
      // Calculate updated stats
      const stats = {
        total: surveyLinks.length,
        pending: 0,
        started: 0,
        inProgress: 0,
        completed: 0,
        flagged: 0
      };
      
      surveyLinks.forEach((link: any) => {
        switch (link.status) {
          case 'UNUSED':
            stats.pending++;
            break;
          case 'CLICKED':
            stats.started++;
            stats.inProgress++;
            break;
          case 'COMPLETED':
            stats.completed++;
            break;
          case 'DISQUALIFIED':
          case 'QUOTA_FULL':
            stats.flagged++;
            break;
        }
      });
      
      // Update project with new stats
      setProject(prev => prev ? { ...prev, stats } : null);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchVendors = async () => {
    if (!project) return;
    try {
      const amplifyDataService = await getAmplifyDataService();
      const response = await amplifyDataService.vendors.listByProject(project.id);
      const safeVendors = (response.data || []).map((v: any) => {
        // Extract vendor code from settings if it exists
        let vendorCode = '';
        try {
          const settings = v.settings ? JSON.parse(v.settings) : {};
          vendorCode = settings.code || '';
        } catch (e) {
          vendorCode = '';
        }

        return {
          id: v.id,
          name: v.name || 'Unknown Vendor',
          code: vendorCode || (v.id ? v.id.substring(0, 8) : ''),
          createdAt: v.createdAt || new Date().toISOString()
        };
      });
      setVendors(safeVendors);
    } catch (error) {
      setError('Failed to fetch vendors');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    if (!project) {
      setError('Project not loaded');
      setIsLoading(false);
      return;
    }
    try {
      const amplifyDataService = await getAmplifyDataService();
      if (!amplifyDataService || !amplifyDataService.vendors || typeof amplifyDataService.vendors.create !== 'function') {
        setError('Vendor creation service is not available.');
        setIsLoading(false);
        return;
      }
      
      // Create vendor with settings containing the code
      const vendorSettings = JSON.stringify({ code: newVendor.code });
      const vendorResult = await amplifyDataService.vendors.create({
        name: newVendor.name,
        settings: vendorSettings
      });

      if (!vendorResult.data) {
        setError('Failed to create vendor');
        setIsLoading(false);
        return;
      }

      // Create ProjectVendor relationship
      const projectVendorResult = await amplifyDataService.projectVendors.create({
        projectId: project.id,
        vendorId: vendorResult.data.id,
        quota: 0,
        currentCount: 0
      });

      if (!projectVendorResult.data) {
        // If ProjectVendor creation fails, try to clean up the vendor
        await amplifyDataService.vendors.delete(vendorResult.data.id);
        setError('Failed to create project-vendor relationship');
        setIsLoading(false);
        return;
      }

      setNewVendor({ name: '', code: '' });
      setSuccess('Vendor created successfully');
      fetchVendors();
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      setError(error.message || 'Failed to create vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    setError('');
    setSuccess('');
    if (!project) {
      setError('Project not loaded');
      return;
    }
    try {
      const amplifyDataService = await getAmplifyDataService();
      await amplifyDataService.vendors.delete(vendorId);
      setSuccess('Vendor deleted successfully');
      fetchVendors();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      setError(error.message || 'Failed to delete vendor');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    if (!project) {
      setError('Project not loaded');
      setIsLoading(false);
      return;
    }
    try {
      const amplifyDataService = await getAmplifyDataService();
      // Delete all questions
      if (project.questions && project.questions.length > 0) {
        await Promise.all(project.questions.map(q => amplifyDataService.questions.delete(q.id)));
      }
      // Delete all vendors
      if (project.vendors && project.vendors.length > 0) {
        await Promise.all(project.vendors.map(v => amplifyDataService.vendors.delete(v.id)));
      }
      // Delete the project itself
      await amplifyDataService.projects.delete(project.id);
      setSuccess('Project deleted successfully');
      router.push('/admin');
    } catch (error: any) {
      setError(error.message || 'Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the "new" path by redirecting to the proper new project page
  useEffect(() => {
    if (id === 'new') {
      router.replace('/admin/projects/new');
    }
  }, [id, router]);

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
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
            <Link 
              href="/admin" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Project not found state
  if (!project) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Project Not Found</h1>
            <p className="text-gray-700 mb-6">The project you're looking for doesn't exist or has been deleted.</p>
            <Link 
              href="/admin" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }
  
  // Calculate percentages for circular progress bars
  const totalLinks = project.stats?.total ?? 0;
  const pendingPercentage = totalLinks > 0 ? ((project.stats?.pending ?? 0) / totalLinks) * 100 : 0;
  const startedPercentage = totalLinks > 0 ? ((project.stats?.started ?? 0) / totalLinks) * 100 : 0;
  const inProgressPercentage = totalLinks > 0 ? ((project.stats?.inProgress ?? 0) / totalLinks) * 100 : 0;
  const completedPercentage = totalLinks > 0 ? ((project.stats?.completed ?? 0) / totalLinks) * 100 : 0;
  const flaggedPercentage = totalLinks > 0 ? ((project.stats?.flagged ?? 0) / totalLinks) * 100 : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link 
                  href="/admin" 
                  className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 mt-1">{project.description}</p>
                )}
              </div>
              <div className="flex space-x-3">
                <Link 
                  href={`/admin/projects/${project.id}/generate`} 
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Generate Wrapper Links
                </Link>
                <button
                  onClick={handleDeleteProject}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Delete Project
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Created on {new Date(project.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'stats' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'questions' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pre-Survey Questions
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'vendors' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendors
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'links' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Wrapper Links
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'analytics' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'stats' && (
          <>
            {/* Project Stats with Circular Progress Bars */}
            <div className="bg-white shadow rounded-lg mb-8">            {/* Header with refresh button */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Project Statistics</h2>
              <button
                onClick={refreshProjectStats}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isRefreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
              </button>
            </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 justify-items-center">
                  <CircleProgress 
                    value={project.stats?.total ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#6366F1" 
                    label="Total Links" 
                    percentage={100} 
                  />
                  <CircleProgress 
                    value={project.stats?.pending ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#3B82F6" 
                    label="Pending" 
                    percentage={pendingPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats?.started ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#10B981" 
                    label="Started" 
                    percentage={startedPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats?.inProgress ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#F59E0B" 
                    label="In Progress" 
                    percentage={inProgressPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats?.completed ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#059669" 
                    label="Completed" 
                    percentage={completedPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats?.flagged ?? 0} 
                    max={project.stats?.total ?? 0} 
                    color="#EF4444" 
                    label="Flagged" 
                    percentage={flaggedPercentage} 
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'questions' && (
          /* Survey Questions */
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Pre-Survey Questions</h2>
            </div>
            <div className="p-6">
              {project.questions && project.questions.length > 0 ? (
                <div className="space-y-6">
                  {(project.questions ?? []).map((question, index) => {
                    // Parse options from JSON string
                    const options = JSON.parse(question.options || '[]');
                    
                    return (
                      <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900">Question {index + 1}: {question.text}</h3>
                        <div className="mt-2 ml-4">
                          <p className="text-sm text-gray-600">Options:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                            {options.map((option: string, optIndex: number) => (
                              <li key={optIndex}>{option}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">No pre-survey questions have been created for this project.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          /* Vendors Management */
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Vendors</h2>
            </div>
            <div className="p-6">
              {/* Add new vendor form */}
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Vendor</h3>
                
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
                
                <form onSubmit={handleCreateVendor}>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Vendor Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={newVendor.name}
                          onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                          required
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter vendor name"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                        Vendor Code
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="code"
                          id="code"
                          value={newVendor.code}
                          onChange={(e) => setNewVendor({...newVendor, code: e.target.value})}
                          required
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter unique vendor code"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isLoading ? 'Creating...' : 'Create Vendor'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Vendors list */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Vendors</h3>
                
                {vendors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vendors.map((vendor) => (
                          <tr key={vendor.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {vendor.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vendor.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(vendor.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => handleDeleteVendor(vendor.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No vendors have been created for this project.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'links' && (
          <LinksTab projectId={project.id} />
        )}
        
        {activeTab === 'analytics' && (
          <ComprehensiveAnalyticsView projectId={project.id} />
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}
