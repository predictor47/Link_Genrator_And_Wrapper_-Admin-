import type { NextApiRequest, NextApiResponse } from 'next';
import { getRequestIp } from '@/lib/vpn-detection';
import { enhancedGeoDetector } from '@/lib/enhanced-geo-detection';

interface IPCheckResponse {
  success: boolean;
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: string;
  confidence?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IPCheckResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      ip: 'unknown',
      error: 'Method not allowed' 
    });
  }

  try {
    // Get client IP address
    let ip = getRequestIp(req);
    
    if (!ip) {
      // Fallback to headers
      ip = req.headers['x-forwarded-for'] as string || 
           req.headers['x-real-ip'] as string ||
           req.socket.remoteAddress ||
           'unknown';
    }

    // Handle comma-separated IPs (from load balancers)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // For localhost/development, return mock data
    if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || 
        ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return res.status(200).json({
        success: true,
        ip: ip || '127.0.0.1',
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        isp: 'Local Development',
        timezone: 'America/Los_Angeles',
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 'HIGH',
        confidence: 95
      });
    }

    // Use enhanced geo detection for real IPs
    try {
      const geoResult = await enhancedGeoDetector.detectLocation(ip);
      
      return res.status(200).json({
        success: true,
        ip,
        country: geoResult.country,
        countryCode: geoResult.countryCode,
        region: geoResult.region,
        city: geoResult.city,
        isp: geoResult.isp,
        timezone: geoResult.timezone,
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        accuracy: geoResult.accuracy,
        confidence: geoResult.confidence
      });
    } catch (geoError) {
      console.error('Enhanced geo detection failed:', geoError);
      
      // Fallback to simple IP lookup
      try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        
        if (data.country_name) {
          return res.status(200).json({
            success: true,
            ip,
            country: data.country_name,
            countryCode: data.country_code,
            region: data.region,
            city: data.city,
            isp: data.org || 'Unknown',
            timezone: data.timezone,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 'MEDIUM',
            confidence: 70
          });
        }
      } catch (fallbackError) {
        console.error('Fallback IP lookup failed:', fallbackError);
      }
      
      // Final fallback - return IP with minimal data
      return res.status(200).json({
        success: true,
        ip,
        country: 'Unknown',
        countryCode: 'XX',
        region: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
        timezone: 'UTC',
        accuracy: 'LOW',
        confidence: 0
      });
    }

  } catch (error) {
    console.error('IP check error:', error);
    
    return res.status(500).json({
      success: false,
      ip: 'unknown',
      error: 'Failed to determine IP address'
    });
  }
}
