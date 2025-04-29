import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function QuotaFullPage() {
  const router = useRouter();
  const { uid, pid, vid } = router.query;
  const [isRecording, setIsRecording] = useState(!!uid);
  const [hasRecorded, setHasRecorded] = useState(false);

  // Log the survey outcome if we have a survey UID
  useEffect(() => {
    if (uid && pid && !hasRecorded) {
      const recordOutcome = async () => {
        try {
          await axios.post('/api/links/update-status', {
            projectId: pid,
            uid,
            status: 'QUOTA_FULL',
            vendorId: vid || undefined,
            metadata: {
              timestamp: new Date().toISOString(),
              browser: navigator.userAgent,
              referrer: document.referrer
            }
          });
          setHasRecorded(true);
        } catch (error) {
          console.error('Error recording quota full status:', error);
        }
        setIsRecording(false);
      };
      
      recordOutcome();
    } else {
      setIsRecording(false);
    }
  }, [uid, pid, vid, hasRecorded]);

  return (
    <>
      <Head>
        <title>Survey Quota Full</title>
        <meta name="description" content="The quota for this survey has been reached" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          {isRecording ? (
            <div className="animate-pulse space-y-4">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full"></div>
              <div className="h-6 bg-blue-100 rounded mx-auto w-3/4"></div>
              <div className="h-4 bg-blue-100 rounded mx-auto w-1/2"></div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-yellow-100 p-3">
                  <svg className="h-12 w-12 text-yellow-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Quota Full</h1>
              <p className="text-gray-600 mb-6">
                Thank you for your interest in this survey. Unfortunately, the quota for this survey has been reached.
              </p>
              <p className="text-sm text-gray-500">
                We appreciate your time and interest in participating. Please check back for future surveys.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}