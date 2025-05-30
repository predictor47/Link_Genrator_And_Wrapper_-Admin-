import { useEffect, useRef } from 'react';

interface BehaviorTrackerProps {
  onDataCollected: (data: BehaviorData) => void;
  startTracking?: boolean;
}

export interface BehaviorData {
  mouseMovements: number;
  keyboardEvents: number;
  clickPattern: number[];
  idleTime: number;
  mouseCurve: {x: number, y: number, timestamp: number}[];
  copyPasteEvents: number;
  scrollEvents: number;
  focusEvents: number;
  resizeEvents: number;
  suspiciousPatterns: string[];
  totalTime: number;
  activityRate: number;
}

/**
 * Component to track user behavior for bot detection
 */
const BehaviorTracker: React.FC<BehaviorTrackerProps> = ({ 
  onDataCollected, 
  startTracking = true 
}) => {
  // Store behavior data
  const behaviorData = useRef<BehaviorData>({
    mouseMovements: 0,
    keyboardEvents: 0,
    clickPattern: [],
    idleTime: 0,
    mouseCurve: [],
    copyPasteEvents: 0,
    scrollEvents: 0,
    focusEvents: 0,
    resizeEvents: 0,
    suspiciousPatterns: [],
    totalTime: 0,
    activityRate: 0,
  });
  
  // Track start time for total time calculation
  const startTime = useRef<number>(Date.now());
  
  // Track last activity time for idle detection
  const lastActivity = useRef<number>(Date.now());
  
  // Idle checker interval
  const idleInterval = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!startTracking) return;
    
    // Mouse movement tracking
    const handleMouseMove = (e: MouseEvent) => {
      behaviorData.current.mouseMovements++;
      lastActivity.current = Date.now();
      
      // Detect suspicious patterns
      if (e.movementX === 0 && e.movementY === 0) {
        if (!behaviorData.current.suspiciousPatterns.includes('Zero movement detected')) {
          behaviorData.current.suspiciousPatterns.push('Zero movement detected');
        }
      }
      
      // Detect unusually fast movements
      const movementSpeed = Math.sqrt(e.movementX ** 2 + e.movementY ** 2);
      if (movementSpeed > 50) {
        if (!behaviorData.current.suspiciousPatterns.includes('Unusually fast mouse movement')) {
          behaviorData.current.suspiciousPatterns.push('Unusually fast mouse movement');
        }
      }
      
      // Sample mouse position data (don't track every single movement to save memory)
      if (behaviorData.current.mouseMovements % 10 === 0) { // Sample every 10th movement
        behaviorData.current.mouseCurve.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        });
        
        // Limit stored points to prevent excessive memory usage
        if (behaviorData.current.mouseCurve.length > 100) {
          behaviorData.current.mouseCurve.shift();
        }
      }
    };
    
    // Click tracking
    const handleClick = (e: MouseEvent) => {
      const currentTime = Date.now();
      behaviorData.current.clickPattern.push(currentTime);
      lastActivity.current = currentTime;
      
      // Detect rapid clicking
      if (behaviorData.current.clickPattern.length > 1) {
        const timeDiff = currentTime - behaviorData.current.clickPattern[behaviorData.current.clickPattern.length - 2];
        if (timeDiff < 100) {
          if (!behaviorData.current.suspiciousPatterns.includes('Rapid clicking detected')) {
            behaviorData.current.suspiciousPatterns.push('Rapid clicking detected');
          }
        }
      }
      
      // Limit stored clicks to prevent excessive memory usage
      if (behaviorData.current.clickPattern.length > 50) {
        behaviorData.current.clickPattern.shift();
      }
    };
    
    // Keyboard activity tracking
    const handleKeyDown = (e: KeyboardEvent) => {
      behaviorData.current.keyboardEvents++;
      lastActivity.current = Date.now();
      
      // Detect suspicious keyboard patterns
      if (e.repeat && e.key === ' ') {
        if (!behaviorData.current.suspiciousPatterns.includes('Repeated space key detected')) {
          behaviorData.current.suspiciousPatterns.push('Repeated space key detected');
        }
      }
    };
    
    // Scroll tracking
    const handleScroll = () => {
      behaviorData.current.scrollEvents++;
      lastActivity.current = Date.now();
    };
    
    // Focus tracking
    const handleFocus = () => {
      behaviorData.current.focusEvents++;
      lastActivity.current = Date.now();
    };
    
    // Resize tracking
    const handleResize = () => {
      behaviorData.current.resizeEvents++;
      lastActivity.current = Date.now();
    };
    
    // Copy/paste detection
    const handleCopy = (e: ClipboardEvent) => {
      behaviorData.current.copyPasteEvents++;
      lastActivity.current = Date.now();
    };
    
    const handlePaste = (e: ClipboardEvent) => {
      behaviorData.current.copyPasteEvents++;
      lastActivity.current = Date.now();
    };
    
    // Idle time tracking and data reporting
    idleInterval.current = setInterval(() => {
      const currentTime = Date.now();
      const idleTime = currentTime - lastActivity.current;
      behaviorData.current.idleTime = Math.floor(idleTime / 1000); // Convert to seconds
      
      // Calculate total time and activity rate
      behaviorData.current.totalTime = currentTime - startTime.current;
      const totalTimeInSeconds = behaviorData.current.totalTime / 1000;
      behaviorData.current.activityRate = totalTimeInSeconds > 0 ? 
        (behaviorData.current.mouseMovements + behaviorData.current.keyboardEvents) / totalTimeInSeconds : 0;
      
      // Report data every 5 seconds
      if (idleTime % 5000 < 1000) {
        onDataCollected({ ...behaviorData.current });
      }
    }, 1000);
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('focus', handleFocus);
    document.addEventListener('resize', handleResize);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    
    // Report initial data
    onDataCollected({ ...behaviorData.current });
    
    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focus', handleFocus);
      document.removeEventListener('resize', handleResize);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      
      if (idleInterval.current) {
        clearInterval(idleInterval.current);
      }
      
      // Calculate final data
      const currentTime = Date.now();
      behaviorData.current.totalTime = currentTime - startTime.current;
      const totalTimeInSeconds = behaviorData.current.totalTime / 1000;
      behaviorData.current.activityRate = totalTimeInSeconds > 0 ? 
        (behaviorData.current.mouseMovements + behaviorData.current.keyboardEvents) / totalTimeInSeconds : 0;
      
      // Report final data on unmount
      onDataCollected({ ...behaviorData.current });
    };
  }, [onDataCollected, startTracking]);
  
  // This component doesn't render anything visible
  return null;
};

export default BehaviorTracker;
