/**
 * VPN detection service using IPinfo API
 */

interface IPInfoResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  asn?: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
    service: string;
  };
}

/**
 * Check if an IP address is from a VPN, proxy, or Tor network
 * @param ipAddress - The IP address to check
 * @returns Object containing detection results
 */
export async function detectVPN(ipAddress: string) {
  try {
    const apiToken = process.env.IPINFO_API_TOKEN;
    
    if (!apiToken) {
      console.error('Missing IPINFO_API_TOKEN environment variable');
      return {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isRelay: false,
        isHosting: false,
        detectionSuccess: false,
        error: 'API token not configured'
      };
    }

    const response = await fetch(`https://ipinfo.io/${ipAddress}/privacy?token=${apiToken}`);
    
    if (!response.ok) {
      throw new Error(`IPinfo API responded with status ${response.status}`);
    }

    const data: IPInfoResponse = await response.json();

    // If privacy data is not available, the API token might not have the required plan
    if (!data.privacy) {
      return {
        isVpn: false,
        isProxy: false,
        isTor: false,
        isRelay: false, 
        isHosting: false,
        detectionSuccess: false,
        error: 'Privacy detection not available with current IPinfo plan'
      };
    }

    const { vpn, proxy, tor, relay, hosting, service } = data.privacy;

    return {
      isVpn: vpn,
      isProxy: proxy,
      isTor: tor,
      isRelay: relay,
      isHosting: hosting,
      service: service || '',
      detectionSuccess: true,
      ipInfo: {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        org: data.org
      }
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    return {
      isVpn: false,
      isProxy: false,
      isTor: false,
      isRelay: false,
      isHosting: false,
      detectionSuccess: false,
      error: error instanceof Error ? error.message : 'Unknown error during VPN detection'
    };
  }
}

/**
 * Get a requester's IP address from Next.js request
 * @param req - Next.js request object
 * @returns The IP address or null if not found
 */
export function getRequestIp(req: any): string | null {
  // Try to get IP from various headers
  const forwardedFor = req.headers['x-forwarded-for'];
  
  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    return ips[0] || null;
  }
  
  // Try other common headers
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;
  
  // Fallback to connection remote address
  const connectionRemoteAddress = req.connection?.remoteAddress;
  if (connectionRemoteAddress) return connectionRemoteAddress;
  
  // Fallback to socket remote address
  const socketRemoteAddress = req.socket?.remoteAddress;
  if (socketRemoteAddress) return socketRemoteAddress;
  
  return null;
}

/**
 * Block a request if it's coming from a VPN
 * @param req - Next.js request object
 * @param allowLocalhost - Whether to allow localhost/development IPs
 * @returns Object containing the check results
 */
export async function blockVpnRequests(req: any, allowLocalhost = true): Promise<{
  blocked: boolean;
  reason?: string;
  ipAddress?: string;
}> {
  const ipAddress = getRequestIp(req);
  
  if (!ipAddress) {
    return { blocked: false };
  }
  
  // Always allow localhost and private network IPs during development
  if (allowLocalhost && (
    ipAddress === '127.0.0.1' || 
    ipAddress === 'localhost' ||
    ipAddress === '::1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.16.')
  )) {
    return { blocked: false, ipAddress };
  }
  
  const vpnCheck = await detectVPN(ipAddress);
  
  // If detection wasn't successful, don't block to avoid false positives
  if (!vpnCheck.detectionSuccess) {
    console.warn('VPN detection failed:', vpnCheck.error);
    return { blocked: false, ipAddress };
  }
  
  // Block any type of anonymous connection
  if (vpnCheck.isVpn) {
    return { blocked: true, reason: 'VPN detected', ipAddress };
  }
  
  if (vpnCheck.isProxy) {
    return { blocked: true, reason: 'Proxy detected', ipAddress };
  }
  
  if (vpnCheck.isTor) {
    return { blocked: true, reason: 'Tor network detected', ipAddress };
  }
  
  return { blocked: false, ipAddress };
}