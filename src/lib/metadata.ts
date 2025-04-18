import { NextApiRequest } from 'next';
import { detectVPN, detectVPNWithIPAPI } from './vpn-detection';

export interface UserMetadata {
  ip: string | null;
  userAgent: string | null;
  browser: string | null;
  device: string | null;
  timezone: string | null;
  timestamp: number;
  fingerprint: string | null;
  vpnData?: {
    isVPN: boolean;
    isProxy?: boolean;
    isTor?: boolean;
    isHosting?: boolean;
    details: any;
  };
}

/**
 * Extract and collect user metadata from request
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
  
  return {
    ip,
    userAgent,
    browser,
    device,
    timezone: null, // This will be collected from client-side
    timestamp: Date.now(),
    fingerprint: null, // This will be collected from client-side
  };
}

/**
 * Check if metadata contains anomalies that might indicate bot behavior
 */
export function detectAnomalies(metadata: UserMetadata): {isBot: boolean, reasons: string[]} {
  const reasons: string[] = [];
  
  // Check for missing user agent
  if (!metadata.userAgent) {
    reasons.push('Missing user agent');
  }
  
  // Check for VPN/proxy usage if available
  if (metadata.vpnData) {
    if (metadata.vpnData.isVPN) {
      reasons.push('VPN detected');
    }
    
    if (metadata.vpnData.isProxy) {
      reasons.push('Proxy detected');
    }
    
    if (metadata.vpnData.isTor) {
      reasons.push('Tor network detected');
    }
    
    if (metadata.vpnData.isHosting) {
      reasons.push('Hosting provider detected');
    }
  }
  
  // Add more detection logic as needed
  
  return {
    isBot: reasons.length > 0,
    reasons
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
    // Use primary VPN detection method (IPinfo)
    const vpnData = await detectVPN(metadata.ip);
    
    // If primary fails or API key is missing, try alternative method (IP-API)
    if (!vpnData || vpnData.details?.error) {
      const alternativeVpnData = await detectVPNWithIPAPI(metadata.ip);
      return {
        ...metadata,
        vpnData: alternativeVpnData
      };
    }
    
    return {
      ...metadata,
      vpnData
    };
  } catch (error) {
    console.error('Error enhancing metadata with VPN detection:', error);
    return metadata;
  }
}