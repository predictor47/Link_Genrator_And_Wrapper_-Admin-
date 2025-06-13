import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface IframeMonitorProps {
  projectId: string;
  uid: string;
  url: string;
  onStatusChange: (status: string, data?: any) => void;
}

/**
 * Component that monitors an iframe for domain changes to detect survey completion
 * 
 * Enhanced to detect specific redirect URLs and handle completion properly
 * Monitors for quota-full, disqualified, and thank-you-completed patterns
 */
const IframeMonitor: React.FC<IframeMonitorProps> = ({
  projectId,
  uid,
  url,
  onStatusChange
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [lastDetectedUrl, setLastDetectedUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const urlCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced completion detection patterns
  const COMPLETION_PATTERNS = {
    COMPLETED: [
      '/thank-you-completed',
      '/thank-you',
      '/thankyou',
      '/complete',
      '/completed',
      '/finish',
      '/finished',
      '/success',
      '/end',
      'status=complete',
      'status=completed',
      'status=success'
    ],
    QUOTA_FULL: [
      '/quota-full',
      '/quota',
      '/quotafull',
      '/full',
      'status=quota',
      'status=quotafull',
      'status=quota-full',
      'reason=quota'
    ],
    DISQUALIFIED: [
      '/disqualified',
      '/not-eligible',
      '/screened',
      '/terminate',
      '/terminated',
      '/ineligible',
      '/rejected',
      'status=disqualified',
      'status=screened',
      'status=terminate',
      'status=ineligible',
      'reason=disqualified'
    ]
  };

  // Enhanced URL monitoring with multiple detection methods
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return;
    
    let checkCount = 0;
    let consecutiveErrors = 0;
    const maxChecks = 1200; // Extended to 20 minutes with smart intervals
    let currentInterval = 200; // Start with very fast polling (200ms)
    const maxInterval = 3000; // Max 3 seconds between checks
    
    // Enhanced URL detection methods
    const detectCompletionUrl = (detectedUrl: string): string | null => {
      if (!detectedUrl) return null;
      
      const urlLower = detectedUrl.toLowerCase();
      
      // Check completion patterns with priority order
      for (const [status, patterns] of Object.entries(COMPLETION_PATTERNS)) {
        for (const pattern of patterns) {
          if (urlLower.includes(pattern.toLowerCase())) {
            return status;
          }
        }
      }
      
      // Additional domain-based detection for our completion domain
      if (urlLower.includes('protegeresearchsurvey.com')) {
        // If it's our domain but no specific pattern, assume completed
        return 'COMPLETED';
      }
      
      return null;
    };
    
    const performCheck = () => {
      checkCount++;
      try {
        // Method 1: Try to access iframe location directly
        const iframeLocation = iframeRef.current?.contentWindow?.location.href;
        
        if (iframeLocation && iframeLocation !== lastDetectedUrl) {
          setLastDetectedUrl(iframeLocation);
          
          const detectedStatus = detectCompletionUrl(iframeLocation);
          if (detectedStatus) {
            clearAllTimers();
            setCurrentStatus(detectedStatus);
            handleStatusChange(detectedStatus, { 
              completionUrl: iframeLocation,
              detectionMethod: 'iframe_location_direct'
            });
            return;
          }
        }
        
        consecutiveErrors = 0;
        
        // Method 2: Monitor iframe document changes (if accessible)
        try {
          const iframeDoc = iframeRef.current?.contentDocument || 
                           iframeRef.current?.contentWindow?.document;
          
          if (iframeDoc) {
            const currentDocUrl = iframeDoc.URL;
            if (currentDocUrl && currentDocUrl !== lastDetectedUrl) {
              setLastDetectedUrl(currentDocUrl);
              
              const detectedStatus = detectCompletionUrl(currentDocUrl);
              if (detectedStatus) {
                clearAllTimers();
                setCurrentStatus(detectedStatus);
                handleStatusChange(detectedStatus, { 
                  completionUrl: currentDocUrl,
                  detectionMethod: 'iframe_document_url'
                });
                return;
              }
            }
          }
        } catch (docError) {
          // Expected for cross-origin content
        }
        
        // Adaptive polling intervals based on activity and time
        if (checkCount < 150) {
          // First 30 seconds: check every 200ms (high activity period)
          currentInterval = 200;
        } else if (checkCount < 300) {
          // Next minute: check every 500ms
          currentInterval = 500;
        } else if (checkCount < 600) {
          // Next 2 minutes: check every 1s
          currentInterval = 1000;
        } else {
          // After 3 minutes: check every 3s
          currentInterval = 3000;
        }
        
      } catch (error) {
        consecutiveErrors++;
        
        // If we get many consecutive errors, slow down polling
        if (consecutiveErrors > 20) {
          currentInterval = Math.min(currentInterval * 1.2, maxInterval);
        }
      }
      
      // Stop monitoring after max checks
      if (checkCount >= maxChecks) {
        clearAllTimers();
        console.log('IframeMonitor: Stopped monitoring after maximum time reached');
        // Mark as timed out but don't change status if already detected
        if (!currentStatus) {
          handleStatusChange('TIMEOUT', { 
            reason: 'Maximum monitoring time exceeded',
            totalChecks: checkCount
          });
        }
        return;
      }
      
      // Schedule next check with adaptive interval
      intervalRef.current = setTimeout(performCheck, currentInterval);
    };
    
    // Additional monitoring method: Listen for postMessage events
    const handlePostMessage = (event: MessageEvent) => {
      // Listen for completion messages from survey iframe
      if (event.origin && event.data) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          
          if (data.type === 'survey_completion' && data.status) {
            clearAllTimers();
            setCurrentStatus(data.status);
            handleStatusChange(data.status, { 
              completionData: data,
              detectionMethod: 'post_message'
            });
          }
        } catch (e) {
          // Ignore malformed messages
        }
      }
    };
    
    // Clear all timers helper
    const clearAllTimers = () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (urlCheckRef.current) {
        clearTimeout(urlCheckRef.current);
        urlCheckRef.current = null;
      }
      window.removeEventListener('message', handlePostMessage);
    };
    
    // Start monitoring
    window.addEventListener('message', handlePostMessage);
    intervalRef.current = setTimeout(performCheck, currentInterval);
    
    return clearAllTimers;
  }, [iframeLoaded, projectId, uid, lastDetectedUrl]);

  // Enhanced URL monitoring using iframe onLoad events
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const handleIframeLoad = () => {
      try {
        const iframeUrl = iframe.contentWindow?.location.href;
        if (iframeUrl && iframeUrl !== lastDetectedUrl) {
          setLastDetectedUrl(iframeUrl);
          
          // Check for immediate completion detection
          const urlLower = iframeUrl.toLowerCase();
          for (const [status, patterns] of Object.entries(COMPLETION_PATTERNS)) {
            for (const pattern of patterns) {
              if (urlLower.includes(pattern.toLowerCase())) {
                setCurrentStatus(status);
                handleStatusChange(status, { 
                  completionUrl: iframeUrl,
                  detectionMethod: 'iframe_load_event'
                });
                return;
              }
            }
          }
        }
      } catch (error) {
        // Expected for cross-origin
      }
    };

    iframe.addEventListener('load', handleIframeLoad);
    
    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [lastDetectedUrl]);

  // Handle status changes and report to backend with optimized API calls
  const handleStatusChange = async (status: string, data?: any) => {
    try {
      // Avoid duplicate API calls by tracking the last sent status
      if (currentStatus === status) {
        console.log('IframeMonitor: Skipping duplicate status update:', status);
        return;
      }
      
      // Collect essential metadata only to reduce payload size
      const metadata = {
        completionTimestamp: new Date().toISOString(),
        browser: navigator.userAgent.substring(0, 200), // Truncate to reduce size
        screenSize: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        completionUrl: data?.completionUrl,
        referrer: document.referrer.substring(0, 200), // Truncate to reduce size
      };
      
      // Use Promise.race to implement timeout for API calls
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API call timeout')), 5000)
      );
      
      const apiPromise = axios.post('/api/links/update-status', {
        projectId,
        uid,
        status,
        metadata
      });
      
      // Race between API call and timeout
      await Promise.race([apiPromise, timeoutPromise]);
      
      // Notify parent component immediately (don't wait for API)
      onStatusChange(status, {
        metadata,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to update survey status:', error);
      
      // Still notify parent component even if API fails
      onStatusChange(status, {
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      });
    }
  };

  // Handle iframe load event
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    
    try {
      // Try to get the initial URL
      const initialUrl = iframeRef.current?.contentWindow?.location.href;
      
      // Check if we're already on a completion page (unlikely but possible)
      if (initialUrl && initialUrl.includes('protegeresearchsurvey.com')) {
        let status = 'COMPLETED';
        if (initialUrl.includes('/quota')) {
          status = 'QUOTA_FULL';
        } else if (initialUrl.includes('/not-eligible') || initialUrl.includes('/disqualified')) {
          status = 'DISQUALIFIED';
        }
        
        setCurrentStatus(status);
        handleStatusChange(status, { completionUrl: initialUrl });
      } else {
        // Otherwise, mark as started
        handleStatusChange('STARTED');
      }
    } catch (error) {
      // Cross-origin error, just mark as started
      handleStatusChange('STARTED');
    }
  };

  return (
    <div className="iframe-container w-full h-full relative">
      {currentStatus && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white bg-opacity-90">
          <div className="text-center p-8">
            {currentStatus === 'COMPLETED' && (
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-4">Survey Completed</h3>
                <p>Thank you for completing the survey! You'll be redirected shortly.</p>
              </div>
            )}
            
            {currentStatus === 'QUOTA_FULL' && (
              <div>
                <h3 className="text-xl font-bold text-blue-600 mb-4">Survey Quota Full</h3>
                <p>The quota for this survey has been filled. Thank you for your interest!</p>
              </div>
            )}
            
            {currentStatus === 'DISQUALIFIED' && (
              <div>
                <h3 className="text-xl font-bold text-amber-600 mb-4">Not Eligible</h3>
                <p>You don't match the criteria for this survey. Thank you for your interest!</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={url}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0 min-h-[500px]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        title="Survey iframe"
      />
    </div>
  );
};

export default IframeMonitor;
