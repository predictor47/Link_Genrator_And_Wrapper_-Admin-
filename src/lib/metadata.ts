import { NextApiRequest } from 'next';
import { detectVPN } from './vpn-detection';

export interface UserMetadata {
  ip: string | null;
  userAgent: string | null;
  browser: string | null;
  device: string | null;
  timezone: string | null;
  timestamp: number;
  fingerprint: string | null;
  language: string | null;
  screen?: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  plugins?: string[];
  fonts?: string[];
  webGL?: any;
  canvas?: string;
  behavioral?: {
    mouseMovements: number;
    keyboardEvents: number;
    totalTime: number;
    clickPattern: number[];
    formCompletionTime?: number;
    idleTime?: number;
  };
  vpnData?: {
    isVPN: boolean;
    isProxy?: boolean;
    isTor?: boolean;
    isHosting?: boolean;
    details: any;
  };
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
    isMismatch?: boolean; // True if browser geo doesn't match IP geo
  };
}

/**
 * Extract and collect user metadata from request (server-side)
 */
export function collectMetadata(req: NextApiRequest): UserMetadata {
  const userAgent = req.headers['user-agent'] || null;
  
  // Basic browser and device detection based on user agent
  let browser = null;
  let device = null;
  
  if (userAgent) {
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      browser = 'Internet Explorer';
    }

    if (userAgent.includes('Mobile')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      device = 'Tablet';
    } else {
      device = 'Desktop';
    }
  }
  
  const ip = req.headers['x-forwarded-for'] as string || 
      req.socket.remoteAddress || 
      null;
  
  const acceptLanguage = req.headers['accept-language'] || null;
  let language = null;
  
  if (acceptLanguage) {
    language = acceptLanguage.split(',')[0];
  }
  
  return {
    ip,
    userAgent,
    browser,
    device,
    language,
    timezone: null, // This will be collected from client-side
    timestamp: Date.now(),
    fingerprint: null, // This will be collected from client-side
  };
}

/**
 * Collect client-side metadata (to be called from browser)
 */
export function collectClientMetadata(): UserMetadata {
  // Basic info that's always available
  const metadata: UserMetadata = {
    ip: null, // Will be added from server-side
    userAgent: navigator.userAgent,
    browser: detectBrowser(),
    device: detectDevice(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: Date.now(),
    fingerprint: generateFingerprint(),
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    behavioral: {
      mouseMovements: 0,
      keyboardEvents: 0,
      totalTime: 0,
      clickPattern: [],
    }
  };

  // Generate more sophisticated fingerprint data
  try {
    metadata.plugins = Array.from(navigator.plugins).map(p => p.name);
    
    // Canvas fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      
      // Text rendering
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 25);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Browser Fingerprint', 4, 17);
      
      metadata.canvas = canvas.toDataURL();
    }
    
    // WebGL fingerprinting
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        metadata.webGL = {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
        };
      }
    } catch (e) {
      // WebGL not available
    }
  } catch (e) {
    console.error('Error collecting advanced fingerprinting data:', e);
  }

  return metadata;
}

/**
 * Start behavioral tracking for bot detection
 */
export function startBehavioralTracking(metadata: UserMetadata): () => UserMetadata {
  const startTime = Date.now();
  let mouseMovements = 0;
  let keyboardEvents = 0;
  const clickTimes: number[] = [];
  let lastActivityTime = Date.now();
  let idleTime = 0;
  
  // Track mouse movements (frequency, not actual positions for privacy)
  const trackMouseMovement = () => {
    mouseMovements++;
    lastActivityTime = Date.now();
  };
  
  // Track keyboard events (frequency, not actual keys for privacy)
  const trackKeyboard = () => {
    keyboardEvents++;
    lastActivityTime = Date.now();
  };
  
  // Track clicks and their timing patterns
  const trackClick = () => {
    clickTimes.push(Date.now());
    lastActivityTime = Date.now();
    if (clickTimes.length > 20) {
      clickTimes.shift(); // Keep only last 20 clicks
    }
  };
  
  // Track idle time
  const checkIdle = setInterval(() => {
    const currentTime = Date.now();
    if (currentTime - lastActivityTime > 5000) { // 5 seconds idle threshold
      idleTime += (currentTime - lastActivityTime);
      lastActivityTime = currentTime;
    }
  }, 5000);
  
  // Add event listeners
  window.addEventListener('mousemove', trackMouseMovement);
  window.addEventListener('keydown', trackKeyboard);
  window.addEventListener('click', trackClick);
  
  // Return a function that stops tracking and returns the updated metadata
  return () => {
    // Remove event listeners
    window.removeEventListener('mousemove', trackMouseMovement);
    window.removeEventListener('keydown', trackKeyboard);
    window.removeEventListener('click', trackClick);
    clearInterval(checkIdle);
    
    // Calculate click patterns (intervals between clicks)
    const clickPattern: number[] = [];
    for (let i = 1; i < clickTimes.length; i++) {
      clickPattern.push(clickTimes[i] - clickTimes[i-1]);
    }
    
    // Update and return metadata with behavioral data
    if (!metadata.behavioral) {
      metadata.behavioral = {
        mouseMovements: 0,
        keyboardEvents: 0,
        totalTime: 0,
        clickPattern: [],
      };
    }
    
    metadata.behavioral.mouseMovements = mouseMovements;
    metadata.behavioral.keyboardEvents = keyboardEvents;
    metadata.behavioral.totalTime = Date.now() - startTime;
    metadata.behavioral.clickPattern = clickPattern;
    metadata.behavioral.idleTime = idleTime;
    
    return metadata;
  };
}

