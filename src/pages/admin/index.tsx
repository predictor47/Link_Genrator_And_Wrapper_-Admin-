import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/lib/protected-route';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
import StatusAnalytics from '@/components/StatusAnalytics';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  targetCompletions: number;
  currentCompletions: number;
  createdAt: string;
  updatedAt: string;
}

interface SurveyLink {
  id: string;
  projectId: string;
  status: string;
}

interface Stats {
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
}

interface ProjectStats {
  [projectId: string]: {
    pending: number;
    started: number;
    inProgress: number;
    completed: number;
    flagged: number;
    total: number;
  };
}

// CircleProgress component for better UI visualization
const CircleProgress = ({ value, max, color, size = 60, strokeWidth = 6 }: { 
  value: number, 
  max: number, 
  color: string,
  size?: number,
  strokeWidth?: number
}) => {
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / (max || 1)) * circumference;

  return (
    <div className="relative inline-flex">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth={strokeWidth} 
        />
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={radius} 
          fill="none" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {value}/{max}
      </span>
    </div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Fetch all data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter projects when statusFilter changes
  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(project => project.status === statusFilter));
    }
  }, [projects, statusFilter]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const amplifyDataService = await getAmplifyDataService();
      
      // Fetch projects
      const projectsResult = await amplifyDataService.projects.list();
      const projectsData = projectsResult.data || [];
      
      // Transform projects to match our interface
      const transformedProjects = projectsData.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status || 'DRAFT',
        targetCompletions: project.targetCompletions || 0,
        currentCompletions: project.currentCompletions || 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
      
      setProjects(transformedProjects);

      // Fetch survey links to calculate stats
      const linksResult = await amplifyDataService.surveyLinks.list();
      const linksData = linksResult.data || [];

      // Calculate overall stats
      const totalProjects = transformedProjects.length;
      const draftProjects = transformedProjects.filter((p: any) => p.status === 'DRAFT').length;
      const liveProjects = transformedProjects.filter((p: any) => p.status === 'LIVE').length;
      const completeProjects = transformedProjects.filter((p: any) => p.status === 'COMPLETE').length;
      
      const totalLinks = linksData.length;
      const pendingLinks = linksData.filter((link: any) => link.status === 'UNUSED').length;
      const startedLinks = linksData.filter((link: any) => link.status === 'CLICKED').length;
      const inProgressLinks = linksData.filter((link: any) => link.status === 'IN_PROGRESS').length;
      const completedLinks = linksData.filter((link: any) => link.status === 'COMPLETED').length;
      const flaggedLinks = linksData.filter((link: any) => link.status === 'DISQUALIFIED').length;

      setStats({
        totalProjects,
        draftProjects,
        liveProjects,
        completeProjects,
        totalLinks,
        pendingLinks,
        startedLinks,
        inProgressLinks,
        completedLinks,
        flaggedLinks
      });

      // Calculate per-project stats
      const projectStatsMap: ProjectStats = {};
      transformedProjects.forEach((project: Project) => {
        const projectLinks = linksData.filter((link: any) => link.projectId === project.id);
        projectStatsMap[project.id] = {
          pending: projectLinks.filter((link: any) => link.status === 'UNUSED').length,
          started: projectLinks.filter((link: any) => link.status === 'CLICKED').length,
          inProgress: projectLinks.filter((link: any) => link.status === 'IN_PROGRESS').length,
          completed: projectLinks.filter((link: any) => link.status === 'COMPLETED').length,
          flagged: projectLinks.filter((link: any) => link.status === 'DISQUALIFIED').length,
          total: projectLinks.length
        };
      });
      setProjectStats(projectStatsMap);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setIsDeleting(projectToDelete.id);
      const amplifyDataService = await getAmplifyDataService();
      
      // Use cascading delete to remove all related data
      const deleteResult = await amplifyDataService.projects.deleteWithCascade(projectToDelete.id);
      
      if (deleteResult.data) {
        console.log('Project deleted successfully with cascading deletion:', deleteResult.deletedRelatedData);
      }
      
      // Refresh the dashboard data
      await fetchDashboardData();
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const amplifyDataService = await getAmplifyDataService();
      await amplifyDataService.projects.update(projectId, { status: newStatus });
      
      // Update local state
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, status: newStatus }
            : project
        )
      );
      
      // Refresh stats
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error updating project status:', error);
      setError('Failed to update project status. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Import auth service dynamically to avoid SSR issues
      const { AuthService } = await import('@/lib/auth-service');
      await AuthService.signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  href="/admin/projects/new" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Create Project
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-gray-600 hover:text-gray-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
              <button 
                onClick={() => setError('')}
                className="ml-4 text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">P</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalProjects}</dd>
                        <div className="text-xs text-gray-500 mt-1">
                          Draft: {stats.draftProjects} | Live: {stats.liveProjects} | Complete: {stats.completeProjects}
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">L</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Links</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalLinks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">C</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.completedLinks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Links</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.inProgressLinks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Status Analytics */}
          {stats && (
            <StatusAnalytics 
              stats={stats}
              onStatusFilter={setStatusFilter}
              currentFilter={statusFilter}
            />
          )}

          {/* Status Filter Controls */}
          <div className="bg-white shadow rounded-lg mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
              <div className="flex gap-2">
                {['ALL', 'DRAFT', 'LIVE', 'COMPLETE'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                    {status !== 'ALL' && stats && (
                      <span className="ml-1 text-xs">
                        ({status === 'DRAFT' ? stats.draftProjects : 
                          status === 'LIVE' ? stats.liveProjects : 
                          stats.completeProjects})
                      </span>
                    )}
                    {status === 'ALL' && stats && (
                      <span className="ml-1 text-xs">({stats.totalProjects})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Projects</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your research projects and survey campaigns.</p>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">
                  {statusFilter === 'ALL' ? 'No projects found' : `No ${statusFilter.toLowerCase()} projects found`}
                </p>
                <Link
                  href="/admin/projects/new"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Create Your First Project
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => {
                      // Get project stats
                      const projectStat = projectStats[project.id] || {
                        pending: 0,
                        started: 0,
                        inProgress: 0,
                        completed: 0,
                        flagged: 0,
                        total: 0
                      };
                      
                      return (
                        <tr key={project.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{project.name}</div>
                              {project.description && (
                                <div className="text-sm text-gray-500">{project.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              project.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                              project.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                              project.status === 'COMPLETE' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CircleProgress
                                value={project.currentCompletions}
                                max={project.targetCompletions}
                                color="#10B981"
                                size={40}
                                strokeWidth={4}
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {Math.round((project.currentCompletions / (project.targetCompletions || 1)) * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-medium">{projectStat.total}</span>
                              <span className="text-xs text-gray-500">
                                {projectStat.completed} completed
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/admin/projects/${project.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                              
                              {/* Status Update Dropdown */}
                              <select
                                value={project.status}
                                onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="DRAFT">Draft</option>
                                <option value="LIVE">Live</option>
                                <option value="COMPLETE">Complete</option>
                              </select>
                              
                              <button
                                onClick={() => confirmDeleteProject(project)}
                                disabled={isDeleting === project.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {isDeleting === project.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && projectToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete project "{projectToDelete.name}"? This action will permanently remove the project and all associated data including:
                  </p>
                  <ul className="text-sm text-gray-500 mt-2 list-disc list-inside">
                    <li>All survey links</li>
                    <li>All questions</li>
                    <li>All vendor relationships</li>
                    <li>All associated statistics</li>
                  </ul>
                  <p className="text-sm text-red-600 mt-2 font-medium">This action cannot be undone.</p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setProjectToDelete(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={isDeleting !== null}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export async function getServerSideProps() {
  // All data fetching is now client-side
  return { props: {} };
}