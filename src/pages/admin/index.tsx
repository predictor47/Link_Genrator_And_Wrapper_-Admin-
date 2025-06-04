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

// Loading Skeleton Components
const SkeletonCard = () => (
  <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-gray-200/50 p-6 animate-pulse">
    <div className="flex items-center">
      <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
      <div className="ml-5 flex-1">
        <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-300 rounded w-16 mb-3"></div>
        <div className="flex space-x-2">
          <div className="h-5 bg-gray-300 rounded w-12"></div>
          <div className="h-5 bg-gray-300 rounded w-12"></div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonRow = () => (
  <tr className="bg-white/50 backdrop-blur-sm animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
        <div className="ml-4">
          <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-300 rounded-full w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        <div>
          <div className="h-3 bg-gray-300 rounded w-8 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-12"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
        <div className="flex space-x-2">
          <div className="h-4 bg-gray-300 rounded w-8"></div>
          <div className="h-4 bg-gray-300 rounded w-8"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div>
        <div className="h-3 bg-gray-300 rounded w-20 mb-1"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex space-x-2">
        <div className="h-8 bg-gray-300 rounded-lg w-16"></div>
        <div className="h-8 bg-gray-300 rounded-lg w-20"></div>
        <div className="h-8 bg-gray-300 rounded-lg w-16"></div>
      </div>
    </td>
  </tr>
);

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Modern Navigation */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SR</span>
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Survey Research
                    </h1>
                    <p className="text-xs text-gray-500 font-medium">Admin Dashboard</p>
                  </div>
                  <div className="sm:hidden">
                    <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      SR Admin
                    </h1>
                  </div>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-3">
                <Link 
                  href="/admin/projects/new" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Project</span>
                  </span>
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </span>
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
                <div className="px-2 pt-2 pb-3 space-y-2">
                  <Link 
                    href="/admin/projects/new" 
                    className="block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Project</span>
                    </span>
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left text-gray-600 hover:text-gray-800 font-medium py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <span className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="flex-1">{error}</span>
                <button 
                  onClick={() => setError('')}
                  className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Modern Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Projects Card */}
              <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-gray-200/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.totalProjects}</dd>
                        <div className="text-xs text-gray-500 mt-2 space-x-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            Draft: {stats.draftProjects}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                            Live: {stats.liveProjects}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                            Complete: {stats.completeProjects}
                          </span>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Links Card */}
              <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-gray-200/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Links</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.totalLinks.toLocaleString()}</dd>
                        <div className="text-xs text-gray-500 mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${stats.totalLinks > 0 ? (stats.completedLinks / stats.totalLinks) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="mt-1 block">
                            {stats.totalLinks > 0 ? Math.round((stats.completedLinks / stats.totalLinks) * 100) : 0}% completion rate
                          </span>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed Links Card */}
              <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-gray-200/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.completedLinks.toLocaleString()}</dd>
                        <div className="text-xs text-gray-500 mt-2">
                          <CircleProgress 
                            value={stats.completedLinks} 
                            max={stats.totalLinks} 
                            color="#eab308" 
                            size={40}
                            strokeWidth={4}
                          />
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Links Card */}
              <div className="bg-white/70 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-gray-200/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Links</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats.inProgressLinks.toLocaleString()}</dd>
                        <div className="text-xs text-gray-500 mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span>Currently in progress</span>
                          </div>
                        </div>
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
          <div className="bg-white/70 backdrop-blur-sm shadow-lg rounded-2xl mb-8 p-4 sm:p-6 border border-gray-200/50">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700">Filter Projects:</span>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                {['ALL', 'DRAFT', 'LIVE', 'COMPLETE'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 sm:px-4 py-2 text-sm rounded-xl font-medium transition-all duration-200 transform hover:scale-105 flex-shrink-0 ${
                      statusFilter === status
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span className="hidden sm:inline">{status}</span>
                      <span className="sm:hidden">{status === 'ALL' ? 'ALL' : status.charAt(0)}</span>
                      {status !== 'ALL' && stats && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          statusFilter === status ? 'bg-white/20' : 'bg-gray-200'
                        }`}>
                          {status === 'DRAFT' ? stats.draftProjects : 
                           status === 'LIVE' ? stats.liveProjects : 
                           stats.completeProjects}
                        </span>
                      )}
                      {status === 'ALL' && stats && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          statusFilter === status ? 'bg-white/20' : 'bg-gray-200'
                        }`}>
                          {stats.totalProjects}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modern Projects Section */}
          <div className="bg-white/70 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-gray-200/50">
            <div className="px-6 py-6 sm:px-8 border-b border-gray-200/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Projects Overview
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">Manage your research projects and survey campaigns with powerful analytics.</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  <span className="flex items-center space-x-2">
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </span>
                </button>
              </div>
            </div>
            
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {statusFilter === 'ALL' ? 'No projects found' : `No ${statusFilter.toLowerCase()} projects found`}
                </h3>
                <p className="text-gray-500 mb-8">Get started by creating your first research project.</p>
                <Link
                  href="/admin/projects/new"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Your First Project</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200/50">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Links</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200/50">
                    {isLoading ? (
                      // Show loading skeleton rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <SkeletonRow key={index} />
                      ))
                    ) : (
                      filteredProjects.map((project, index) => {
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
                        <tr key={project.id} className={`hover:bg-white/80 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/30' : 'bg-white/10'}`}>
                          <td className="px-6 py-6">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {project.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{project.name}</div>
                                {project.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">{project.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                                project.status === 'LIVE' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' :
                                project.status === 'DRAFT' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300' :
                                project.status === 'COMPLETE' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300' :
                                'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  project.status === 'LIVE' ? 'bg-green-500 animate-pulse' :
                                  project.status === 'DRAFT' ? 'bg-yellow-500' :
                                  project.status === 'COMPLETE' ? 'bg-blue-500' :
                                  'bg-gray-500'
                                }`}></div>
                                {project.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <CircleProgress
                                    value={project.currentCompletions}
                                    max={project.targetCompletions}
                                    color="#10B981"
                                    size={40}
                                    strokeWidth={4}
                                  />
                                  <div className="text-xs">
                                    <div className="font-semibold text-gray-900">
                                      {Math.round((project.currentCompletions / (project.targetCompletions || 1)) * 100)}%
                                    </div>
                                    <div className="text-gray-500">
                                      {project.currentCompletions}/{project.targetCompletions}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-gray-900">{projectStat.total.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">total</span>
                              </div>
                              <div className="flex space-x-3 text-xs">
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                                  ✓ {projectStat.completed}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                  ⟳ {projectStat.inProgress}
                                </span>
                                {projectStat.flagged > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">
                                    ⚠ {projectStat.flagged}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {new Date(project.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(project.createdAt).toLocaleDateString('en-US', {
                                  weekday: 'short'
                                })} at {new Date(project.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              <Link
                                href={`/admin/projects/${project.id}`}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="hidden sm:inline">View</span>
                                <span className="sm:hidden">View Details</span>
                              </Link>
                              
                              {/* Status Update Dropdown */}
                              <select
                                value={project.status}
                                onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value)}
                                className="w-full sm:w-auto text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="DRAFT">Draft</option>
                                <option value="LIVE">Live</option>
                                <option value="COMPLETE">Complete</option>
                              </select>
                              
                              <button
                                onClick={() => confirmDeleteProject(project)}
                                disabled={isDeleting === project.id}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                {isDeleting === project.id ? (
                                  <>
                                    <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    <span className="hidden sm:inline">Deleting...</span>
                                    <span className="sm:hidden">Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="hidden sm:inline">Delete</span>
                                    <span className="sm:hidden">Delete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>                        );
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && projectToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-2xl rounded-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Project</h3>
                <p className="text-center text-gray-600 mb-4">
                  Are you sure you want to permanently delete <span className="font-semibold text-gray-900">"{projectToDelete.name}"</span>?
                </p>
                
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6">
                  <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This will permanently remove:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                      All survey links
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                      All questions and responses
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                      All vendor relationships
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                      All analytics and statistics
                    </li>
                  </ul>
                  <p className="text-sm font-semibold text-red-800 mt-3 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This action cannot be undone
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setProjectToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={isDeleting !== null}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Project
                      </>
                    )}
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