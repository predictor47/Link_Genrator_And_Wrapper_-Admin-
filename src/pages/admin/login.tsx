import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { fixProblemCookies, clearAuthCookies, initCookieFixes } from '@/lib/cookie-manager';
import AuthRedirectCheck from '@/lib/auth-redirect-check';

// Domain configuration - simplified for single domain approach
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';

export default function LoginPage() {
  const router = useRouter();
  const { login, completeNewPassword, refreshAuthState } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const { redirect, fixed } = router.query;

  // Initialize cookie fixes when the component mounts
  useEffect(() => {
    // Fix any cookie issues on page load
    initCookieFixes();
    
    // If there's a fixed=true parameter, we've already tried to fix a redirect loop
    if (fixed === 'true') {
      console.log('Login page loaded after fixing redirect loop');
    }
  }, [fixed]);

  // Only log domain for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Login page loaded on domain:', window.location.hostname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    
    try {
      // Clear any problematic cookies before attempting to sign in
      fixProblemCookies();
      
      console.log('Logging in user:', username);
      const signInResponse = await login(username, password);
      
      // Check if NEW_PASSWORD_REQUIRED challenge is present (for first-time login)
      if (signInResponse.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('New password required, showing password change form');
        setIsNewPasswordRequired(true);
        setIsLoggingIn(false);
        return;
      }
      
      if (signInResponse.isSuccess) {
        console.log('Sign in successful, redirecting to admin panel');
        
        // Wait for the session to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force a refresh of auth state before redirecting
        await refreshAuthState();
        
        // Redirect to the intended page or admin dashboard
        router.push(typeof redirect === 'string' ? redirect : '/admin');
      } else {
        setError(signInResponse.message || 'Failed to sign in. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
      
      if (error.message?.includes('Token') || error.message?.includes('authentication')) {
        // If there's a token-related error, try clearing auth cookies
        clearAuthCookies();
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle setting a new password when required
  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoggingIn(false);
      return;
    }
    
    try {
      console.log('Submitting new password');
      const result = await completeNewPassword(newPassword);
      
      if (result.isSuccess) {
        console.log('Password changed successfully');
        // Reset the state
        setIsNewPasswordRequired(false);
        
        // Give the auth state a moment to update before redirecting
        setTimeout(() => {
          router.push(typeof redirect === 'string' ? redirect : '/admin');
        }, 1000);
      } else {
        console.error('Failed to set new password:', result.message);
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      setError(error.message || 'Failed to set new password');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  return (
    <AuthRedirectCheck redirectTo="/admin">
      <Head>
        <title>Admin Login | Protege Research Survey</title>
        <meta name="description" content="Login to the Protege Research Survey admin panel" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to access the survey management dashboard
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
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {router.query.fixed === 'true' && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">Login issues fixed. Please sign in again.</p>
                </div>
              </div>
            </div>
          )}
          
          {isNewPasswordRequired ? (
            <form className="mt-8 space-y-6" onSubmit={handleNewPasswordSubmit}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="newPassword" className="sr-only">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                                        autoComplete="new-password"
                    required
                    className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Set New Password
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                
                <div className="text-sm">
                  <Link href="/admin/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Sign in
                </button>
              </div>
              
              <div className="flex justify-center">
                <div className="text-sm">
                  <Link href="/admin/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Don't have an account? Sign up
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </AuthRedirectCheck>
  );
}