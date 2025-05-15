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

  // Set up monitoring
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return;
    
    let checkCount = 0;
    const maxChecks = 300; // Check for 5 minutes (300s) max
    
    // Set up an interval to periodically check the iframe location
    intervalRef.current = setInterval(() => {
      checkCount++;
      try {
        // Try to access the location to check if it's on our domain
        const iframeLocation = iframeRef.current?.contentWindow?.location.href;
        
        if (iframeLocation && iframeLocation.includes('protegeresearchsurvey.com')) {
          // Survey has redirected to one of our completion pages
          clearInterval(intervalRef.current!);
          
          // Determine completion status based on URL
          let status = 'COMPLETED';
          if (iframeLocation.includes('/quota')) {
            status = 'QUOTA_FULL';
          } else if (iframeLocation.includes('/not-eligible') || iframeLocation.includes('/disqualified')) {
            status = 'DISQUALIFIED';
          }
          
          setCurrentStatus(status);
          handleStatusChange(status, { completionUrl: iframeLocation });
        }
      } catch (error) {
        // If we get a cross-origin error, the iframe is on a different domain
        // This is expected when the iframe is showing the survey
        // We'll just continue monitoring
      }
      
      // Stop monitoring after max checks
      if (checkCount >= maxChecks) {
        clearInterval(intervalRef.current!);
      }
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [iframeLoaded, projectId, uid]);

  // Handle status changes and report to backend
  const handleStatusChange = async (status: string, data?: any) => {
    try {
      // Collect all available metadata
      const metadata = {
        completionTimestamp: new Date().toISOString(),
        browser: navigator.userAgent,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
        },
        language: navigator.language,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        completionUrl: data?.completionUrl,
        referrer: document.referrer,
      };
      
      // Update the survey link status via API
      await axios.post('/api/links/update-status', {
        projectId,
        uid,
        status,
        metadata
      });
      
      // Notify parent component
      onStatusChange(status, {
        metadata,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to update survey status:', error);
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
