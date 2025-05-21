import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/lib/protected-route';

// This is a placeholder page that redirects back to the admin dashboard
export default function ProjectsIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Redirecting to Dashboard...</h1>
          <p className="text-gray-600">Please wait.</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}