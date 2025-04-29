import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { AuthService } from '@/lib/auth-service';
import { configureAmplify } from '@/lib/amplify-config';

// Initialize Amplify
configureAmplify();

export default function VerifyPage() {
  const router = useRouter();
  const { username } = router.query;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          router.replace('/admin');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (!username || typeof username !== 'string') {
      setError('Username is required. Please go back to the signup page.');
      setIsLoading(false);
      return;
    }
    
    try {
      await AuthService.confirmSignUp(username, code);
      setSuccess(true);
      
      // Redirect to login page after successful verification
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to verify account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, show loading state
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Already logged in</h2>
            <p className="mt-2 text-gray-600">Redirecting to admin dashboard...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Verify Account | Survey Link Manager</title>
        <meta name="description" content="Verify your account for the survey link management admin panel" />
      </Head>
      
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Verify Your Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the verification code sent to your email
            </p>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {success ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Your account has been successfully verified. Redirecting to login page...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleVerify}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  readOnly
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  value={username as string || ''}
                />
              </div>
              
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">Verification Code</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      </span>
                      Verifying...
                    </>
                  ) : (
                    'Verify Account'
                  )}
                </button>
              </div>
              
              <div className="text-sm text-center">
                <span className="text-gray-500">Didn't receive a code? </span>
                <Link href="/admin/resend-code" className="font-medium text-blue-600 hover:text-blue-500">
                  Resend code
                </Link>
              </div>
              
              <div className="text-sm text-center">
                <Link href="/admin/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}