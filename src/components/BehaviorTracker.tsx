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
    copyPasteEvents: 0
  });
  
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
      behaviorData.current.clickPattern.push(Date.now());
      lastActivity.current = Date.now();
      
      // Limit stored clicks to prevent excessive memory usage
      if (behaviorData.current.clickPattern.length > 50) {
        behaviorData.current.clickPattern.shift();
      }
    };
    
    // Keyboard activity tracking
    const handleKeyDown = (e: KeyboardEvent) => {
      behaviorData.current.keyboardEvents++;
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
    
    // Idle time tracking
    idleInterval.current = setInterval(() => {
      const currentTime = Date.now();
      const idleTime = currentTime - lastActivity.current;
      behaviorData.current.idleTime = Math.floor(idleTime / 1000); // Convert to seconds
      
      // Report data every 5 seconds
      if (idleTime % 5000 < 1000) {
        onDataCollected({ ...behaviorData.current });
      }
    }, 1000);
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    
    // Report initial data
    onDataCollected({ ...behaviorData.current });
    
    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      
      if (idleInterval.current) {
        clearInterval(idleInterval.current);
      }
      
      // Report final data on unmount
      onDataCollected({ ...behaviorData.current });
    };
  }, [onDataCollected, startTracking]);
  
  // This component doesn't render anything visible
  return null;
};

export default BehaviorTracker;
