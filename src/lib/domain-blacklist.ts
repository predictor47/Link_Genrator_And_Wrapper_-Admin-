/**
 * Domain Blacklist Service
 * Comprehensive domain checking for fraud prevention
 */

interface DomainCheckResult {
  isBlacklisted: boolean;
  reason?: string;
  category?: 'temporary-email' | 'vpn-service' | 'known-fraud' | 'suspicious-pattern';
  confidence: number;
  sources: string[];
}

interface DomainPattern {
  pattern: string | RegExp;
  category: string;
  reason: string;
  confidence: number;
}

// Known temporary/disposable email domains
const TEMP_EMAIL_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'yopmail.com',
  'tempmail.org', 'maildrop.cc', 'throwaway.email', 'temp-mail.org',
  'fakeinbox.com', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'tempail.com', 'tempmailaddress.com',
  'emailondeck.com', 'mohmal.com', 'mytrashmail.com', 'armyspy.com',
  'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'superrito.com', 'teleworm.us', 'rhyta.com', 'einrot.com'
];

// Known VPN/proxy service domains
const VPN_DOMAINS = [
  'protonmail.com', 'tutanota.com', 'guerrillamail.org', 'secure-mail.biz',
  'anonymousemail.me', 'hidemail.de', 'mytemp.email', 'tmpnator.live',
  'getnada.com', 'temp-mail.io', 'temporary-mail.net'
];

// Suspicious domain patterns
const SUSPICIOUS_PATTERNS: DomainPattern[] = [
  {
    pattern: /^[a-z]{1,3}\d+\.[a-z]{2,3}$/,
    category: 'suspicious-pattern',
    reason: 'Short domain with numbers pattern',
    confidence: 70
  },
  {
    pattern: /^\d+[a-z]+\.[a-z]{2,3}$/,
    category: 'suspicious-pattern', 
    reason: 'Numbers followed by letters pattern',
    confidence: 65
  },
  {
    pattern: /^[a-z]+\d{3,}\.[a-z]{2,3}$/,
    category: 'suspicious-pattern',
    reason: 'Domain with many consecutive numbers',
    confidence: 75
  },
  {
    pattern: /^.{1,4}\.[a-z]{2}$/,
    category: 'suspicious-pattern',
    reason: 'Very short domain with 2-letter TLD',
    confidence: 60
  }
];

// Known fraud domains (this would be updated from external sources)
const KNOWN_FRAUD_DOMAINS = [
  'example-fraud.com', 'fake-survey.net', 'scam-emails.org'
  // In production, this would be populated from threat intelligence feeds
];

export class DomainBlacklistService {
  private cache = new Map<string, DomainCheckResult>();
  private cacheExpiry = 1000 * 60 * 60; // 1 hour

  /**
   * Check if a domain/email is blacklisted
   */
  async checkDomain(email: string): Promise<DomainCheckResult> {
    const domain = this.extractDomain(email);
    
    // Check cache first
    const cached = this.cache.get(domain);
    if (cached) {
      return cached;
    }

    const result = await this.performDomainCheck(domain);
    
    // Cache result
    this.cache.set(domain, result);
    
    // Clean old cache entries periodically
    this.cleanCache();
    
    return result;
  }

  /**
   * Perform comprehensive domain checking
   */
  private async performDomainCheck(domain: string): Promise<DomainCheckResult> {
    const checks: Array<{ result: boolean; category?: string; reason?: string; confidence: number; source: string }> = [];

    // Check against temporary email domains
    if (TEMP_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
      checks.push({
        result: true,
        category: 'temporary-email',
        reason: 'Known temporary email provider',
        confidence: 95,
        source: 'temp-email-list'
      });
    }

    // Check against VPN domains
    if (VPN_DOMAINS.includes(domain.toLowerCase())) {
      checks.push({
        result: true,
        category: 'vpn-service',
        reason: 'Known VPN/proxy email service',
        confidence: 85,
        source: 'vpn-domain-list'
      });
    }

    // Check against known fraud domains
    if (KNOWN_FRAUD_DOMAINS.includes(domain.toLowerCase())) {
      checks.push({
        result: true,
        category: 'known-fraud',
        reason: 'Domain flagged for fraudulent activity',
        confidence: 100,
        source: 'fraud-database'
      });
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      const regex = typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern) : pattern.pattern;
      if (regex.test(domain.toLowerCase())) {
        checks.push({
          result: true,
          category: pattern.category as any,
          reason: pattern.reason,
          confidence: pattern.confidence,
          source: 'pattern-analysis'
        });
      }
    }

