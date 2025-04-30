/**
 * URL Utilities
 * 
 * Centralized URL generation functions for consistent domain usage across the application.
 */

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;
const SHORT_URL_BASE = process.env.NEXT_PUBLIC_SURVEY_SHORT_URL || `https://${MAIN_DOMAIN}/s`;

/**
 * URL generation utility functions
 */
export const urlUtils = {
  /**
   * Generate survey link (short or full format)
   */
  generateSurveyLink: (projectId: string, uid: string, type: string = 'short'): string => {
    if (type === 'short') {
      return `${SHORT_URL_BASE}/${projectId}/${uid}`;
    } else {
      return `https://${MAIN_DOMAIN}/survey/${projectId}/${uid}`;
    }
  },

  /**
   * Generate completion page link
   */
  generateCompletionLink: (projectId: string, uid: string): string => {
    return `https://${MAIN_DOMAIN}/completion/${projectId}/${uid}`;
  },

  /**
   * Generate API endpoint URL
   */
  generateApiEndpoint: (path: string, isAdmin: boolean = false): string => {
    const domain = isAdmin ? ADMIN_DOMAIN : MAIN_DOMAIN;
    return `https://${domain}/api/${path}`;
  },

  /**
   * Generate admin dashboard URL
   */
  generateAdminUrl: (path: string = ''): string => {
    return `https://${ADMIN_DOMAIN}${path.startsWith('/') ? path : `/${path}`}`;
  },

  /**
   * Get domain configuration
   */
  getDomainConfig: () => {
    return {
      MAIN_DOMAIN,
      ADMIN_DOMAIN,
      SHORT_URL_BASE
    };
  }
};