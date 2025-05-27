import { NextApiRequest, NextApiResponse } from 'next';
import { getAmplifyServerService } from '@/lib/amplify-server-service';

// Helper function to get user's country from IP
async function getUserCountryFromIP(req: NextApiRequest): Promise<string | null> {
  try {
    // Try to get country from CloudFlare headers (if using CloudFlare)
    const cfCountry = req.headers['cf-ipcountry'] as string;
    if (cfCountry && cfCountry !== 'XX') {
      return cfCountry;
    }

    // Try to get country from other common headers
    const xCountry = req.headers['x-country-code'] as string;
    if (xCountry) {
      return xCountry;
    }

    // Get IP address
    let ip = req.headers['x-forwarded-for'] as string || 
             req.headers['x-real-ip'] as string ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             '';

    // Handle comma-separated IPs (from load balancers)
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Skip localhost/development IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return 'US'; // Default to US for development
    }

    // Use ipinfo.io for IP geolocation (free tier allows 50k requests/month)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Survey-Wrapper/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.country || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting user country:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, uid } = req.body;

    if (!projectId || !uid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing projectId or uid' 
      });
    }

    const amplifyServerService = getAmplifyServerService();

    // Get the survey link
    const surveyLinkResult = await amplifyServerService.getSurveyLinkByUid(uid);
    const surveyLink = surveyLinkResult.data;

    if (!surveyLink) {
      return res.status(404).json({ 
        success: false, 
        error: 'Survey link not found',
        redirect: null
      });
    }

    // Check if link belongs to the project
    if (surveyLink.projectId !== projectId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid project/link combination',
        redirect: null
      });
    }

    // Check link status
    if (surveyLink.status === 'COMPLETED') {
      return res.status(200).json({ 
        success: false, 
        error: 'Survey already completed',
        status: 'completed',
        redirect: `/thank-you-completed?projectId=${projectId}`
      });
    }

    if (surveyLink.status === 'DISQUALIFIED') {
      return res.status(200).json({ 
        success: false, 
        error: 'User disqualified',
        status: 'disqualified',
        redirect: `/sorry-disqualified?projectId=${projectId}`
      });
    }

    if (surveyLink.status === 'QUOTA_FULL') {
      return res.status(200).json({ 
        success: false, 
        error: 'Survey quota full',
        status: 'quota-full',
        redirect: `/sorry-quota-full?projectId=${projectId}`
      });
    }

    // Check geography restrictions if they exist
    if (surveyLink.geoData && typeof surveyLink.geoData === 'object') {
      try {
        const geoData = typeof surveyLink.geoData === 'string' ? 
          JSON.parse(surveyLink.geoData) : surveyLink.geoData;
        
        if (geoData.geoRestriction && Array.isArray(geoData.geoRestriction) && geoData.geoRestriction.length > 0) {
          const userCountry = await getUserCountryFromIP(req);
          
          if (userCountry && !geoData.geoRestriction.includes(userCountry)) {
            // User is from a restricted country
            return res.status(200).json({ 
              success: false, 
              error: 'Geographic restriction',
              status: 'geo-restricted',
              userCountry,
              allowedCountries: geoData.geoRestriction,
              redirect: `/geo-restricted?country=${userCountry}&allowed=${geoData.geoRestriction.join(',')}`
            });
          }
        }
      } catch (e) {
        console.error('Error parsing geoData:', e);
      }
    }

    // Get project details
    const projectResult = await amplifyServerService.getProject(projectId);
    const project = projectResult.data;

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found',
        redirect: null
      });
    }

    // Update link status to CLICKED if it's still UNUSED
    if (surveyLink.status === 'UNUSED') {
      await amplifyServerService.updateSurveyLink(surveyLink.id, { status: 'CLICKED' });
    }

    // Return success with project and link data
    return res.status(200).json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        surveyUrl: project.surveyUrl || project.description || '' // fallback
      },
      surveyLink: {
        id: surveyLink.id,
        uid: surveyLink.uid,
        status: 'CLICKED', // Updated status
        vendorId: surveyLink.vendorId,
        geoData: surveyLink.geoData
      },
      userCountry: await getUserCountryFromIP(req)
    });

  } catch (error: any) {
    console.error('Survey validation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      redirect: null
    });
  }
}
