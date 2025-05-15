import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { amplifyDataService } from '@/lib/amplify-data-service';
import SurveyFlow from '@/components/SurveyFlow';
import { detectVPN } from '@/lib/vpn-detection';

// Types
interface Question {
  id: string;
  text: string;
  options: string[];
}

interface PageProps {
  projectId: string;
  uid: string;
  project: {
    name: string;
    surveyUrl: string;
  } | null;
  surveyLink: {
    status: string;
    vendorId?: string | null;
  } | null;
  isValid: boolean;
  errorMessage?: string;
}

export default function SurveyLandingPage({ 
  projectId, 
  uid, 
  project,
  surveyLink,
  isValid, 
  errorMessage 
}: PageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(errorMessage || null);
  
  // If link is invalid, show an error
  if (!isValid || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Survey Link</h1>
          <p className="text-gray-600 mb-6">
            {errorMessage || "This survey link is invalid or has expired."}
          </p>
          <div className="text-center">
            <button
              onClick={() => window.location.href = 'https://protegeresearch.com'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Return to ProtegeResearch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If survey was already completed, show that message
  if (surveyLink?.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Survey Already Completed</h1>
          <p className="text-gray-600 mb-6">
            You have already completed this survey. Thank you for your participation!
          </p>
          <div className="text-center">
            <button
              onClick={() => window.location.href = 'https://protegeresearch.com'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Return to ProtegeResearch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use our SurveyFlow component to handle everything
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-2 md:p-6">
          <SurveyFlow 
            projectId={projectId}
            uid={uid}
            surveyUrl={project.surveyUrl}
            vendorId={surveyLink?.vendorId || undefined}
          />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { projectId, uid } = context.params as { projectId: string; uid: string };
  
  try {
    // Get project details
    const projectResult = await amplifyDataService.projects.get(projectId);
    const project = projectResult?.data || null;
    
    if (!project) {
      return {
        props: {
          projectId,
          uid,
          isValid: false,
          errorMessage: 'Project not found',
          project: null,
          surveyLink: null
        }
      };
    }
    
    // Get survey link details
    const linkResult = await amplifyDataService.surveyLinks.getByUid(uid);
    const surveyLink = linkResult?.data || null;
    
    if (!surveyLink) {
      return {
        props: {
          projectId,
          uid,
          isValid: false,
          errorMessage: 'Survey link not found',
          project: null,
          surveyLink: null
        }
      };
    }
    
    // Check if the link belongs to this project
    if (surveyLink.projectId !== projectId) {
      return {
        props: {
          projectId,
          uid,
          isValid: false,
          errorMessage: 'Invalid project link combination',
          project: null,
          surveyLink: null
        }
      };
    }
    
    // Check if link is already marked as completed
    if (surveyLink.status === 'COMPLETED') {
      return {
        props: {
          projectId,
          uid,
          isValid: true,
          project: {
            name: project.name,
            surveyUrl: project.surveyUrl
          },
          surveyLink: {
            status: surveyLink.status,
            vendorId: surveyLink.vendorId || null
          }
        }
      };
    }
    
    // All checks passed
    return {
      props: {
        projectId,
        uid,
        isValid: true,
        project: {
          name: project.name,
          surveyUrl: project.surveyUrl
        },
        surveyLink: {
          status: surveyLink.status || 'UNUSED',
          vendorId: surveyLink.vendorId || null
        }
      }
    };
    
  } catch (error) {
    console.error('Error fetching survey details:', error);
    
    return {
      props: {
        projectId,
        uid,
        isValid: false,
        errorMessage: 'An error occurred while loading the survey',
        project: null,
        surveyLink: null
      }
    };
  }
};