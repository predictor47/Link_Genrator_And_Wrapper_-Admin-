import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { amplifyDataService } from '@/lib/amplify-data-service';
import axios from 'axios';
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

export default function ProjectView({ project }: { project: ProjectData | null }) {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('stats');
  const [newVendor, setNewVendor] = useState({ name: '', code: '' });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle the "new" path by redirecting to the proper new project page
  useEffect(() => {
    if (id === 'new') {
      router.replace('/admin/projects/new');
    }
  }, [id, router]);

  // Handle case when project is not found
  if (!project) {
    return (
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
    );
  }
  
  // Calculate percentages for circular progress bars
  const totalLinks = project.stats.total;
  const pendingPercentage = totalLinks > 0 ? (project.stats.pending / totalLinks) * 100 : 0;
  const startedPercentage = totalLinks > 0 ? (project.stats.started / totalLinks) * 100 : 0;
  const inProgressPercentage = totalLinks > 0 ? (project.stats.inProgress / totalLinks) * 100 : 0;
  const completedPercentage = totalLinks > 0 ? (project.stats.completed / totalLinks) * 100 : 0;
  const flaggedPercentage = totalLinks > 0 ? (project.stats.flagged / totalLinks) * 100 : 0;

  // Fetch vendors when component mounts or when project changes
  useEffect(() => {
    if (project) {
      fetchVendors();
    }
  }, [project?.id]);

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`/api/vendors/list?projectId=${project.id}`);
      if (response.data.success) {
        setVendors(response.data.vendors);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to fetch vendors');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/vendors/create', {
        name: newVendor.name,
        code: newVendor.code,
        projectId: project.id
      });

      if (response.data.success) {
        setNewVendor({ name: '', code: '' });
        setSuccess('Vendor created successfully');
        fetchVendors();
      }
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      setError(error.response?.data?.message || 'Failed to create vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.delete(`/api/vendors/delete?id=${vendorId}`);
      
      if (response.data.success) {
        setSuccess('Vendor deleted successfully');
        fetchVendors();
      }
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      setError(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

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
                  Generate Links
                </Link>
                <button
                  onClick={() => router.push(`/admin`)}
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
              Survey Links
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
                    value={project.stats.total} 
                    max={project.stats.total} 
                    color="#6366F1" 
                    label="Total Links" 
                    percentage={100} 
                  />
                  <CircleProgress 
                    value={project.stats.pending} 
                    max={project.stats.total} 
                    color="#3B82F6" 
                    label="Pending" 
                    percentage={pendingPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats.started} 
                    max={project.stats.total} 
                    color="#10B981" 
                    label="Started" 
                    percentage={startedPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats.inProgress} 
                    max={project.stats.total} 
                    color="#F59E0B" 
                    label="In Progress" 
                    percentage={inProgressPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats.completed} 
                    max={project.stats.total} 
                    color="#059669" 
                    label="Completed" 
                    percentage={completedPercentage} 
                  />
                  <CircleProgress 
                    value={project.stats.flagged} 
                    max={project.stats.total} 
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
              {project.questions.length > 0 ? (
                <div className="space-y-6">
                  {project.questions.map((question, index) => {
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
              <h2 className="text-xl font-semibold text-gray-800">Survey Links</h2>
            </div>
            <div className="p-6">
              <Link
                href={`/admin/projects/${project.id}/generate`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Generate New Links
              </Link>
            </div>
          </div>
        )}
      </div>
      </div>
    </ProtectedRoute>
  );
}

export async function getServerSideProps({ params }: { params: { id: string } }) {
  const { id } = params;

  // Special handling for "new" path - we don't need to fetch data in this case
  if (id === 'new') {
    return {
      redirect: {
        destination: '/admin/projects/new',
        permanent: false,
      },
    };
  }

  try {
    // Fetch project data using Amplify Data Service
    const projectResult = await amplifyDataService.projects.get(id);
    const project = projectResult.data;

    if (!project) {
      return { props: { project: null } };
    }

    // Get questions for this project
    const questionsResult = await amplifyDataService.questions.listByProject(id);
    const questions = questionsResult.data || [];

    // Get vendors for this project
    const vendorsResult = await amplifyDataService.vendors.listByProject(id);
    const vendors = vendorsResult.data || [];

    // Get survey links for this project
    const surveyLinksResult = await amplifyDataService.surveyLinks.listByProject(id);
    const surveyLinks = surveyLinksResult.data || [];    // Flags model no longer exists, so we use an empty array
    // const flagsResult = await amplifyDataService.flags.list({
    //   filter: { projectId: { eq: id } }
    // });
    const flags: any[] = [];

    // Initialize stats
    const stats = {
      total: surveyLinks.length,
      pending: 0,
      started: 0,
      inProgress: 0,
      completed: 0,
      flagged: 0
    };    // Calculate stats from survey links using the new status enum
    surveyLinks.forEach(link => {
      switch (link.status) {
        case 'UNUSED':
          stats.pending++;
          break;
        case 'CLICKED':
          // Map both started and inProgress to CLICKED since we don't have separate statuses anymore
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

    // Add flags count if not already counted in status
    if (flags.length > stats.flagged) {
      stats.flagged = flags.length;
    }

    return {
      props: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options // This is already a string in your schema
          })),          vendors: vendors
            .filter(v => v !== null)
            .map(v => {
              // Create a vendor object with only the properties that exist in the schema
              return {
                id: v.id,
                name: v.name || 'Unknown Vendor',
                // code is not in the schema anymore, but we need it for backwards compatibility
                // We'll use the vendor id as the code if needed
                code: (v as any).code || v.id.substring(0, 8),
                createdAt: v.createdAt || new Date().toISOString()
              };
            }),
          stats
        }
      }
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    return {
      props: { project: null }
    };
  }
}