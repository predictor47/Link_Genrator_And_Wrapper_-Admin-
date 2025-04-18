import axios from 'axios';

interface IPInfoResponse {
  ip: string;
  hosting?: boolean;
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  success?: boolean;
  error?: {
    message: string;
  };
}

/**
 * Check if an IP address is from a VPN, proxy, Tor, or hosting provider
 * using the IPinfo.io API
 */
export async function detectVPN(ip: string | null): Promise<{
  isVPN: boolean;
  isProxy: boolean; 
  isTor: boolean;
  isHosting: boolean;
  details: any;
}> {
  if (!ip) {
    return {
      isVPN: false,
      isProxy: false,
      isTor: false,
      isHosting: false,
      details: { error: 'No IP provided' }
    };
  }
  
  // Use IPinfo API to check if IP is from VPN/proxy
  // You should register for an API key at https://ipinfo.io/
  const apiKey = process.env.IPINFO_API_KEY || '';
  
  try {
    const response = await axios.get<IPInfoResponse>(
      `https://ipinfo.io/${ip}/privacy?token=${apiKey}`
    );
    
    const data = response.data;
    
    return {
      isVPN: data.vpn || false,
      isProxy: data.proxy || false,
      isTor: data.tor || false,
      isHosting: data.hosting || false,
      details: data
    };
  } catch (error) {
    console.error('Error detecting VPN:', error);
    return {
      isVPN: false,
      isProxy: false,
      isTor: false,
      isHosting: false,
      details: { error: 'Failed to detect VPN status' }
    };
  }
}

/**
 * Alternative function using IP-API.com (free tier has limitations)
 */
export async function detectVPNWithIPAPI(ip: string | null): Promise<{
  isVPN: boolean;
  details: any;
}> {
  if (!ip) {
    return {
      isVPN: false,
      details: { error: 'No IP provided' }
    };
  }
  
  try {
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,proxy,hosting`
    );
    
    const data = response.data;
    
    if (data.status === 'success') {
      return {
        isVPN: data.proxy || data.hosting || false,
        details: data
      };
    } else {
      return {
        isVPN: false,
        details: { error: data.message || 'API call failed' }
      };
    }
  } catch (error) {
    console.error('Error detecting VPN with IP-API:', error);
    return {
      isVPN: false,
      details: { error: 'Failed to detect VPN status' }
    };
  }
}