import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
import ProtectedRoute from '@/lib/protected-route';

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

  const fetchVendors = async () => {
    if (!project) return;
    try {
      const amplifyDataService = await getAmplifyDataService();
      const response = await amplifyDataService.vendors.listByProject(project.id);
      const safeVendors = (response.data || []).map((v: any) => ({
        id: v.id,
        name: v.name || 'Unknown Vendor',
        code: v.code || (v.id ? v.id.substring(0, 8) : ''),
        createdAt: v.createdAt || new Date().toISOString()
      }));
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
      await amplifyDataService.vendors.create({
        name: newVendor.name,
        code: newVendor.code,
        projectId: project.id
      });
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
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'stats' && (
          <>
            {/* Project Stats with Circular Progress Bars */}
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Project Statistics</h2>
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
          /* Link Management */
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Wrapper Link Generation</h2>
              <p className="text-sm text-gray-600 mt-1">Create secure wrapper links with bot protection, geolocking, and completion tracking</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                  href={`/admin/projects/${project.id}/generate`}
                  className="block p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold">Generate Wrapper Links</h3>
                      <p className="text-blue-100 text-sm">Create live/test links with CSV upload</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href={`/admin/projects/${project.id}/analytics`}
                  className="block p-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg text-white hover:from-green-600 hover:to-green-700 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold">Analytics & Tracking</h3>
                      <p className="text-green-100 text-sm">View completion rates and link performance</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Wrapper Link Features:</h4>
                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                  <li>Bot protection and security verification</li>
                  <li>Geolocking and country restrictions</li>
                  <li>Real-time completion tracking via iframe monitoring</li>
                  <li>CSV bulk upload for multiple URLs</li>
                  <li>Vendor-specific link generation</li>
                  <li>Live and test link variants</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}
