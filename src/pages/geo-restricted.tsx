import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function GeoRestricted() {
  const router = useRouter();
  const [userCountry, setUserCountry] = useState<string>('');
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);

  useEffect(() => {
    // Get country info from query params or detect user's country
    const { country, allowed } = router.query;
    
    if (country && typeof country === 'string') {
      setUserCountry(country);
    }
    
    if (allowed) {
      const allowedList = Array.isArray(allowed) ? allowed : [allowed];
      setAllowedCountries(allowedList as string[]);
    }
  }, [router.query]);

  const countryNames: { [key: string]: string } = {
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'IN': 'India',
    'BR': 'Brazil',
    'ZA': 'South Africa',
    // Add more country mappings as needed
  };

  const getUserCountryName = () => {
    return countryNames[userCountry] || userCountry || 'your location';
  };

  const getAllowedCountryNames = () => {
    return allowedCountries.map(code => countryNames[code] || code).join(', ');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg 
            className="h-8 w-8 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Survey Not Available
        </h1>

        {/* Message */}
        <div className="text-gray-600 mb-6 space-y-3">
          <p>
            We're sorry, but this survey is not available in {getUserCountryName()}.
          </p>
          
          {allowedCountries.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-2">
                This survey is only available in:
              </p>
              <p className="text-blue-700">
                {getAllowedCountryNames()}
              </p>
            </div>
          )}
          
          <p className="text-sm">
            Geographic restrictions are in place for this survey due to research requirements 
            or regulatory compliance.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
          
          <Link 
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Return to Home
          </Link>
        </div>

        {/* Additional info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact the survey administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
