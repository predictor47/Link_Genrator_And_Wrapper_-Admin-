import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function DisqualifiedPage() {
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
            status: 'DISQUALIFIED',
            vendorId: vid || undefined,
            metadata: {
              timestamp: new Date().toISOString(),
              browser: navigator.userAgent,
              referrer: document.referrer
            }
          });
          setHasRecorded(true);
        } catch (error) {
          console.error('Error recording disqualified status:', error);
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
        <title>Survey Disqualified</title>
        <meta name="description" content="You did not qualify for this survey" />
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
                <div className="rounded-full bg-blue-100 p-3">
                  <svg className="h-12 w-12 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Not Qualified</h1>
              <p className="text-gray-600 mb-6">
                Thank you for your interest in this survey. Based on your responses, you do not qualify for this particular study.
              </p>
              <p className="text-sm text-gray-500">
                Don't worry! There will be other survey opportunities that may be a better match for your profile.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}