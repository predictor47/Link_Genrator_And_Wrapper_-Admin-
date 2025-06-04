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
 * This component embeds a survey URL in an iframe and watches for redirects to 
 * predetermined completion URLs to determine survey outcome.
 */
const IframeMonitor: React.FC<IframeMonitorProps> = ({
  projectId,
  uid,
  url,
  onStatusChange
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set up optimized monitoring with dynamic intervals and multiple detection methods
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return;
    
    let checkCount = 0;
    let consecutiveErrors = 0;
    const maxChecks = 600; // Extend to 10 minutes but with smart intervals
    let currentInterval = 500; // Start with faster polling (500ms)
    const maxInterval = 2000; // Max 2 seconds between checks
    
    // Track last known URL to detect changes faster
    let lastKnownUrl = '';
    
    const performCheck = () => {
      checkCount++;
      try {
        // Try to access the location to check if it's on our domain
        const iframeLocation = iframeRef.current?.contentWindow?.location.href;
        
        // Reset error count on successful access
        consecutiveErrors = 0;
        
        // Check if URL has changed
        if (iframeLocation !== lastKnownUrl) {
          lastKnownUrl = iframeLocation || '';
          
          // If redirected to our completion domain, process immediately
          if (iframeLocation && iframeLocation.includes('protegeresearchsurvey.com')) {
            clearInterval(intervalRef.current!);
            
            // Determine completion status based on URL with improved detection
            let status = 'COMPLETED';
            const urlLower = iframeLocation.toLowerCase();
            
            if (urlLower.includes('/quota') || urlLower.includes('quota-full')) {
              status = 'QUOTA_FULL';
            } else if (urlLower.includes('/not-eligible') || urlLower.includes('/disqualified') || 
                      urlLower.includes('/screened') || urlLower.includes('/terminate')) {
              status = 'DISQUALIFIED';
            } else if (urlLower.includes('/thank') || urlLower.includes('/complete') || 
                      urlLower.includes('/finish') || urlLower.includes('/end')) {
              status = 'COMPLETED';
            }
            
            setCurrentStatus(status);
            handleStatusChange(status, { completionUrl: iframeLocation });
            return;
          }
        }
        
        // Adjust polling interval based on activity
        if (checkCount < 60) {
          // First minute: check every 500ms (high activity period)
          currentInterval = 500;
        } else if (checkCount < 180) {
          // Next 2 minutes: check every 1s
          currentInterval = 1000;
        } else {
          // After 3 minutes: check every 2s
          currentInterval = 2000;
        }
        
      } catch (error) {
        consecutiveErrors++;
        
        // If we get many consecutive errors, slow down polling to reduce CPU usage
        if (consecutiveErrors > 10) {
          currentInterval = Math.min(currentInterval * 1.5, maxInterval);
        }
        
        // This is expected when the iframe is showing the survey (cross-origin)
        // We'll just continue monitoring
      }
      
      // Stop monitoring after max checks
      if (checkCount >= maxChecks) {
        clearInterval(intervalRef.current!);
        console.log('IframeMonitor: Stopped monitoring after maximum checks reached');
        return;
      }
      
      // Schedule next check with dynamic interval
      intervalRef.current = setTimeout(performCheck, currentInterval);
    };
    
    // Start monitoring
    intervalRef.current = setTimeout(performCheck, currentInterval);
    
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [iframeLoaded, projectId, uid]);

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