    // Check domain age and reputation (simulated - would use real services in production)
    const reputationCheck = await this.checkDomainReputation(domain);
    if (reputationCheck.suspicious) {
      checks.push({
        result: true,
        category: 'suspicious-pattern',
        reason: reputationCheck.reason,
        confidence: reputationCheck.confidence,
        source: 'reputation-check'
      });
    }

    // Determine final result
    const positiveChecks = checks.filter(c => c.result);
    
    if (positiveChecks.length === 0) {
      return {
        isBlacklisted: false,
        confidence: 0,
        sources: ['whitelist-check']
      };
    }

    // Get the highest confidence result
    const highestConfidence = Math.max(...positiveChecks.map(c => c.confidence));
    const primaryCheck = positiveChecks.find(c => c.confidence === highestConfidence);

    return {
      isBlacklisted: true,
      reason: primaryCheck?.reason,
      category: primaryCheck?.category as any,
      confidence: highestConfidence,
      sources: positiveChecks.map(c => c.source)
    };
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string {
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
      return email.toLowerCase();
    }
    return email.substring(atIndex + 1).toLowerCase();
  }

  /**
   * Check domain reputation (simulated for demo)
   */
  private async checkDomainReputation(domain: string): Promise<{
    suspicious: boolean;
    reason?: string;
    confidence: number;
  }> {
    // This would integrate with real reputation services like:
    // - Google Safe Browsing API
    // - VirusTotal API
    // - Domain age checkers
    // - SSL certificate validation
    
    // Simulated checks for demo
    const suspiciousIndicators: string[] = [];
    
    // Check for very new domains (simulated)
    if (Math.random() < 0.1) {
      suspiciousIndicators.push('Domain registered very recently');
    }
    
    // Check for missing/invalid SSL (simulated)
    if (Math.random() < 0.05) {
      suspiciousIndicators.push('No valid SSL certificate');
    }
    
    // Check for suspicious hosting patterns (simulated)
    if (Math.random() < 0.08) {
      suspiciousIndicators.push('Hosted on suspicious infrastructure');
    }

    if (suspiciousIndicators.length > 0) {
      return {
        suspicious: true,
        reason: suspiciousIndicators.join(', '),
        confidence: Math.min(60 + (suspiciousIndicators.length * 15), 90)
      };
    }

    return {
      suspicious: false,
      confidence: 0
    };
  }

  /**
   * Add domain to blacklist
   */
  async addToBlacklist(domain: string, reason: string, category: string): Promise<void> {
    // In production, this would update a database
    KNOWN_FRAUD_DOMAINS.push(domain.toLowerCase());
    
    // Clear cache for this domain
    this.cache.delete(domain.toLowerCase());
    
    console.log(`Domain ${domain} added to blacklist: ${reason}`);
  }

  /**
   * Remove domain from blacklist
   */
  async removeFromBlacklist(domain: string): Promise<void> {
    // In production, this would update a database
    const index = KNOWN_FRAUD_DOMAINS.indexOf(domain.toLowerCase());
    if (index > -1) {
      KNOWN_FRAUD_DOMAINS.splice(index, 1);
    }
    
    // Clear cache for this domain
    this.cache.delete(domain.toLowerCase());
    
    console.log(`Domain ${domain} removed from blacklist`);
  }

  /**
   * Get blacklist statistics
   */
  getBlacklistStats(): {
    tempEmailDomains: number;
    vpnDomains: number;
    fraudDomains: number;
    suspiciousPatterns: number;
    cacheSize: number;
  } {
    return {
      tempEmailDomains: TEMP_EMAIL_DOMAINS.length,
      vpnDomains: VPN_DOMAINS.length,
      fraudDomains: KNOWN_FRAUD_DOMAINS.length,
      suspiciousPatterns: SUSPICIOUS_PATTERNS.length,
      cacheSize: this.cache.size
    };
  }

  /**
   * Bulk check domains
   */
  async checkDomains(emails: string[]): Promise<Map<string, DomainCheckResult>> {
    const results = new Map<string, DomainCheckResult>();
    
    for (const email of emails) {
      const result = await this.checkDomain(email);
      results.set(email, result);
    }
    
    return results;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    if (this.cache.size > 1000) {
      // Simple cleanup - in production, would track timestamps
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 200);
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Update domain lists from external sources
   */
  async updateDomainLists(): Promise<{
    tempEmailsUpdated: number;
    vpnDomainsUpdated: number;
    fraudDomainsUpdated: number;
  }> {
    // In production, this would fetch from external threat intelligence feeds
    // For now, return simulated update counts
    return {
      tempEmailsUpdated: 0,
      vpnDomainsUpdated: 0,
      fraudDomainsUpdated: 0
    };
  }
}

// Export singleton instance
export const domainBlacklistService = new DomainBlacklistService();
