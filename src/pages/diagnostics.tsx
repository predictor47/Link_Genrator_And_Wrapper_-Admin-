import { useState, useEffect } from 'react';
import { configureAmplify, amplifyConfig } from '@/lib/amplify-config';

// Initialize Amplify
configureAmplify();

export default function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState({
    environment: process.env.NODE_ENV || 'unknown',
    domain: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    amplifyConfigured: false,
    authConfigured: false,
    apiConfigured: false,
    userPoolId: amplifyConfig?.Auth?.Cognito?.userPoolId || 'not-found',
    apiEndpoint: amplifyConfig?.API?.GraphQL?.endpoint || 'not-found',
    headers: {},
    cookies: {}
  });

  useEffect(() => {
    // Gather client-side diagnostics
    const headers: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key) headers[key] = value || 'empty';
    });

    setDiagnostics(prev => ({
      ...prev,
      domain: window.location.hostname,
      path: window.location.pathname,
      headers,
      cookies: parseCookies(),
      amplifyConfigured: !!amplifyConfig,
      authConfigured: !!(amplifyConfig?.Auth?.Cognito?.userPoolId),
      apiConfigured: !!(amplifyConfig?.API?.GraphQL?.endpoint)
    }));
  }, []);
  
  function parseCookies() {
    const cookies: Record<string, string> = {};
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key) cookies[key] = value || 'empty';
      });
    }
    return cookies;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Application Diagnostics</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Environment Information</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">Environment:</div>
            <div>{diagnostics.environment}</div>
            <div className="font-medium">Current Domain:</div>
            <div>{diagnostics.domain}</div>
            <div className="font-medium">Current Path:</div>
            <div>{diagnostics.path}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Amplify Configuration</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">Configured:</div>
            <div>{diagnostics.amplifyConfigured ? 'Yes' : 'No'}</div>
            <div className="font-medium">Auth Configured:</div>
            <div>{diagnostics.authConfigured ? 'Yes' : 'No'}</div>
            <div className="font-medium">API Configured:</div>
            <div>{diagnostics.apiConfigured ? 'Yes' : 'No'}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Auth Details</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">User Pool ID:</div>
            <div className="break-all">{diagnostics.userPoolId}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">API Details</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">GraphQL Endpoint:</div>
            <div className="break-all">{diagnostics.apiEndpoint}</div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Cookie Information</h2>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(diagnostics.cookies, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
