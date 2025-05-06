import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ThankYouCompleted() {
  const [countdown, setCountdown] = useState(5);
  const redirectUrl = "https://protegeresearch.com/";

  useEffect(() => {
    // Set up redirect countdown
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
        <title>Thank You | Protege Research</title>
        <meta name="description" content="Thank you for completing our survey." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center rounded-full bg-green-100 p-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You for Completing the Survey</h1>
            <p className="text-gray-600 mb-6">
              Your responses have been successfully submitted. We truly appreciate your time and valuable input, 
              which will help us provide better insights and services.
            </p>
            <div className="h-[1px] bg-gray-200 w-full my-4"></div>
            <p className="text-sm text-gray-500">
              You'll be redirected to Protege Research in <span className="font-medium text-green-600">{countdown}</span> seconds...
            </p>
            <div className="mt-6">
              <a 
                href={redirectUrl}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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