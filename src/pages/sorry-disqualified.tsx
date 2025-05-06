import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function SorryDisqualified() {
  const [countdown, setCountdown] = useState(15);
  const redirectUrl = "https://protegeresearch.com/";

  useEffect(() => {
    // Set up redirect countdown - now 15 seconds
    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 15000);

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
        <title>Survey Disqualification | Protege Research</title>
        <meta name="description" content="You do not qualify for this survey." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-purple-100 p-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Not Qualified for Survey</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in participating in our survey. Based on your responses, 
              you don't match the criteria needed for this particular study. We appreciate your time and hope 
              you'll participate in future research opportunities.
            </p>
            <div className="h-[1px] bg-gray-200 w-full my-4"></div>
            <p className="text-sm text-gray-500">
              You'll be redirected to Protege Research in <span className="font-medium text-purple-600">{countdown}</span> seconds...
            </p>
            <div className="mt-6">
              <a 
                href={redirectUrl}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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