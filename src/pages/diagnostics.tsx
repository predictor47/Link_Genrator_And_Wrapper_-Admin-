import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAmplifyConfig } from '@/lib/amplify-config';
import { clearAuthCookies, fixProblemCookies, getCookieDomain } from '@/lib/cookie-manager';

// Removed configureAmplify as it's no longer needed

export default function DiagnosticPage() {
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState({
    environment: process.env.NODE_ENV || 'unknown',
    domain: typeof window !== 'undefined' ? window.location.hostname : 'server-side',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    amplifyConfigured: false,
    authConfigured: false,
    apiConfigured: false,
    userPoolId: 'not-found',
    userPoolClientId: 'not-found',
    apiEndpoint: 'not-found',
    headers: {},
    cookies: {},
    cookieDomain: '',
    redirectHistory: [],
    middlewareChecks: 0,
    isAdminDomain: false,
    authCookiesFound: false,
    potentialRedirectLoop: false,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    const amplifyConfig = getAmplifyConfig(); // Get the latest config

    // Gather client-side diagnostics
    const headers: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key) headers[key] = value || 'empty';
    });

    // Add additional diagnostics
    const redirectCount = sessionStorage.getItem('redirect_count') || '0';
    const redirectHistory = JSON.parse(sessionStorage.getItem('redirect_history') || '[]');
    
    // Check for auth cookies
    const cookies = parseCookies();
    const authCookiesFound = Object.keys(cookies).some(key => 
      key.includes('Token') || 
      key.includes('token') ||
      key.includes('Cognito') || 
      key.includes('cognito') ||
      key.includes('aws') || 
      key.includes('Auth')
    );
    
    // Check for potential redirect loop
    const potentialRedirectLoop = 
      parseInt(redirectCount, 10) > 3 || 
      router.query.redirect_loop === 'true' ||
      router.query.fixed === 'true';
    
    setDiagnostics(prev => ({
      ...prev,
      domain: window.location.hostname,
      path: window.location.pathname,
      headers,
      cookies,
      cookieDomain: getCookieDomain() || 'not-set',
      amplifyConfigured: !!amplifyConfig,
      authConfigured: !!(amplifyConfig?.auth?.user_pool_id && amplifyConfig?.auth?.user_pool_client_id),
      apiConfigured: !!(amplifyConfig?.data?.url),
      middlewareChecks: parseInt(redirectCount, 10),
      redirectHistory,
      isAdminDomain: window.location.hostname.startsWith('admin.'),
      authCookiesFound,
      potentialRedirectLoop,
      timestamp: new Date().toISOString()
    }));
  }, [router.query]);
  
  function parseCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key) cookies[key] = value || 'empty';
      });
    }
    return cookies;
  }
  
  // Handler for clearing auth cookies
  const handleClearCookies = () => {
    clearAuthCookies();
    alert('Authentication cookies cleared. Page will reload.');
    window.location.reload();
  };
  
  // Handler for fixing problem cookies
  const handleFixCookies = () => {
    fixProblemCookies();
    alert('Cookies fixed. Page will reload.');
    window.location.reload();
  };
  
  // Handler for redirecting to login
  const handleGoToLogin = () => {
    router.push('/admin/login?fixed=true');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Application Diagnostics</h1>
        
        {/* Actions Panel */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClearCookies}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Auth Cookies
            </button>
            
            <button
              onClick={handleFixCookies}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Fix Problem Cookies
            </button>
            
            <button
              onClick={handleGoToLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login Page
            </button>
          </div>
        </div>
        
        {/* Warning for redirect loops */}
        {diagnostics.potentialRedirectLoop && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-xl font-semibold text-red-700 mb-2">⚠️ Potential Redirect Loop Detected</h2>
            <p className="text-red-600 mb-2">
              The system has detected a high number of redirects or a redirect loop parameter in the URL.
              This may indicate an authentication issue.
            </p>
            <p className="text-red-600">
              Try clearing your auth cookies using the button above and then go to the login page.
            </p>
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Environment Information</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">Environment:</div>
            <div>{diagnostics.environment}</div>
            <div className="font-medium">Current Domain:</div>
            <div>{diagnostics.domain}</div>
            <div className="font-medium">Current Path:</div>
            <div>{diagnostics.path}</div>
            <div className="font-medium">Cookie Domain:</div>
            <div>{diagnostics.cookieDomain}</div>
            <div className="font-medium">Timestamp:</div>
            <div>{diagnostics.timestamp}</div>
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
            <div className="font-medium">Auth Cookies Found:</div>
            <div className={diagnostics.authCookiesFound ? "text-green-600" : "text-red-600"}>
              {diagnostics.authCookiesFound ? 'Yes' : 'No'}
            </div>
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
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Redirect Information</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="font-medium">Is Admin Domain:</div>
            <div>{diagnostics.isAdminDomain ? 'Yes' : 'No'}</div>
            <div className="font-medium">Middleware Check Count:</div>
            <div className={diagnostics.middlewareChecks > 3 ? "text-red-600 font-bold" : ""}>
              {diagnostics.middlewareChecks}
              {diagnostics.middlewareChecks > 3 && " (High - possible redirect loop)"}
            </div>
            <div className="font-medium">Query Parameters:</div>
            <div className="break-all">{JSON.stringify(router.query)}</div>
          </div>
          
          <h3 className="text-lg font-medium mb-2">Redirect History:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(diagnostics.redirectHistory, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
