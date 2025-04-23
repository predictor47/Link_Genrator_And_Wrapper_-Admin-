import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

interface GenerateLinksPageProps {
  project: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export default function GenerateLinks({ project }: GenerateLinksPageProps) {
  const router = useRouter();
  const [originalUrl, setOriginalUrl] = useState('');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<{ id: string; uid: string; url: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Project Not Found</h1>
          <p className="text-gray-700 mb-4">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/admin" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedLinks([]);

    // Validate originalUrl (basic validation)
    if (!originalUrl || !originalUrl.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      setIsGenerating(false);
      return;
    }

    try {
      const response = await axios.post('/api/links/generate', {
        projectId: project.id,
        originalUrl,
        count: Math.min(Math.max(1, count), 100) // Limit between 1 and 100
      });

      if (response.data.success) {
        setGeneratedLinks(response.data.links);
      } else {
        setError(response.data.message || 'Error generating links');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate links. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const exportLinks = () => {
    if (!generatedLinks.length) return;

    const csvContent = [
      'ID,UID,URL',
      ...generatedLinks.map(link => `${link.id},${link.uid},${link.url}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_links.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/admin/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Project
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Generate Survey Links</h1>
              <p className="text-gray-600">{project.name} - {project.description || 'No description'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Generate New Links</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Original Survey URL
                </label>
                <input
                  type="url"
                  id="originalUrl"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://example-survey.com/survey123"
                  className="w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Links to Generate (1-100)
                </label>
                <input
                  type="number"
                  id="count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
                >
                  {isGenerating && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isGenerating ? 'Generating...' : 'Generate Links'}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
        
        {generatedLinks.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Generated Links</h2>
              <button
                onClick={exportLinks}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                Export as CSV
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedLinks.map(link => (
                      <tr key={link.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {link.uid}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {link.url}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => copyToClipboard(link.url, link.id)}
                            className={`text-indigo-600 hover:text-indigo-900 ${copied === link.id ? 'text-green-600' : ''}`}
                          >
                            {copied === link.id ? 'Copied!' : 'Copy Link'}
                          </button>
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
  );
}

export async function getServerSideProps(context: any) {
  const { id } = context.params;
  
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!project) {
      return {
        props: { project: null }
      };
    }

    return {
      props: {
        project: JSON.parse(JSON.stringify(project)),
      },
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    return {
      props: { project: null }
    };
  }
}