/**
 * Check if metadata contains anomalies that might indicate bot behavior
 */
export function detectAnomalies(metadata: UserMetadata): {isBot: boolean, reasons: string[], score: number} {
  const reasons: string[] = [];
  let score = 0; // Higher score = more likely to be a bot (0-100)
  
  // Check for missing user agent
  if (!metadata.userAgent) {
    reasons.push('Missing user agent');
    score += 25;
  }
  
  // Check for VPN/proxy usage if available
  if (metadata.vpnData) {
    if (metadata.vpnData.isVPN) {
      reasons.push('VPN detected');
      score += 15;
    }
    
    if (metadata.vpnData.isProxy) {
      reasons.push('Proxy detected');
      score += 20;
    }
    
    if (metadata.vpnData.isTor) {
      reasons.push('Tor network detected');
      score += 30;
    }
    
    if (metadata.vpnData.isHosting) {
      reasons.push('Hosting provider detected');
      score += 35;
    }
  }
  
  // Check behavioral patterns
  if (metadata.behavioral) {
    // Check for unnaturally low mouse movements
    if (metadata.behavioral.totalTime > 30000 && metadata.behavioral.mouseMovements < 5) {
      reasons.push('Suspicious lack of mouse movement');
      score += 15;
    }
    
    // Check for too perfect timing between clicks (bot-like precision)
    if (metadata.behavioral.clickPattern && metadata.behavioral.clickPattern.length > 2) {
      const patterns = metadata.behavioral.clickPattern.slice(0, -1);
      const diffs = [];
      for (let i = 1; i < patterns.length; i++) {
        diffs.push(Math.abs(patterns[i] - patterns[i-1]));
      }
      
      // If click timing is too consistent (standard deviation is very low)
      const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const stdDev = Math.sqrt(diffs.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / diffs.length);
      
      if (stdDev < 50 && diffs.length > 3) { // Unnaturally consistent timing
        reasons.push('Suspicious click pattern consistency');
        score += 20;
      }
    }
    
    // Check for extremely fast form completion
    if (metadata.behavioral.formCompletionTime && metadata.behavioral.formCompletionTime < 2000) {
      reasons.push('Suspiciously fast form completion');
      score += 30;
    }
  }
  
  // Check for inconsistent fingerprints (if compared with initial)
  if (metadata.fingerprint === null) {
    reasons.push('Missing browser fingerprint');
    score += 15;
  }
  
  // Check for geolocation mismatch
  if (metadata.geoLocation?.isMismatch) {
    reasons.push('Geolocation mismatch between IP and browser');
    score += 20;
  }
  
  return {
    isBot: score > 40, // Threshold for bot detection
    reasons,
    score
  };
}

/**
 * Enhance metadata with VPN detection
 */
export async function enhanceMetadataWithVPNDetection(metadata: UserMetadata): Promise<UserMetadata> {
  if (!metadata.ip) {
    return metadata;
  }
  
  try {
    // Use VPN detection method (IPinfo)
    const vpnData = await detectVPN(metadata.ip);
    
    if (!vpnData || !vpnData.detectionSuccess) {
      console.error('VPN detection failed or returned no results');
      return metadata;
    }
    
    return {
      ...metadata,
      vpnData: {
        isVPN: vpnData.isVpn,
        isProxy: vpnData.isProxy,
        isTor: vpnData.isTor,
        isHosting: vpnData.isHosting,
        details: {
          service: vpnData.service,
          ipInfo: vpnData.ipInfo
        }
      }
    };
  } catch (error) {
    console.error('Error enhancing metadata with VPN detection:', error);
    return metadata;
  }
}

/**
 * Generate a browser fingerprint
 */
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    navigator.cookieEnabled,
    navigator.hardwareConcurrency,
    screen.width + 'x' + screen.height,
    navigator.platform,
  ];
  
  // Create a hash of the components
  let hash = 0;
  const str = components.join('###');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

/**
 * Detect browser from user agent
 */
function detectBrowser(): string | null {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'Internet Explorer';
  
  return null;
}

/**
 * Detect device type from user agent
 */
function detectDevice(): string {
  const ua = navigator.userAgent;
  
  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

/**
 * Calculate consistency between two sets of metadata
 * Returns a score between 0-100 where 100 is completely consistent
 */
export function calculateMetadataConsistency(initial: UserMetadata, final: UserMetadata): number {
  let score = 100;
  
  // Compare user agent
  if (initial.userAgent !== final.userAgent) {
    score -= 30;
  }
  
  // Compare browser fingerprint
  if (initial.fingerprint !== final.fingerprint) {
    score -= 20;
  }
  
  // Compare screen dimensions
  if (initial.screen && final.screen) {
    if (
      initial.screen.width !== final.screen.width || 
      initial.screen.height !== final.screen.height
    ) {
      score -= 15;
    }
  }
  
  // Compare timezone
  if (initial.timezone !== final.timezone) {
    score -= 15;
  }
  
  // Compare language
  if (initial.language !== final.language) {
    score -= 10;
  }
  
  // Compare IP address (significant change)
  if (initial.ip !== final.ip) {
    score -= 25;
  }
  
  return Math.max(0, score);
}