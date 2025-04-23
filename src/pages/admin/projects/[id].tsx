import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Define proper types based on your Prisma schema
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

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  questions: Question[];
  stats: ProjectStats;
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

        {/* Survey Questions */}
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

        {/* Link Management */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Survey Links</h2>
            <Link 
              href={`/admin/projects/${project.id}/generate`} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Generate New Links
            </Link>
          </div>
          <div className="p-6">
            {project.stats.total > 0 ? (
              <p className="text-gray-600">This project has {project.stats.total} survey links. Go to the link generation page to view and manage them.</p>
            ) : (
              <p className="text-gray-500 italic">No survey links have been generated for this project yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // Fetch project data with correct relation name (presurveyQuestions)
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        presurveyQuestions: true,
        _count: {
          select: {
            surveyLinks: true,
            flags: true,
          }
        }
      }
    });

    if (!project) {
      return { props: { project: null } };
    }

    // Get survey links stats for this project
    const linkStats = await prisma.surveyLink.groupBy({
      by: ['status'],
      where: {
        projectId: id
      },
      _count: {
        id: true,
      },
    });

    // Initialize stats
    const stats = {
      total: 0,
      pending: 0,
      started: 0,
      inProgress: 0,
      completed: 0,
      flagged: 0
    };

    // Calculate total
    stats.total = project._count.surveyLinks;

    // Process link stats
    linkStats.forEach((stat) => {
      const count = stat._count.id;
      
      if (stat.status === 'PENDING') {
        stats.pending = count;
      } else if (stat.status === 'STARTED') {
        stats.started = count;
      } else if (stat.status === 'IN_PROGRESS') {
        stats.inProgress = count;
      } else if (stat.status === 'COMPLETED') {
        stats.completed = count;
      } else if (stat.status === 'FLAGGED') {
        stats.flagged = count;
      }
    });

    return {
      props: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt.toISOString(),
          // Map from presurveyQuestions to questions with proper type
          questions: project.presurveyQuestions.map((q: { id: string; text: string; options: string }) => ({
            id: q.id,
            text: q.text,
            options: q.options // This is already a string in your schema
          })),
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