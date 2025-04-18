import { useState, useEffect } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    surveyLinks: number;
    flags: number;
  };
}

interface Stats {
  totalProjects: number;
  totalLinks: number;
  pendingLinks: number;
  completedLinks: number;
  flaggedLinks: number;
}

interface AdminDashboardProps {
  projects: Project[];
  stats: Stats;
}

export default function AdminDashboard({ projects, stats }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Survey Link Wrapper Admin</h1>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Projects</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Links</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalLinks}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Pending Links</div>
            <div className="text-3xl font-bold text-blue-600">{stats.pendingLinks}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Completed Links</div>
            <div className="text-3xl font-bold text-green-600">{stats.completedLinks}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Flagged Links</div>
            <div className="text-3xl font-bold text-red-600">{stats.flaggedLinks}</div>
          </div>
        </div>

        {/* Projects Section */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flags</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        project._count.flags > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {project._count.flags}
                      </span>
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
                        className="text-green-600 hover:text-green-900"
                      >
                        Generate Links
                      </Link>
                    </td>
                  </tr>
                ))}
                
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
    </div>
  );
}

export async function getServerSideProps() {
  try {
    // Get projects with counts
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            surveyLinks: true,
            flags: true,
          },
        },
      },
    });

    // Get overall stats
    const linkStats = await prisma.surveyLink.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const stats = {
      totalProjects: projects.length,
      totalLinks: 0,
      pendingLinks: 0,
      completedLinks: 0,
      flaggedLinks: 0,
    };

    // Process link stats
    linkStats.forEach((stat) => {
      const count = stat._count.id;
      stats.totalLinks += count;
      
      if (stat.status === 'PENDING') {
        stats.pendingLinks = count;
      } else if (stat.status === 'COMPLETED') {
        stats.completedLinks = count;
      } else if (stat.status === 'FLAGGED') {
        stats.flaggedLinks = count;
      }
    });

    return {
      props: {
        projects: JSON.parse(JSON.stringify(projects)),
        stats,
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
          completedLinks: 0,
          flaggedLinks: 0,
        },
      },
    };
  }
}