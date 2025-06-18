import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/lib/protected-route';
import { getAmplifyDataService } from '@/lib/amplify-data-service';
import ClientSideLinkGenerator from '@/components/ClientSideLinkGenerator';
import EnhancedLinkGenerator from '@/components/EnhancedLinkGenerator';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface GeneratedLink {
  id: string;
  respId: string;
  originalUrl: string;
  wrapperUrl: string;
  linkType: 'TEST' | 'LIVE';
  vendorId: string;
  projectId: string;
}

export default function GenerateLinksPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [generatorMode, setGeneratorMode] = useState<'high-performance' | 'enhanced' | 'legacy'>('high-performance');
  const [recentLinks, setRecentLinks] = useState<GeneratedLink[]>([]);
  const [linkStats, setLinkStats] = useState({ total: 0, active: 0, completed: 0 });
  
  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!id || typeof id !== 'string') return;
      
      try {
        setIsLoadingProject(true);
        const amplifyDataService = await getAmplifyDataService();
        const result = await amplifyDataService.projects.get({ id });
        
        if (result?.data) {
          setProject(result.data);
        } else {
          console.error('Project not found');
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProject();
  }, [id]);

  // Load link statistics
  useEffect(() => {
    const loadLinkStats = async () => {
      if (!id || typeof id !== 'string') return;
      
      try {
        const response = await fetch(`/api/links/stats?projectId=${id}`);
        if (response.ok) {
          const stats = await response.json();
          setLinkStats(stats);
        }
      } catch (error) {
        console.error('Error loading link stats:', error);
      }
    };

    loadLinkStats();
  }, [id]);

  // Handle successful link generation
  const handleLinksGenerated = (links: GeneratedLink[]) => {
    setRecentLinks(links.slice(0, 10)); // Show last 10 generated links
    // Refresh stats
    setLinkStats(prev => ({
      ...prev,
      total: prev.total + links.length,
      active: prev.active + links.length
    }));
  };

  if (isLoadingProject) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4 text-center">Loading project...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Project Not Found</h2>
            <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
            <Link href="/admin/projects" className="text-blue-600 hover:text-blue-800">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Generate Survey Links</h1>
                <p className="text-gray-600 mt-1">
                  Project: <span className="font-medium">{project.name}</span>
                </p>
              </div>
              <div className="flex space-x-4">
                <Link 
                  href={`/admin/projects/${id}`}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
                >
                  ← Project Overview
                </Link>
                <Link 
                  href="/admin/projects"
                  className="text-blue-600 hover:text-blue-800"
                >
                  All Projects
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Link Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Links</p>
                  <p className="text-2xl font-semibold text-gray-900">{linkStats.total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Links</p>
                  <p className="text-2xl font-semibold text-gray-900">{linkStats.active.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{linkStats.completed.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generator Mode Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Link Generation Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setGeneratorMode('high-performance')}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  generatorMode === 'high-performance'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="ml-2 font-medium text-gray-900">High Performance</span>
                  {generatorMode === 'high-performance' && (
                    <span className="ml-2 text-blue-600">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Client-side generation with batch processing. Handles large volumes (1000+ links) with progress tracking.
                </p>
                <div className="mt-2 text-xs text-blue-600 font-medium">RECOMMENDED for large batches</div>
              </div>

              <div
                onClick={() => setGeneratorMode('enhanced')}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  generatorMode === 'enhanced'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="ml-2 font-medium text-gray-900">Enhanced</span>
                  {generatorMode === 'enhanced' && (
                    <span className="ml-2 text-blue-600">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Server-side generation with advanced features. Good for moderate volumes with custom configurations.
                </p>
                <div className="mt-2 text-xs text-green-600 font-medium">Good for custom setups</div>
              </div>

              <div
                onClick={() => setGeneratorMode('legacy')}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  generatorMode === 'legacy'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <span className="ml-2 font-medium text-gray-900">Legacy</span>
                  {generatorMode === 'legacy' && (
                    <span className="ml-2 text-blue-600">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Original generation method. Use only if you need specific legacy features.
                </p>
                <div className="mt-2 text-xs text-gray-600 font-medium">Not recommended</div>
              </div>
            </div>
          </div>

          {/* Generator Components */}
          {generatorMode === 'high-performance' && (
            <ClientSideLinkGenerator
              projectId={project.id}
              onComplete={handleLinksGenerated}
            />
          )}

          {generatorMode === 'enhanced' && (
            <EnhancedLinkGenerator
              projectId={project.id}
              onLinksGenerated={(result) => {
                if (result.links) {
                  // Convert enhanced links to our GeneratedLink format
                  const convertedLinks: GeneratedLink[] = result.links.map(link => ({
                    id: link.id,
                    respId: link.respId,
                    originalUrl: link.originalUrl,
                    wrapperUrl: link.wrapperUrl,
                    linkType: 'LIVE', // Default for enhanced generator
                    vendorId: link.vendorId || 'unknown',
                    projectId: project.id
                  }));
                  handleLinksGenerated(convertedLinks);
                }
              }}
            />
          )}

          {generatorMode === 'legacy' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex">
                <div className="text-yellow-400">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Legacy Generator</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>The legacy generator is deprecated and may have performance issues with large batches. Please use the High Performance generator for better reliability and speed.</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setGeneratorMode('high-performance')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-2 rounded-md"
                    >
                      Switch to High Performance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Links */}
          {recentLinks.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Recently Generated Links</h3>
                <p className="text-sm text-gray-600">Last {recentLinks.length} generated links</p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resp ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wrapper URL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentLinks.map((link) => (
                        <tr key={link.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {link.respId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {link.vendorId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              link.linkType === 'LIVE' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {link.linkType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <a
                              href={link.wrapperUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                            >
                              {link.wrapperUrl}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
