import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/router';

export default function AuthDebugPage() {
  const { isAuthenticated, isLoading, user, refreshAuthState } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    addLog(`Component mounted. Auth state: authenticated=${isAuthenticated}, loading=${isLoading}`);
  }, []);

  useEffect(() => {
    addLog(`Auth state changed: authenticated=${isAuthenticated}, loading=${isLoading}, user=${user ? user.username : 'null'}`);
  }, [isAuthenticated, isLoading, user]);

  const handleRefreshAuth = async () => {
    addLog('Refreshing auth state...');
    await refreshAuthState();
    addLog('Auth state refresh completed');
  };

  const handleRedirectTest = () => {
    addLog('Testing router.replace to /admin');
    router.replace('/admin').then(() => {
      addLog('Router redirect successful');
    }).catch((error) => {
      addLog(`Router redirect failed: ${error.message}`);
    });
  };

  const handleWindowRedirectTest = () => {
    addLog('Testing window.location.href redirect to /admin');
    window.location.href = '/admin';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <div className="space-y-2">
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</p>
            <p><strong>Current Path:</strong> {router.asPath}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button 
              onClick={handleRefreshAuth}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Auth State
            </button>
            <button 
              onClick={handleRedirectTest}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Router Redirect
            </button>
            <button 
              onClick={handleWindowRedirectTest}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Test Window Redirect
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
