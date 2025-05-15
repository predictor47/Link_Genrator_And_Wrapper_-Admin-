import { useState, useEffect } from 'react';
import Link from 'next/link';
import { amplifyDataService } from '@/lib/amplify-data-service';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | Date; // Allow both string and Date to handle both API responses and frontend requirements
  _count: {
    surveyLinks: number;
    flags: number;
  };
  stats?: {
    pending: number;
    started: number;
    inProgress: number;
    completed: number;
    flagged: number;
  };
}

interface Stats {
  totalProjects: number;
  totalLinks: number;
  pendingLinks: number;
  startedLinks: number;
  inProgressLinks: number;
  completedLinks: number;
  flaggedLinks: number;
}

interface AdminDashboardProps {
  projects: Project[];
  stats: Stats;
  projectStats: Record<string, { 
    pending: number, 
    started: number,
    inProgress: number,
    completed: number,
    flagged: number
  }>;
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
}

export default function AdminDashboard({ projects: initialProjects, stats: initialStats, projectStats }: AdminDashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Handle project deletion
  const handleDelete = async (projectId: string) => {
    setIsDeleting(projectId);
    setDeleteError(null);
    
    try {
      const response = await axios.delete(`/api/projects/delete?id=${projectId}`);
      
      if (response.data.success) {
        // Remove the project from the list
        const updatedProjects = projects.filter(project => project.id !== projectId);
        setProjects(updatedProjects);
        
        // Update stats
        const projectToRemove = projects.find(project => project.id === projectId);
        if (projectToRemove) {
          setStats(prev => ({
            ...prev,
            totalProjects: prev.totalProjects - 1,
          }));
        }
        
        setShowDeleteModal(false);
      } else {
        setDeleteError('Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteError('An error occurred while deleting the project. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };
  
  // Confirm deletion modal
  const confirmDelete = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };
  
  // Cancel deletion
  const cancelDelete = () => {
    setProjectToDelete(null);
    setShowDeleteModal(false);
    setDeleteError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Survey Link Wrapper Admin</h1>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Overall Stats Cards with Circular Progress */}
        <div className="bg-white shadow rounded-lg mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Overall Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#6366F1" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset="0"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Total Projects</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#6366F1" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset="0"
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalLinks}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Total Links</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset={2 * Math.PI * 40 * (1 - stats.pendingLinks / stats.totalLinks)}
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.pendingLinks}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Pending Links</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset={2 * Math.PI * 40 * (1 - stats.startedLinks / stats.totalLinks)}
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-green-600">{stats.startedLinks}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Started Links</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#059669" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset={2 * Math.PI * 40 * (1 - stats.completedLinks / stats.totalLinks)}
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-green-800">{stats.completedLinks}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Completed Links</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-2">
                <svg className="w-24 h-24">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    fill="none" 
                    stroke="#EF4444" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 40} 
                    strokeDashoffset={2 * Math.PI * 40 * (1 - stats.flaggedLinks / stats.totalLinks)}
                    transform="rotate(-90 48 48)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-red-600">{stats.flaggedLinks}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500">Flagged Links</div>
            </div>
          </div>
        </div>

        {/* Projects Section with Project-Level Stats */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Your Projects</h2>
            <Link 
              href="/admin/projects/new" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Create New Project
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status Distribution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => {
                  // Get project stats
                  const projectStat = projectStats[project.id] || {
                    pending: 0,
                    started: 0,
                    inProgress: 0,
                    completed: 0,
                    flagged: 0
                  };
                  
                  const totalLinks = project._count.surveyLinks;
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project._count.surveyLinks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center space-x-1">
                          {totalLinks > 0 ? (
                            <>
                              <CircleProgress 
                                value={projectStat.pending} 
                                max={totalLinks} 
                                color="#3B82F6" 
                              />
                              <CircleProgress 
                                value={projectStat.started} 
                                max={totalLinks} 
                                color="#10B981" 
                              />
                              <CircleProgress 
                                value={projectStat.inProgress} 
                                max={totalLinks} 
                                color="#F59E0B" 
                              />
                              <CircleProgress 
                                value={projectStat.completed} 
                                max={totalLinks} 
                                color="#059669" 
                              />
                              <CircleProgress 
                                value={projectStat.flagged} 
                                max={totalLinks} 
                                color="#EF4444" 
                              />
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">No links generated</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/admin/projects/${project.id}`}

                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </Link>
                        <Link 
                          href={`/admin/projects/${project.id}/generate`}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Generate Links
                        </Link>
                        <button
                          onClick={() => confirmDelete(project)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No projects found. Create your first project to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Project</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{projectToDelete.name}</span>? This will permanently delete the project and all associated data, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6">
              <li>{projectToDelete._count.surveyLinks} survey links</li>
              <li>All survey responses</li>
              <li>All pre-survey questions</li>
              <li>{projectToDelete._count.flags} flags</li>
            </ul>
            <p className="text-gray-600 mb-6">This action cannot be undone.</p>
            
            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {deleteError}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                disabled={isDeleting === projectToDelete.id}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(projectToDelete.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                disabled={isDeleting === projectToDelete.id}
              >
                {isDeleting === projectToDelete.id ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    // Get all projects using Amplify Data Service
    const projectsResult = await amplifyDataService.projects.list();
    const projects = projectsResult.data || [];
    
    // Initialize stats
    const stats = {
      totalProjects: projects.length,
      totalLinks: 0,
      pendingLinks: 0,
      startedLinks: 0,
      inProgressLinks: 0,
      completedLinks: 0,
      flaggedLinks: 0,
    };

    // Initialize project stats object
    const projectStats: Record<string, { 
      pending: number, 
      started: number,
      inProgress: number,
      completed: number,
      flagged: number
    }> = {};
    
    // Initialize counts for each project
    projects.forEach(project => {
      if (project && project.id) {
        projectStats[project.id] = {
          pending: 0,
          started: 0,
          inProgress: 0,
          completed: 0,
          flagged: 0
        };
      }
    });

    // Get all survey links to compute stats
    const surveyLinksResult = await amplifyDataService.surveyLinks.list();
    const surveyLinks = surveyLinksResult.data || [];
    
    // Calculate total links
    stats.totalLinks = surveyLinks.length;
    
    // Process survey links to compute both overall and project-specific stats
    surveyLinks.forEach(link => {
      // Skip links without a project or status
      if (!link.projectId || !link.status) return;
      
      // Update project-specific stats
      if (link.projectId && projectStats[link.projectId]) {        switch (link.status) {
          case 'UNUSED':
            projectStats[link.projectId].pending += 1;
            stats.pendingLinks += 1;
            break;
          case 'CLICKED':
            projectStats[link.projectId].started += 1;
            stats.startedLinks += 1;
            break;          // Use CLICKED status to track in-progress links since we don't have IN_PROGRESS status anymore
          // This duplicates the CLICKED case but preserves the stats functionality
          case 'CLICKED': 
            projectStats[link.projectId].inProgress += 1;
            stats.inProgressLinks += 1;
            break;          case 'COMPLETED':
            projectStats[link.projectId].completed += 1;
            stats.completedLinks += 1;
            break;
          case 'DISQUALIFIED':
            projectStats[link.projectId].flagged += 1;
            stats.flaggedLinks += 1;
            break;
          case 'QUOTA_FULL':
            projectStats[link.projectId].flagged += 1;
            stats.flaggedLinks += 1;
            break;
        }
      }
    });    // Flag model doesn't exist anymore, so we just use an empty array
    // const flagsResult = await amplifyDataService.flags.list();
    const flags: any[] = [];
    
    // Calculate counts for each project
    const projectCounts: Record<string, { surveyLinks: number, flags: number }> = {};
    projects.forEach(project => {
      if (!project || !project.id) return;
      
      // Count survey links
      const projectLinks = surveyLinks.filter(link => link.projectId === project.id);
      
      // Count flags
      const projectFlags = flags.filter(flag => flag.projectId === project.id);
      
      projectCounts[project.id] = {
        surveyLinks: projectLinks.length,
        flags: projectFlags.length
      };
    });

    // Format projects data for the frontend
    const formattedProjects = projects.map(project => {
      if (!project || !project.id) {
        return null;
      }
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        _count: {
          surveyLinks: projectCounts[project.id]?.surveyLinks || 0,
          flags: projectCounts[project.id]?.flags || 0
        }
      };
    }).filter(Boolean) as Project[];

    return {
      props: {
        projects: JSON.parse(JSON.stringify(formattedProjects)),
        stats,
        projectStats
      },
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return {
      props: {
        projects: [],
        stats: {
          totalProjects: 0,
          totalLinks: 0,
          pendingLinks: 0,
          startedLinks: 0,
          inProgressLinks: 0,
          completedLinks: 0,
          flaggedLinks: 0,
        },
        projectStats: {}
      },
    };
  }
}