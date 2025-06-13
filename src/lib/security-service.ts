import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { getAmplifyDataService } from './amplify-data-service';
import { detectAdvancedVPN } from './advanced-vpn-detection';
import { detectGeoLocation, enhancedGeoDetector } from './enhanced-geo-detection';

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const SHORT_URL_BASE = process.env.NEXT_PUBLIC_SURVEY_SHORT_URL || `https://${MAIN_DOMAIN}/s`;

export interface SecurityContext {
  authenticated: boolean;
  userId?: string;
  userGroups?: string[];
  geoLocation?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    ip: string;
    accuracy: string;
    confidence: number;
    sources: string[];
  };
  vpnDetection: {
    isVPN: boolean;
    isProxy: boolean;
    isTor: boolean;
    isHosting: boolean;
    confidence: number;
    risk: string;
  };
  captchaScore?: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
}

/**
 * Security Service - Handles security features for MCP server integration
 * Centralizes authentication, geo-restriction, VPN detection, and captcha verification
 */
export const securityService = {
  /**
   * Get current security context including authentication status, geo info, VPN detection
   */
  getSecurityContext: async (ip: string, captchaToken?: string): Promise<SecurityContext> => {
    // Initialize security context
    const securityContext: SecurityContext = {
      authenticated: false,
      vpnDetection: {
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        confidence: 0,
        risk: 'LOW'
      },
      threatLevel: 'LOW',
      flags: []
    };

    try {
      // Check authentication status using Amplify v6 APIs
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        securityContext.authenticated = true;
        securityContext.userId = currentUser.userId;
        
        // Extract user groups from Cognito tokens using new API structure
        const accessToken = session.tokens?.accessToken;
        const payload = accessToken?.payload as any;
        securityContext.userGroups = payload?.['cognito:groups'] || [];
      } catch (error) {
        // User is not authenticated
        securityContext.authenticated = false;
      }

      // Enhanced geo-location detection
      try {
        const geoResult = await enhancedGeoDetector.detectLocation(ip);
        securityContext.geoLocation = {
          country: geoResult.country,
          countryCode: geoResult.countryCode,
          region: geoResult.region,
          city: geoResult.city,
          ip: ip,
          accuracy: geoResult.accuracy,
          confidence: geoResult.confidence,
          sources: geoResult.sources
        };
        
        // Add geo-related flags
        if (geoResult.confidence < 50) {
          securityContext.flags.push('LOW_GEO_CONFIDENCE');
        }
        if (geoResult.accuracy === 'LOW') {
          securityContext.flags.push('LOW_GEO_ACCURACY');
        }
      } catch (error) {
        console.error('Geo-location detection failed:', error);
        securityContext.flags.push('GEO_DETECTION_FAILED');
      }

      // Enhanced VPN detection
      try {
        const vpnResult = await detectAdvancedVPN(ip);
        securityContext.vpnDetection = {
          isVPN: vpnResult.isVpn,
          isProxy: vpnResult.isProxy,
          isTor: vpnResult.isTor,
          isHosting: vpnResult.isHosting,
          confidence: vpnResult.confidence,
          risk: vpnResult.risk
        };
        
        // Add VPN-related flags
        if (vpnResult.isVpn) securityContext.flags.push('VPN_DETECTED');
        if (vpnResult.isProxy) securityContext.flags.push('PROXY_DETECTED');
        if (vpnResult.isTor) securityContext.flags.push('TOR_DETECTED');
        if (vpnResult.isHosting) securityContext.flags.push('HOSTING_DETECTED');
        if (vpnResult.confidence > 80) securityContext.flags.push('HIGH_VPN_CONFIDENCE');
      } catch (error) {
        console.error('VPN detection failed:', error);
        securityContext.flags.push('VPN_DETECTION_FAILED');
      }

      // Enhanced captcha verification
      if (captchaToken) {
        try {
          const captchaResult = await securityService.getCaptchaVerification(captchaToken, ip);
          securityContext.captchaScore = captchaResult.score;
          
          if (captchaResult.score < 0.3) {
            securityContext.flags.push('LOW_CAPTCHA_SCORE');
          } else if (captchaResult.score < 0.5) {
            securityContext.flags.push('MEDIUM_CAPTCHA_SCORE');
          }
        } catch (error) {
          console.error('Captcha verification failed:', error);
          securityContext.flags.push('CAPTCHA_VERIFICATION_FAILED');
        }
      }

      // Calculate threat level based on all factors
      securityContext.threatLevel = securityService.calculateThreatLevel(securityContext);

      return securityContext;
    } catch (error) {
      console.error('Error getting security context:', error);
      securityContext.flags.push('SECURITY_CONTEXT_ERROR');
      securityContext.threatLevel = 'MEDIUM'; // Assume medium threat on error
      return securityContext;
    }
  },

  /**
   * Calculate threat level based on security context
   */
  calculateThreatLevel: (context: SecurityContext): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    let score = 0;
    
    // VPN/Proxy detection
    if (context.vpnDetection.isTor) score += 40;
    else if (context.vpnDetection.isVPN && context.vpnDetection.confidence > 70) score += 25;
    else if (context.vpnDetection.isProxy) score += 15;
    else if (context.vpnDetection.isHosting) score += 10;
    
    // Geo-location reliability
    if (context.geoLocation) {
      if (context.geoLocation.confidence < 30) score += 15;
      else if (context.geoLocation.confidence < 50) score += 10;
      
      if (context.geoLocation.accuracy === 'LOW') score += 5;
    } else {
      score += 20; // No geo data is suspicious
    }
    
    // Captcha score
    if (context.captchaScore !== undefined) {
      if (context.captchaScore < 0.3) score += 30;
      else if (context.captchaScore < 0.5) score += 15;
    }
    
    // Additional flags
    const criticalFlags = ['TOR_DETECTED', 'HIGH_VPN_CONFIDENCE'];
    const highFlags = ['VPN_DETECTED', 'LOW_CAPTCHA_SCORE'];
    const mediumFlags = ['PROXY_DETECTED', 'HOSTING_DETECTED', 'LOW_GEO_CONFIDENCE'];
    
    if (context.flags.some(flag => criticalFlags.includes(flag))) score += 25;
    if (context.flags.some(flag => highFlags.includes(flag))) score += 15;
    if (context.flags.some(flag => mediumFlags.includes(flag))) score += 10;
    
    // Determine threat level
    if (score >= 60) return 'CRITICAL';
    if (score >= 40) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Enhanced captcha verification
   */
  getCaptchaVerification: async (token: string, ip: string): Promise<{ score: number; success: boolean }> => {
    try {
      // This would integrate with reCAPTCHA or similar service
      // For now, simulate verification
      const mockScore = Math.random() * 0.4 + 0.6; // Random score between 0.6-1.0
      
      return {
        score: mockScore,
        success: mockScore >= 0.5
      };
    } catch (error) {
      console.error('Captcha verification error:', error);
      return {
        score: 0,
        success: false
      };
    }
  },

      /**
   * Verify access to a survey link based on geo-restrictions and other security rules
   */
  verifySurveyLinkAccess: async (surveyLinkUid: string, ip: string, captchaToken?: string): Promise<{
    allowed: boolean;
    reason?: string;
    securityContext: SecurityContext;
  }> => {
    try {
      const securityContext = await securityService.getSecurityContext(ip, captchaToken);
      
      // Get survey link with proper null check
      if (!surveyLinkUid) {
        return {
          allowed: false,
          reason: 'INVALID_LINK_ID',
          securityContext
        };
      }
      
      const amplifyDataService = await getAmplifyDataService();
      const surveyLink = await amplifyDataService.surveyLinks.getByUid(surveyLinkUid);
      
      if (!surveyLink) {
        return {
          allowed: false,
          reason: 'LINK_NOT_FOUND',
          securityContext
        };
      }

      // Check if link is already completed or flagged
      if (surveyLink.data && surveyLink.data.status && ['COMPLETED', 'FLAGGED'].includes(surveyLink.data.status)) {
        return {
          allowed: false,
          reason: 'LINK_ALREADY_USED',
          securityContext
        };
      }

      // Enhanced geo-restrictions check
      if (surveyLink.data && surveyLink.data.projectId && securityContext.geoLocation) {
        try {
          const amplifyDataService = await getAmplifyDataService();
          const project = await amplifyDataService.projects.get(surveyLink.data.projectId);
          
          // Get geo-restrictions from project settings if available
          const settings = project.data?.settings as any;
          const geoRestriction = settings?.geoRestriction;
        
          if (geoRestriction) {
            const allowedCountries = typeof geoRestriction === 'string' 
              ? JSON.parse(geoRestriction) 
              : geoRestriction;
              
            if (Array.isArray(allowedCountries) && allowedCountries.length > 0) {
              // Use enhanced country code checking
              const isRestricted = enhancedGeoDetector.isCountryRestricted(
                securityContext.geoLocation.countryCode, 
                allowedCountries
              );
              
              if (isRestricted) {
                return {
                  allowed: false,
                  reason: 'GEO_RESTRICTED',
                  securityContext
                };
              }
              
              // Additional check for low-confidence geo detection
              if (securityContext.geoLocation.confidence < 60) {
                return {
                  allowed: false,
                  reason: 'GEO_CONFIDENCE_TOO_LOW',
                  securityContext
                };
              }
            }
          }
        } catch (e) {
          console.error('Error parsing geo restrictions:', e);
          // If geo-restriction check fails but restrictions exist, be conservative
          return {
            allowed: false,
            reason: 'GEO_RESTRICTION_CHECK_FAILED',
            securityContext
          };
        }
      }
      // Check VPN usage if detected
      if (securityContext.vpnDetection.isVPN && surveyLink.data) {
        return {
          allowed: false,
          reason: 'VPN_DETECTED',
          securityContext
        };
      }
      
      // Check Tor usage (always block)
      if (securityContext.vpnDetection.isTor) {
        return {
          allowed: false,
          reason: 'TOR_DETECTED',
          securityContext
        };
      }
      
      // Check high-risk proxy usage
      if (securityContext.vpnDetection.isProxy && securityContext.vpnDetection.confidence > 70) {
        return {
          allowed: false,
          reason: 'HIGH_RISK_PROXY_DETECTED',
          securityContext
        };
      }
      
      // Check threat level
      if (securityContext.threatLevel === 'CRITICAL') {
        return {
          allowed: false,
          reason: 'CRITICAL_THREAT_LEVEL',
          securityContext
        };
      }
      
      // Check captcha score if provided
      if (captchaToken && securityContext.captchaScore !== undefined && securityContext.captchaScore < 0.5) {
        return {
          allowed: false,
          reason: 'CAPTCHA_FAILED',
          securityContext
        };
      }
      
      return {
        allowed: true,
        securityContext
      };
    } catch (error) {
      console.error('Error verifying survey link access:', error);
      return {
        allowed: false,
        reason: 'INTERNAL_ERROR',
        securityContext: { 
          authenticated: false, 
          vpnDetection: {
            isVPN: false,
            isProxy: false,
            isTor: false,
            isHosting: false,
            confidence: 0,
            risk: 'LOW'
          },
          threatLevel: 'MEDIUM',
          flags: ['VERIFICATION_ERROR']
        }
      };
    }
  },
  
  /**
   * Generate survey links using the custom domain
   */
  generateSurveyLink: (projectId: string, uid: string, type: string = 'short'): string => {
    if (type === 'short') {
      return `${SHORT_URL_BASE}/${projectId}/${uid}`;
    } else {
      return `https://${MAIN_DOMAIN}/survey/${projectId}/${uid}`;
    }
  },

  /**
   * Generate completion page link using the custom domain
   */
  generateCompletionLink: (projectId: string, uid: string): string => {
    return `https://${MAIN_DOMAIN}/completion/${projectId}/${uid}`;
  },

  /**
   * Log security events to help with auditing and threat detection
   */
  logSecurityEvent: async (eventType: string, details: any): Promise<void> => {
    console.log(`[SECURITY_EVENT] ${eventType}:`, details);
    // In a production environment, this would send events to a logging service
  }
};