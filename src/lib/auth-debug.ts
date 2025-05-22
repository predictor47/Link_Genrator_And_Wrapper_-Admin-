/**
 * Auth debug utility to help diagnose authentication issues
 */
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

/**
 * Get diagnostic information about the current authentication state
 */
export async function getAuthDiagnostics(): Promise<Record<string, any>> {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    cookies: {},
    session: null,
    user: null,
    errors: []
  };
  
  // Get cookies
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.split('=').map(c => c.trim());
      if (name.includes('CognitoIdentityServiceProvider') || 
          name.includes('amplify') || 
          name.includes('Token')) {
        diagnostics.cookies[name] = value ? 'present' : 'empty';
      }
    });
  }
  
  // Try to get current session
  try {
    const session = await fetchAuthSession();
    diagnostics.session = {
      hasIdToken: !!session.tokens?.idToken,
      hasAccessToken: !!session.tokens?.accessToken,
      // Check for tokens object instead of specific refreshToken property
      hasTokens: !!session.tokens
    };
  } catch (error) {
    diagnostics.errors.push({
      source: 'fetchAuthSession',
      message: error instanceof Error ? error.message : String(error)
    });
  }
  
  // Try to get current user
  try {
    const user = await getCurrentUser();
    diagnostics.user = {
      userId: user.userId,
      username: user.username,
      signInDetails: user.signInDetails
    };
  } catch (error) {
    diagnostics.errors.push({
      source: 'getCurrentUser',
      message: error instanceof Error ? error.message : String(error)
    });
  }
  
  return diagnostics;
}

/**
 * Print auth diagnostics to the console
 */
export async function logAuthDiagnostics(): Promise<void> {
  try {
    const diagnostics = await getAuthDiagnostics();
    console.log('=== AUTH DIAGNOSTICS ===');
    console.log(JSON.stringify(diagnostics, null, 2));
    console.log('=======================');
  } catch (error) {
    console.error('Failed to get auth diagnostics:', error);
  }
}

/**
 * Attempt to fix common authentication issues
 */
export async function attemptAuthFix(): Promise<boolean> {
  try {
    const diagnostics = await getAuthDiagnostics();
    
    // Clear problematic cookies if there are auth errors but cookies exist
    if (diagnostics.errors.length > 0 && Object.keys(diagnostics.cookies).length > 0) {
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name.includes('CognitoIdentityServiceProvider') || 
              name.includes('amplify') || 
              name.includes('Token')) {
            console.log('Clearing problematic cookie:', name);
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      
      // Reload the page to get a fresh state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to fix auth issues:', error);
    return false;
  }
}
