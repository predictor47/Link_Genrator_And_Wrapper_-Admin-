import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import SurveyFlow from '@/components/SurveyFlow';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

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
  const { projectId, uid } = context.params!;
  
  try {
    const amplifyServerService = getAmplifyServerService();
    
    // Get the survey link
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid as string);
    const surveyLink = surveyLinkResult.data;
    
    if (!surveyLink) {
      return {
        props: {
          projectId: projectId as string,
          uid: uid as string,
          project: null,
          surveyLink: null,
          isValid: false,
          errorMessage: 'Survey link not found'
        }
      };
    }
    
    // Check if link belongs to the project
    if (surveyLink.projectId !== projectId) {
      return {
        props: {
          projectId: projectId as string,
          uid: uid as string,
          project: null,
          surveyLink: null,
          isValid: false,
          errorMessage: 'Invalid project/link combination'
        }
      };
    }
    
    // Get the project
    const projectResult = await amplifyServerService.getProject(surveyLink.projectId);
    const project = projectResult.data;
    
    if (!project) {
      return {
        props: {
          projectId: projectId as string,
          uid: uid as string,
          project: null,
          surveyLink: null,
          isValid: false,
          errorMessage: 'Project not found'
        }
      };
    }
    
    return {
      props: {
        projectId: projectId as string,
        uid: uid as string,
        project: {
          name: project.name,
          surveyUrl: project.surveyUrl
        },
        surveyLink: {
          status: surveyLink.status,
          vendorId: surveyLink.vendorId || null
        },
        isValid: true
      }
    };
    
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        projectId: projectId as string,
        uid: uid as string,
        project: null,
        surveyLink: null,
        isValid: false,
        errorMessage: 'Failed to load survey data'
      }
    };
  }
};