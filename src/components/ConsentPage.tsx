import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface ConsentPageProps {
  projectId: string;
  uid: string;
  projectTitle?: string;
  requiredConsents: ConsentItem[];
  onConsentComplete: (consents: Record<string, boolean>) => void;
  onVpnDetected: () => void;
  onGeoRestricted: (country: string) => void;
}

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  type: 'privacy' | 'data_collection' | 'participation' | 'recording' | 'cookies' | 'marketing' | 'custom';
}

interface UserLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  confidence: number;
}

export default function ConsentPage({
  projectId,
  uid,
  projectTitle = 'Research Survey',
  requiredConsents,
  onConsentComplete,
  onVpnDetected,
  onGeoRestricted
}: ConsentPageProps) {
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVpnWarning, setShowVpnWarning] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoRestrictions, setGeoRestrictions] = useState<string[] | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Initialize consent states
    const initialConsents: Record<string, boolean> = {};
    requiredConsents.forEach(consent => {
      initialConsents[consent.id] = false;
    });
    setConsents(initialConsents);

    // Check user location and VPN status
    checkUserLocation();
    
    // Fetch geo restrictions for this project
    fetchGeoRestrictions();
  }, []);

  const checkUserLocation = async () => {
    try {
      const response = await axios.get('/api/ip-check');
      const locationData: UserLocation = response.data;
      
      setUserLocation(locationData);
      
      // Check for VPN/Proxy usage
      if (locationData.isVpn || locationData.isProxy || locationData.isTor) {
        setShowVpnWarning(true);
      }
      
    } catch (error) {
      console.error('Error checking location:', error);
      // Continue without location data if check fails
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const fetchGeoRestrictions = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/geo-restrictions`);
      if (response.data.success && response.data.restrictions) {
        setGeoRestrictions(response.data.restrictions);
      }
    } catch (error) {
      console.error('Error fetching geo restrictions:', error);
      // Continue without geo restrictions if fetch fails
    }
  };

  const handleConsentChange = (consentId: string, value: boolean) => {
    setConsents(prev => ({
      ...prev,
      [consentId]: value
    }));

    // Clear any previous errors
    setErrors([]);
  };

  const validateConsents = (): string[] => {
    const validationErrors: string[] = [];
    
    requiredConsents.forEach(consent => {
      if (consent.required && !consents[consent.id]) {
        validationErrors.push(`You must consent to "${consent.title}" to continue`);
      }
    });
    
    return validationErrors;
  };

  const handleContinue = async () => {
    // Validate required consents
    const validationErrors = validateConsents();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsProcessing(true);

    try {
      // Check for geo restrictions
      if (geoRestrictions && userLocation) {
        const isGeoAllowed = geoRestrictions.includes(userLocation.countryCode) || 
                            geoRestrictions.includes(userLocation.country);
        
        if (!isGeoAllowed) {
          // Flag geo restriction and end survey
          await flagSurveyLink('Geographic restriction violation', {
            country: userLocation.country,
            countryCode: userLocation.countryCode,
            allowedCountries: geoRestrictions
          });
          
          onGeoRestricted(userLocation.country);
          return;
        }
      }

      // Check for VPN usage (after consent)
      if (userLocation && (userLocation.isVpn || userLocation.isProxy || userLocation.isTor)) {
        // Flag VPN usage and end survey
        await flagSurveyLink('VPN/Proxy detected', {
          isVpn: userLocation.isVpn,
          isProxy: userLocation.isProxy,
          isTor: userLocation.isTor,
          location: userLocation
        });
        
        onVpnDetected();
        return;
      }

      // Record consent data
      await recordConsents();

      // Proceed to next step
      onConsentComplete(consents);

    } catch (error) {
      console.error('Error processing consent:', error);
      setErrors(['An error occurred while processing your consent. Please try again.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const flagSurveyLink = async (reason: string, metadata: any) => {
    try {
      await axios.post('/api/links/flag', {
        projectId,
        uid,
        reason,
        metadata: {
          ...metadata,
          flaggedAt: new Date().toISOString(),
          stage: 'consent',
          userAgent: navigator.userAgent
        }
      });
    } catch (error) {
      console.error('Error flagging survey link:', error);
    }
  };

  const recordConsents = async () => {
    try {
      await axios.post('/api/consent/record', {
        projectId,
        uid,
        consents,
        metadata: {
          userLocation,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ipAddress: userLocation?.country || 'unknown'
        }
      });
    } catch (error) {
      console.error('Error recording consents:', error);
      // Continue even if consent recording fails
    }
  };

  const handleVpnAcknowledge = () => {
    setShowVpnWarning(false);
    // Continue with VPN detected - this will be flagged when they try to continue
  };

  const getConsentIcon = (type: ConsentItem['type']) => {
    const iconClasses = "w-6 h-6";
    
    switch (type) {
      case 'privacy':
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-9a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2zm10-12V6a4 4 0 00-8 0v3" />
          </svg>
        );
      case 'data_collection':
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'recording':
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'cookies':
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (isCheckingLocation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing Survey</h2>
          <p className="text-gray-600">Please wait while we prepare your survey experience...</p>
        </div>
      </div>
    );
  }

  // VPN Warning Modal
  if (showVpnWarning) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">VPN/Proxy Detected</h2>
            <p className="text-gray-700 mb-4">
              We've detected that you're using a VPN, proxy, or similar service. For the integrity of our research, 
              we need to collect responses from users in their actual locations.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Please disable your VPN/proxy and refresh the page to continue. If you're not using a VPN, 
              this may be a false positive due to your network configuration.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleVpnAcknowledge}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Continue Anyway
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Informed Consent</h1>
            <p className="text-lg text-gray-600">{projectTitle}</p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Before participating in this survey, please review and provide your consent for the following items. 
                Your participation is voluntary and you may withdraw at any time.
              </p>
            </div>
          </div>

          {/* Location Info */}
          {userLocation && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Location Information:</h3>
              <p className="text-sm text-gray-600">
                Country: {userLocation.country} ({userLocation.countryCode}) • 
                Region: {userLocation.region} • 
                City: {userLocation.city}
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">Please address the following:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Consent Items */}
          <div className="space-y-6 mb-8">
            {requiredConsents.map((consent) => (
              <div key={consent.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 text-blue-600 mt-1">
                    {getConsentIcon(consent.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {consent.title}
                      {consent.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <p className="text-gray-700 mb-4">{consent.description}</p>
                    
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={consents[consent.id] || false}
                          onChange={(e) => handleConsentChange(consent.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          I consent to {consent.title.toLowerCase()}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-6">
                By clicking "I Agree and Continue" below, you confirm that you have read and understood 
                all consent items and agree to participate in this survey under these conditions.
              </p>
              
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'I Agree and Continue'}
              </button>
              
              <div className="mt-4">
                <button
                  onClick={() => window.close()}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  I do not wish to participate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
