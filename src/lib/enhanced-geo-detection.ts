/**
 * Enhanced Geo-Location Detection Service
 * Sophisticated country detection for geo-restriction functionality
 * Uses multiple data sources for accurate location detection
 */

interface GeoLocationResult {
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp: string;
  organization: string;
  asn: string;
  accuracy: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // 0-100
  sources: string[];
  vpnRisk?: {
    isVPN: boolean;
    isProxy: boolean;
    isTor: boolean;
    isHosting: boolean;
    confidence: number;
  };
}

interface GeoProvider {
  name: string;
  detect: (ip: string) => Promise<Partial<GeoLocationResult>>;
  weight: number; // Higher weight = more trusted
  rateLimit?: number; // Requests per minute
}

/**
 * Enhanced Geo-Location Detection Class
 */
export class EnhancedGeoDetector {
  private cache = new Map<string, { result: GeoLocationResult; timestamp: number }>();
  private cacheExpiry = 1000 * 60 * 60 * 4; // 4 hours
  private providers: GeoProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize geo-location providers
   */
  private initializeProviders() {
    // Provider 1: Free IP geolocation service
    this.providers.push({
      name: 'ip-api',
      weight: 3,
      rateLimit: 45,
      detect: async (ip: string) => {
        try {
          const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,proxy,hosting`);
          const data = await response.json();
          
          if (data.status === 'success') {
            return {
              country: data.country,
              countryCode: data.countryCode,
              region: data.regionName,
              regionCode: data.region,
              city: data.city,
              latitude: data.lat,
              longitude: data.lon,
              timezone: data.timezone,
              isp: data.isp,
              organization: data.org,
              asn: data.as,
              accuracy: 'MEDIUM',
              confidence: 75,
              sources: ['ip-api'],
              vpnRisk: {
                isVPN: false,
                isProxy: data.proxy || false,
                isTor: false,
                isHosting: data.hosting || false,
                confidence: 60
              }
            };
          }
          
          throw new Error(data.message || 'IP-API request failed');
        } catch (error) {
          console.error('IP-API provider error:', error);
          return {};
        }
      }
    });

    // Provider 2: IPinfo fallback
    this.providers.push({
      name: 'ipinfo',
      weight: 2,
      rateLimit: 50,
      detect: async (ip: string) => {
        try {
          const response = await fetch(`https://ipinfo.io/${ip}/json`);
          const data = await response.json();
          
          if (data.country) {
            const [lat, lon] = (data.loc || '0,0').split(',').map(Number);
            
            return {
              country: this.getCountryName(data.country),
              countryCode: data.country,
              region: data.region || 'Unknown',
              city: data.city || 'Unknown',
              latitude: lat || undefined,
              longitude: lon || undefined,
              timezone: data.timezone || 'Unknown',
              isp: data.org || 'Unknown',
              organization: data.org || 'Unknown',
              asn: 'Unknown',
              accuracy: 'MEDIUM',
              confidence: 70,
              sources: ['ipinfo']
            };
          }
          
          throw new Error('Invalid IPinfo response');
        } catch (error) {
          console.error('IPinfo provider error:', error);
          return {};
        }
      }
    });

    // Provider 3: Free GeoIP service
    this.providers.push({
      name: 'freegeoip',
      weight: 1,
      rateLimit: 15,
      detect: async (ip: string) => {
        try {
          const response = await fetch(`https://freegeoip.app/json/${ip}`);
          const data = await response.json();
          
          if (data.country_code) {
            return {
              country: data.country_name,
              countryCode: data.country_code,
              region: data.region_name || 'Unknown',
              regionCode: data.region_code || 'Unknown',
              city: data.city || 'Unknown',
              latitude: data.latitude || undefined,
              longitude: data.longitude || undefined,
              timezone: data.time_zone || 'Unknown',
              isp: 'Unknown',
              organization: 'Unknown',
              asn: 'Unknown',
              accuracy: 'LOW',
              confidence: 60,
              sources: ['freegeoip']
            };
          }
          
          throw new Error('Invalid FreeGeoIP response');
        } catch (error) {
          console.error('FreeGeoIP provider error:', error);
          return {};
        }
      }
    });

    // Provider 4: Browser geolocation as fallback
    this.providers.push({
      name: 'browser-geo',
      weight: 1,
      detect: async (ip: string) => {
        try {
          if (typeof window === 'undefined' || !navigator.geolocation) {
            return {};
          }

          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy > 1000 ? 'LOW' : 'MEDIUM',
                  confidence: position.coords.accuracy > 1000 ? 40 : 60,
                  sources: ['browser-geo']
                });
              },
              () => resolve({}),
              { timeout: 5000, enableHighAccuracy: false }
            );
          });
        } catch (error) {
          return {};
        }
      }
    });
  }

  /**
   * Detect location using multiple providers
   */
  async detectLocation(ipAddress: string): Promise<GeoLocationResult> {
    // Check cache first
    const cached = this.getCachedResult(ipAddress);
    if (cached) {
      return cached;
    }

    try {
      const results = await this.queryMultipleProviders(ipAddress);
      const combined = this.combineResults(results);
      
      // Cache the result
      this.cacheResult(ipAddress, combined);
      
      return combined;
    } catch (error) {
      console.error('Geo detection error:', error);
      return this.getDefaultResult(ipAddress);
    }
  }

  /**
   * Query multiple providers in parallel with timeout
   */
  private async queryMultipleProviders(ipAddress: string): Promise<Array<{ provider: string; result: Partial<GeoLocationResult> }>> {
    const timeout = 8000; // 8 second timeout
    const results: Array<{ provider: string; result: Partial<GeoLocationResult> }> = [];

    // Create promises for each provider
    const providerPromises = this.providers.map(async (provider) => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Provider timeout')), timeout)
        );
        
        const result = await Promise.race([
          provider.detect(ipAddress),
          timeoutPromise
        ]) as Partial<GeoLocationResult>;
        
        return { provider: provider.name, result };
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        return { provider: provider.name, result: {} };
      }
    });

    // Wait for all providers (with individual timeouts)
    const providerResults = await Promise.allSettled(providerPromises);
    
    providerResults.forEach((result) => {
      if (result.status === 'fulfilled' && Object.keys(result.value.result).length > 0) {
        results.push(result.value);
      }
    });

    return results;
  }

  /**
   * Combine results from multiple providers using weighted scoring
   */
  private combineResults(results: Array<{ provider: string; result: Partial<GeoLocationResult> }>): GeoLocationResult {
    if (results.length === 0) {
      return this.getDefaultResult('unknown');
    }

    // Find the provider with highest weight that has country data
    const sortedResults = results
      .filter(r => r.result.country)
      .sort((a, b) => {
        const weightA = this.providers.find(p => p.name === a.provider)?.weight || 0;
        const weightB = this.providers.find(p => p.name === b.provider)?.weight || 0;
        const confA = a.result.confidence || 0;
        const confB = b.result.confidence || 0;
        
        return (weightB * confB) - (weightA * confA);
      });

    if (sortedResults.length === 0) {
      return this.getDefaultResult('unknown');
    }

    const primary = sortedResults[0].result;
    const sources = results.map(r => r.provider);

    // Combine data with primary result as base
    const combined: GeoLocationResult = {
      country: primary.country || 'Unknown',
      countryCode: primary.countryCode || 'XX',
      region: primary.region || 'Unknown',
      regionCode: primary.regionCode || 'XX',
      city: primary.city || 'Unknown',
      latitude: primary.latitude,
      longitude: primary.longitude,
      timezone: primary.timezone || 'UTC',
      isp: primary.isp || 'Unknown',
      organization: primary.organization || 'Unknown',
      asn: primary.asn || 'Unknown',
      accuracy: this.calculateCombinedAccuracy(results),
      confidence: this.calculateCombinedConfidence(results),
      sources,
      vpnRisk: primary.vpnRisk
    };

    // Enhance with additional data from other providers
    results.forEach(({ result }) => {
      if (result.latitude && !combined.latitude) {
        combined.latitude = result.latitude;
        combined.longitude = result.longitude;
      }
      
      if (result.timezone && combined.timezone === 'UTC') {
        combined.timezone = result.timezone;
      }
      
      if (result.isp && combined.isp === 'Unknown') {
        combined.isp = result.isp;
      }
    });

    return combined;
  }

  /**
   * Calculate combined accuracy from multiple sources
   */
  private calculateCombinedAccuracy(results: Array<{ provider: string; result: Partial<GeoLocationResult> }>): 'HIGH' | 'MEDIUM' | 'LOW' {
    const accuracyScores = results
      .map(r => r.result.accuracy)
      .filter(Boolean)
      .map(acc => acc === 'HIGH' ? 3 : acc === 'MEDIUM' ? 2 : 1);

    if (accuracyScores.length === 0) return 'LOW';
    
    const avgScore = accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length;
    
    if (avgScore >= 2.5) return 'HIGH';
    if (avgScore >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate combined confidence from multiple sources
   */
  private calculateCombinedConfidence(results: Array<{ provider: string; result: Partial<GeoLocationResult> }>): number {
    const confidenceScores = results
      .map(r => r.result.confidence || 0)
      .filter(c => c > 0);

    if (confidenceScores.length === 0) return 30;
    
    // Use weighted average based on provider weights
    let totalWeight = 0;
    let weightedSum = 0;
    
    results.forEach(({ provider, result }) => {
      const weight = this.providers.find(p => p.name === provider)?.weight || 1;
      const confidence = result.confidence || 0;
      
      totalWeight += weight;
      weightedSum += weight * confidence;
    });
    
    const combined = Math.round(weightedSum / totalWeight);
    
    // Boost confidence if multiple providers agree on country
    const countries = results.map(r => r.result.countryCode).filter(Boolean);
    const uniqueCountries = Array.from(new Set(countries));
    
    if (uniqueCountries.length === 1 && countries.length > 1) {
      return Math.min(combined + 15, 95); // Boost for agreement
    }
    
    return Math.max(combined, 30); // Minimum confidence
  }

  /**
   * Get cached result
   */
  private getCachedResult(ipAddress: string): GeoLocationResult | null {
    const cached = this.cache.get(ipAddress);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache result
   */
  private cacheResult(ipAddress: string, result: GeoLocationResult): void {
    this.cache.set(ipAddress, { result, timestamp: Date.now() });
    
    // Clean old entries
    if (this.cache.size > 1000) {
      const cutoff = Date.now() - this.cacheExpiry;
      const entriesToDelete: string[] = [];
      this.cache.forEach((data, ip) => {
        if (data.timestamp < cutoff) {
          entriesToDelete.push(ip);
        }
      });
      entriesToDelete.forEach(ip => this.cache.delete(ip));
    }
  }

  /**
   * Get default result for unknown locations
   */
  private getDefaultResult(ipAddress: string): GeoLocationResult {
    return {
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      regionCode: 'XX',
      city: 'Unknown',
      timezone: 'UTC',
      isp: 'Unknown',
      organization: 'Unknown',
      asn: 'Unknown',
      accuracy: 'LOW',
      confidence: 0,
      sources: []
    };
  }

  /**
   * Get country name from country code
   */
  private getCountryName(countryCode: string): string {
    const countries: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'AU': 'Australia',
      'BR': 'Brazil',
      'IN': 'India',
      'CN': 'China',
      'RU': 'Russia',
      'MX': 'Mexico',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'BE': 'Belgium',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'PT': 'Portugal',
      'GR': 'Greece',
      'TR': 'Turkey',
      'IL': 'Israel',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'EG': 'Egypt',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'MA': 'Morocco',
      'TH': 'Thailand',
      'VN': 'Vietnam',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'KR': 'South Korea',
      'TW': 'Taiwan',
      'HK': 'Hong Kong',
      'NZ': 'New Zealand'
    };
    
    return countries[countryCode] || countryCode;
  }

  /**
   * Check if country is restricted
   */
  isCountryRestricted(countryCode: string, allowedCountries: string[]): boolean {
    if (!allowedCountries || allowedCountries.length === 0) {
      return false; // No restrictions
    }
    
    return !allowedCountries.includes(countryCode.toUpperCase());
  }

  /**
   * Get location summary for logging
   */
  getLocationSummary(result: GeoLocationResult): string {
    return `${result.city}, ${result.region}, ${result.country} (${result.countryCode}) - Confidence: ${result.confidence}% - Sources: ${result.sources.join(', ')}`;
  }
}

// Singleton instance
export const enhancedGeoDetector = new EnhancedGeoDetector();

/**
 * Simple interface for backwards compatibility
 */
export async function detectGeoLocation(ipAddress: string): Promise<{
  country: string;
  countryCode: string;
  region: string;
  city: string;
  accuracy: string;
  confidence: number;
  detectionSuccess: boolean;
  error?: string;
}> {
  try {
    const result = await enhancedGeoDetector.detectLocation(ipAddress);
    return {
      country: result.country,
      countryCode: result.countryCode,
      region: result.region,
      city: result.city,
      accuracy: result.accuracy,
      confidence: result.confidence,
      detectionSuccess: true
    };
  } catch (error) {
    return {
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      city: 'Unknown',
      accuracy: 'LOW',
      confidence: 0,
      detectionSuccess: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
