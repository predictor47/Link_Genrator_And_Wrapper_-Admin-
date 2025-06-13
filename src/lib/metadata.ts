import { NextApiRequest } from 'next';
import { detectVPN } from './vpn-detection';
import { enhancedFingerprintingService, EnhancedFingerprint } from './enhanced-fingerprinting';

export interface UserMetadata {
  ip: string | null;
  userAgent: string | null;
  browser: string | null;
  device: string | null;
  timezone: string | null;
  timestamp: number;
  fingerprint: string | null;
  language: string | null;
  
  // Enhanced fingerprinting data
  enhancedFingerprint?: EnhancedFingerprint;
  
  screen?: {
    width: number;
    height: number;
    colorDepth?: number;
    pixelRatio?: number;
    availWidth?: number;
    availHeight?: number;
    orientation?: string;
  };
  plugins?: string[];
  fonts?: string[];
  webGL?: {
    vendor: string;
    renderer: string;
    version?: string;
    extensions?: string[];
    maxTextureSize?: number;
  };
  canvas?: string;
  behavioral?: {
    mouseMovements: number;
    keyboardEvents: number;
    totalTime: number;
    clickPattern?: number[];
    formCompletionTime?: number;
    idleTime?: number;
    scrollEvents?: number;
    focusEvents?: number;
    resizeEvents?: number;
    suspiciousPatterns?: string[];
  };
  vpnData?: {
    isVPN: boolean;
    isProxy?: boolean;
    isTor?: boolean;
    isHosting?: boolean;
    confidence?: number;
    risk?: string;
    details?: any;
  };
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
    isMismatch?: boolean;
    timezone?: string;
    isp?: string;
    org?: string;
  };
  network?: {
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  hardware?: {
    cores?: number;
    memory?: number;
    platform?: string;
    architecture?: string;
    vendor?: string;
    maxTouchPoints?: number;
  };
  security?: {
    cookiesEnabled?: boolean;
    doNotTrack?: boolean;
    secureContext?: boolean;
    permissions?: Record<string, string>;
  };
  advanced?: {
    audioFingerprint?: string;
    webRTCFingerprint?: string;
    speechSynthesis?: string[];
    mediaDevices?: string[];
    batteryLevel?: number;
    charging?: boolean;
    gamepads?: number;
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
 * Collect enhanced client-side metadata with comprehensive fingerprinting
 */
export async function collectEnhancedClientMetadata(): Promise<UserMetadata> {
  try {
    // Generate comprehensive fingerprint
    const enhancedFingerprint = await enhancedFingerprintingService.generateFingerprint();
    
    // Basic info that's always available
    const metadata: UserMetadata = {
      ip: null, // Will be added from server-side
      userAgent: navigator.userAgent,
      browser: detectBrowser(),
      device: detectDevice(),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now(),
      fingerprint: enhancedFingerprint.deviceId,
      enhancedFingerprint
    };

    // Extract data from enhanced fingerprint for compatibility
    if (enhancedFingerprint.screen) {
      metadata.screen = enhancedFingerprint.screen;
    }

    if (enhancedFingerprint.browser) {
      metadata.plugins = enhancedFingerprint.browser.plugins;
    }

    if (enhancedFingerprint.graphics) {
      metadata.webGL = enhancedFingerprint.graphics.webGL;
      metadata.canvas = enhancedFingerprint.graphics.canvas.fingerprint;
    }

    if (enhancedFingerprint.behavioral) {
      metadata.behavioral = {
        mouseMovements: enhancedFingerprint.behavioral.mouseMovements.length,
        keyboardEvents: enhancedFingerprint.behavioral.keyboardEvents.length,
        totalTime: enhancedFingerprint.behavioral.timeOnPage,
        idleTime: enhancedFingerprint.behavioral.idleTime,
        scrollEvents: enhancedFingerprint.behavioral.scrollEvents.length,
        focusEvents: enhancedFingerprint.behavioral.focusEvents.length,
        resizeEvents: enhancedFingerprint.behavioral.resizeEvents.length,
        suspiciousPatterns: enhancedFingerprint.behavioral.suspiciousPatterns
      };
    }

    if (enhancedFingerprint.network) {
      metadata.network = enhancedFingerprint.network;
    }

    if (enhancedFingerprint.hardware) {
      metadata.hardware = {
        cores: enhancedFingerprint.hardware.cores,
        memory: enhancedFingerprint.hardware.memory,
        platform: enhancedFingerprint.platform,
        maxTouchPoints: enhancedFingerprint.hardware.maxTouchPoints
      };
    }

    if (enhancedFingerprint.browser) {
      metadata.security = {
        cookiesEnabled: enhancedFingerprint.browser.cookiesEnabled,
        doNotTrack: enhancedFingerprint.browser.doNotTrack,
        secureContext: window.isSecureContext,
        permissions: enhancedFingerprint.advanced.permissions
      };
    }

    if (enhancedFingerprint.advanced) {
      metadata.fonts = enhancedFingerprint.advanced.fonts;
    }

    return metadata;
  } catch (error) {
    console.error('Error collecting enhanced metadata:', error);
    // Fallback to basic collection
    return collectClientMetadata();
  }
}

export function collectClientMetadata(): UserMetadata {
  const timestamp = Date.now();
  const fingerprint = generateFingerprint();
  
  const metadata: UserMetadata = {
    ip: null, // Will be set server-side
    userAgent: navigator.userAgent,
    browser: detectBrowser(),
    device: detectDevice(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp,
    fingerprint,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      orientation: window.screen.orientation?.type || 'unknown',
    },
    behavioral: {
      mouseMovements: 0,
      keyboardEvents: 0,
      totalTime: 0,
      clickPattern: [],
      scrollEvents: 0,
      focusEvents: 0,
      resizeEvents: 0,
      suspiciousPatterns: [],
    }
  };

  // Collect plugins if available
  try {
    metadata.plugins = Array.from(navigator.plugins).map(p => p.name);
    
    // Enhanced Canvas fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      
      // Text rendering with multiple fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 25);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Browser Fingerprint', 4, 17);
      
      // Add more complexity for better fingerprinting
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      
      metadata.canvas = canvas.toDataURL();
    }
    
    // Enhanced WebGL fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && 'getParameter' in gl) {
        const webglContext = gl as WebGLRenderingContext;
        const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
        metadata.webGL = {
          vendor: webglContext.getParameter(webglContext.VENDOR),
          renderer: webglContext.getParameter(webglContext.RENDERER),
          version: webglContext.getParameter(webglContext.VERSION),
          extensions: webglContext.getSupportedExtensions() || [],
          maxTextureSize: webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE),
        };
        
        if (debugInfo) {
          metadata.webGL.vendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          metadata.webGL.renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      console.log('WebGL fingerprinting not available');
    }
  } catch (e) {
    console.log('Canvas fingerprinting not available');
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
  let scrollEvents = 0;
  let focusEvents = 0;
  let resizeEvents = 0;
  const clickTimes: number[] = [];
  const suspiciousPatterns: string[] = [];
  let lastActivityTime = Date.now();
  let idleTime = 0;
  
  // Track mouse movements (frequency, not actual positions for privacy)
  const trackMouseMovement = (e: MouseEvent) => {
    mouseMovements++;
    lastActivityTime = Date.now();
    
    // Detect suspicious mouse patterns
    if (e.movementX === 0 && e.movementY === 0) {
      suspiciousPatterns.push('Zero movement detected');
    }
    
    // Detect unusually straight line movements
    const movementSpeed = Math.sqrt(e.movementX ** 2 + e.movementY ** 2);
    if (movementSpeed > 50) {
      suspiciousPatterns.push('Unusually fast mouse movement');
    }
  };
  
  // Track keyboard events (frequency, not actual keys for privacy)
  const trackKeyboard = (e: KeyboardEvent) => {
    keyboardEvents++;
    lastActivityTime = Date.now();
    
    // Detect suspicious keyboard patterns
    if (e.repeat && e.key === ' ') {
      suspiciousPatterns.push('Repeated space key detected');
    }
  };
  
  // Track scroll events
  const trackScroll = () => {
    scrollEvents++;
    lastActivityTime = Date.now();
  };
  
  // Track focus events
  const trackFocus = () => {
    focusEvents++;
    lastActivityTime = Date.now();
  };
  
  // Track resize events
  const trackResize = () => {
    resizeEvents++;
    lastActivityTime = Date.now();
  };
  
  // Track clicks and their timing patterns
  const trackClick = (e: MouseEvent) => {
    clickTimes.push(Date.now());
    lastActivityTime = Date.now();
    
    // Detect rapid clicking
    if (clickTimes.length > 1) {
      const timeDiff = clickTimes[clickTimes.length - 1] - clickTimes[clickTimes.length - 2];
      if (timeDiff < 100) {
        suspiciousPatterns.push('Rapid clicking detected');
      }
    }
    
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
  window.addEventListener('scroll', trackScroll);
  window.addEventListener('focus', trackFocus);
  window.addEventListener('resize', trackResize);
  
  // Return a function that stops tracking and returns the updated metadata
  return () => {
    // Remove event listeners
    window.removeEventListener('mousemove', trackMouseMovement);
    window.removeEventListener('keydown', trackKeyboard);
    window.removeEventListener('click', trackClick);
    window.removeEventListener('scroll', trackScroll);
    window.removeEventListener('focus', trackFocus);
    window.removeEventListener('resize', trackResize);
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
        scrollEvents: 0,
        focusEvents: 0,
        resizeEvents: 0,
        suspiciousPatterns: [],
      };
    }
    
    metadata.behavioral.mouseMovements = mouseMovements;
    metadata.behavioral.keyboardEvents = keyboardEvents;
    metadata.behavioral.totalTime = Date.now() - startTime;
    metadata.behavioral.clickPattern = clickPattern;
    metadata.behavioral.idleTime = idleTime;
    metadata.behavioral.scrollEvents = scrollEvents;
    metadata.behavioral.focusEvents = focusEvents;
    metadata.behavioral.resizeEvents = resizeEvents;
    metadata.behavioral.suspiciousPatterns = Array.from(new Set(suspiciousPatterns));
    
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
    
    // Check for suspicious patterns detected during tracking
    if (metadata.behavioral.suspiciousPatterns && metadata.behavioral.suspiciousPatterns.length > 0) {
      reasons.push(`Behavioral anomalies: ${metadata.behavioral.suspiciousPatterns.join(', ')}`);
      score += metadata.behavioral.suspiciousPatterns.length * 5;
    }
    
    // Check for lack of natural user interactions
    if (metadata.behavioral.totalTime > 10000) {
      if (metadata.behavioral.scrollEvents === 0) {
        reasons.push('No scroll activity detected');
        score += 10;
      }
      
      if (metadata.behavioral.focusEvents === 0) {
        reasons.push('No focus events detected');
        score += 10;
      }
    }
    
    // Check for unusually high activity rates
    const activityRate = (metadata.behavioral.mouseMovements + metadata.behavioral.keyboardEvents) / 
                        (metadata.behavioral.totalTime / 1000);
    if (activityRate > 10) {
      reasons.push('Unusually high activity rate');
      score += 15;
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
  
  // Check hardware characteristics
  if (metadata.hardware) {
    // Headless browsers often have specific characteristics
    if (!metadata.hardware.cores || metadata.hardware.cores === 1) {
      reasons.push('Unusual hardware profile');
      score += 10;
    }
    
    if (metadata.hardware.maxTouchPoints === 0 && metadata.device === 'Mobile') {
      reasons.push('Mobile device without touch support');
      score += 15;
    }
  }
  
  // Check WebGL characteristics
  if (metadata.webGL) {
    // Some automated browsers have specific WebGL signatures
    if (metadata.webGL.renderer.includes('SwiftShader') || 
        metadata.webGL.renderer.includes('Mesa')) {
      reasons.push('Software-rendered graphics detected');
      score += 20;
    }
  }
  
  // Check screen characteristics
  if (metadata.screen) {
    // Common headless browser resolutions
    const commonHeadlessSizes = ['1280x720', '1920x1080', '800x600'];
    const screenSize = `${metadata.screen.width}x${metadata.screen.height}`;
    if (commonHeadlessSizes.includes(screenSize) && metadata.behavioral?.mouseMovements === 0) {
      reasons.push('Common headless browser screen size with no mouse activity');
      score += 15;
    }
  }
  
  // Check for missing advanced features
  if (!metadata.advanced?.audioFingerprint && !metadata.advanced?.speechSynthesis?.length) {
    reasons.push('Missing audio capabilities');
    score += 10;
  }
  
  return {
    isBot: score > 50, // Adjusted threshold for enhanced detection
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

// Helper functions
function generateFingerprint(): string {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled,
      navigator.doNotTrack || 'unknown'
    ];
    
    // Simple hash function
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  } catch (e) {
    return Math.random().toString(16).substring(2);
  }
}

function detectBrowser(): string | null {
  try {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  } catch (e) {
    return null;
  }
}

function detectDevice(): string {
  try {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
      return 'Mobile';
    }
    if (/Tablet|iPad/i.test(userAgent)) {
      return 'Tablet';
    }
    return 'Desktop';
  } catch (e) {
    return 'Unknown';
  }
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

/**
 * Generate a comprehensive metadata report for analysis
 */
export function generateMetadataReport(metadata: UserMetadata): {
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: string[];
  recommendations: string[];
} {
  const anomalies = detectAnomalies(metadata);
  const findings: string[] = [];
  const recommendations: string[] = [];
  
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  
  if (anomalies.score > 70) {
    riskLevel = 'CRITICAL';
    recommendations.push('Block this user immediately');
    recommendations.push('Investigate traffic source');
  } else if (anomalies.score > 50) {
    riskLevel = 'HIGH';
    recommendations.push('Flag for manual review');
    recommendations.push('Implement additional verification');
  } else if (anomalies.score > 30) {
    riskLevel = 'MEDIUM';
    recommendations.push('Monitor closely');
    recommendations.push('Consider additional validation');
  } else {
    riskLevel = 'LOW';
    recommendations.push('Normal user behavior detected');
  }
  
  // Browser analysis
  if (metadata.browser) {
    findings.push(`Browser: ${metadata.browser}`);
  }
  
  // Device analysis
  if (metadata.device) {
    findings.push(`Device: ${metadata.device}`);
  }
  
  // Hardware analysis
  if (metadata.hardware) {
    findings.push(`Hardware: ${metadata.hardware.cores} cores, ${metadata.hardware.platform}`);
  }
  
  // Network analysis
  if (metadata.network?.connectionType) {
    findings.push(`Connection: ${metadata.network.connectionType}`);
  }
  
  // VPN analysis
  if (metadata.vpnData) {
    if (metadata.vpnData.isVPN) {
      findings.push('VPN usage detected');
    }
    if (metadata.vpnData.isProxy) {
      findings.push('Proxy usage detected');
    }
  }
  
  // Behavioral analysis
  if (metadata.behavioral) {
    const totalTime = metadata.behavioral.totalTime / 1000; // Convert to seconds
    const activityRate = totalTime > 0 ? 
      (metadata.behavioral.mouseMovements + metadata.behavioral.keyboardEvents) / totalTime : 0;
    
    findings.push(`Activity rate: ${activityRate.toFixed(2)} events/second`);
    findings.push(`Total interaction time: ${totalTime.toFixed(1)} seconds`);
    
    if (metadata.behavioral.suspiciousPatterns?.length) {
      findings.push(`Suspicious patterns: ${metadata.behavioral.suspiciousPatterns.join(', ')}`);
    }
  }
  
  const summary = `Risk Level: ${riskLevel} (Score: ${anomalies.score}/100). ${anomalies.reasons.length} anomalies detected.`;
  
  return {
    summary,
    riskLevel,
    findings,
    recommendations
  };
}

/**
 * Extract key metadata fields for CSV export
 */
export function extractMetadataForExport(metadata: UserMetadata): Record<string, any> {
  return {
    browser: metadata.browser || 'Unknown',
    device: metadata.device || 'Unknown',
    os: metadata.hardware?.platform || 'Unknown',
    timezone: metadata.timezone || 'Unknown',
    language: metadata.language || 'Unknown',
    screenResolution: metadata.screen ? `${metadata.screen.width}x${metadata.screen.height}` : 'Unknown',
    colorDepth: metadata.screen?.colorDepth || 'Unknown',
    pixelRatio: metadata.screen?.pixelRatio || 'Unknown',
    hardwareCores: metadata.hardware?.cores || 'Unknown',
    memory: metadata.hardware?.memory || 'Unknown',
    connectionType: metadata.network?.connectionType || 'Unknown',
    effectiveConnectionType: metadata.network?.effectiveType || 'Unknown',
    cookiesEnabled: metadata.security?.cookiesEnabled || 'Unknown',
    doNotTrack: metadata.security?.doNotTrack || 'Unknown',
    isVPN: metadata.vpnData?.isVPN || false,
    isProxy: metadata.vpnData?.isProxy || false,
    isTor: metadata.vpnData?.isTor || false,
    country: metadata.geoLocation?.country || 'Unknown',
    region: metadata.geoLocation?.region || 'Unknown',
    city: metadata.geoLocation?.city || 'Unknown',
    mouseMovements: metadata.behavioral?.mouseMovements || 0,
    keyboardEvents: metadata.behavioral?.keyboardEvents || 0,
    clickEvents: metadata.behavioral?.clickPattern?.length || 0,
    scrollEvents: metadata.behavioral?.scrollEvents || 0,
    totalTime: metadata.behavioral?.totalTime || 0,
    idleTime: metadata.behavioral?.idleTime || 0,
    suspiciousPatterns: metadata.behavioral?.suspiciousPatterns?.join('; ') || 'None',
    botScore: detectAnomalies(metadata).score,
    botReasons: detectAnomalies(metadata).reasons.join('; ') || 'None',
    fingerprint: metadata.fingerprint || 'Unknown',
    webGLVendor: metadata.webGL?.vendor || 'Unknown',
    webGLRenderer: metadata.webGL?.renderer || 'Unknown',
    audioFingerprint: metadata.advanced?.audioFingerprint ? 'Available' : 'Not Available',
    mediaDevices: metadata.advanced?.mediaDevices?.length || 0,
    batteryLevel: metadata.advanced?.batteryLevel || 'Unknown',
    gamepads: metadata.advanced?.gamepads || 0,
  };
}
