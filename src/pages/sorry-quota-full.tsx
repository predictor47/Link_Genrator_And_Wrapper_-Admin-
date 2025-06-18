import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function SorryQuotaFull() {
  const [countdown, setCountdown] = useState(15);
  const redirectUrl = "https://protegeresearch.com/";

  useEffect(() => {
    // Set up redirect countdown - now 15 seconds
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 5000);

    // Update countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    // Clean up timers
    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Survey Quota Full | Protege Research</title>
        <meta name="description" content="The quota for this survey has been filled." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-indigo-100 p-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Sorry, Quota Full</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in our survey. Unfortunately, the quota for this survey has been filled. 
              We appreciate your willingness to participate.
            </p>
            <div className="h-[1px] bg-gray-200 w-full my-4"></div>
            <p className="text-sm text-gray-500">
              You'll be redirected to Protege Research in <span className="font-medium text-indigo-600">{countdown}</span> seconds...
            </p>
            <div className="mt-6">
              <a 
                href={redirectUrl}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to Protege Research Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}