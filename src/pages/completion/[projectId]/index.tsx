import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { getAmplifyDataService } from '@/lib/amplify-data-service';

interface CompletionPageProps {
  project: {
    id: string;
    name: string;
  } | null;
  error?: string;
}

export default function CompletionPage({ project, error: serverError }: CompletionPageProps) {
  const router = useRouter();
  const { uid } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(serverError || null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only run this effect if we have the UID from query params
    if (project && uid && typeof uid === 'string') {
      const markComplete = async () => {
        try {
          // Get stored session data if available
          let sessionData = null;
          try {
            const storedData = sessionStorage.getItem('surveySession');
            if (storedData) {
              sessionData = JSON.parse(storedData);
            }
          } catch (e) {
            console.error('Error reading session storage:', e);
          }

          // Make API call to mark survey as completed
          const response = await axios.post('/api/links/complete', {
            projectId: project.id,
            uid: uid,
            token: sessionData?.token,
            metadata: {
              completionTimestamp: new Date().toISOString(),
              browser: navigator.userAgent,
              completionHost: window.location.hostname,
              referrer: document.referrer,
              sessionData
            }
          });

          if (response.data.success) {
            setSuccess(true);
            // Clear session data after successful completion
            sessionStorage.removeItem('surveySession');
          } else {
            setError(response.data.message || 'Failed to record survey completion');
          }
        } catch (error: any) {
          console.error('Error marking survey as complete:', error);
          setError(error.response?.data?.message || 'An error occurred while recording your completion');
        } finally {
          setIsLoading(false);
        }
      };

      markComplete();
    } else {
      setIsLoading(false);
    }
  }, [project, uid]);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Project Not Found</h1>
          <p className="text-gray-700 mb-6">
            Sorry, the project you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Survey Completed | {project.name}</title>
        <meta name="description" content="Thank you for completing the survey" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          {isLoading ? (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Recording Completion</h1>
              <p className="text-gray-600 mb-6">Please wait while we record your survey completion...</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
              <p className="text-gray-700 mb-6">{error}</p>
              <p className="text-sm text-gray-500">
                If this error persists, please contact the survey administrator.
              </p>
            </>
          ) : (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg className="h-12 w-12 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Thank You!</h1>
              <p className="text-gray-600 mb-6">
                Your survey has been successfully completed and recorded.
              </p>
              <p className="text-sm text-gray-500">
                You may now close this window.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  // All data fetching is now client-side. Do not use amplifyDataService here.
  return { props: {} };
}