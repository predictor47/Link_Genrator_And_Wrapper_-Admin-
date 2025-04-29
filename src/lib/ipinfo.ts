/**
 * IPinfo API Client
 * 
 * This module provides a client for the IPinfo API to retrieve information about IP addresses
 * including geolocation, ASN, and privacy detection (VPN, proxy, etc.)
 * 
 * Documentation: https://ipinfo.io/developers
 */

import fetch from 'node-fetch';

// Define the shape of IPinfo API response
export interface IPinfoResponse {
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
  company?: {
    name: string;
    domain: string;
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
  abuse?: {
    address: string;
    country: string;
    email: string;
    name: string;
    network: string;
    phone: string;
  };
}

/**
 * Get detailed information about an IP address using the IPinfo API
 * 
 * @param ip - The IP address to lookup
 * @returns Detailed information about the IP address
 */
export async function getIpInfo(ip: string): Promise<IPinfoResponse> {
  const apiKey = process.env.IPINFO_API_KEY;
  
  if (!apiKey) {
    console.warn('IPINFO_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(`https://ipinfo.io/${ip}?token=${apiKey || ''}`);
    
    if (!response.ok) {
      throw new Error(`IPinfo API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json() as IPinfoResponse;
  } catch (error) {
    console.error('IPinfo request failed:', error);
    throw error;
  }
}

/**
 * Check if an IP is using a VPN, proxy, tor or hosting service
 * 
 * @param ip - The IP address to check
 * @returns Privacy detection result
 */
export async function checkPrivacy(ip: string): Promise<IPinfoResponse['privacy']> {
  try {
    const info = await getIpInfo(ip);
    return info.privacy || { 
      vpn: false, 
      proxy: false, 
      tor: false, 
      relay: false, 
      hosting: false,
      service: ''
    };
  } catch (error) {
    console.error('Privacy check failed:', error);
    // Return safe default if the check fails
    return { 
      vpn: false, 
      proxy: false, 
      tor: false, 
      relay: false, 
      hosting: false,
      service: '' 
    };
  }
}