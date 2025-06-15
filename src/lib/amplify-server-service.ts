import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Initialize Amplify
Amplify.configure(outputs);

// Type definitions matching the schema
type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
type SurveyLinkStatus = 'UNUSED' | 'CLICKED' | 'COMPLETED' | 'DISQUALIFIED' | 'QUOTA_FULL';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  targetCompletions: number;
  currentCompletions: number;
  surveyUrl: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface SurveyLink {
  id: string;
  projectId: string;
  uid: string;
  vendorId?: string;
  status: SurveyLinkStatus;
  clickedAt?: string;
  completedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  geoData?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  projectId: string;
  text: string;
  type: string;
  options?: any;
  sequence: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Response {
  id: string;
  surveyLinkId: string;
  questionId: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectVendor {
  id: string;
  projectId: string;
  vendorId: string;
  quota: number;
  currentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RawDataRecord {
  id: string;
  projectId: string;
  uid: string;
  surveyData?: any;
  presurveyAnswers?: any;
  completionData?: any;
  enhancedFingerprint?: any;
  behavioralData?: any;
  securityContext?: any;
  geoLocationData?: any;
  vpnDetectionData?: any;
  ipAddress?: string;
  userAgent?: string;
  submittedAt: string;
  processingFlags?: any;
  dataQualityScore?: number;
  timeOnSurvey?: number;
  deviceType?: string;
  browserType?: string;
  locationAccuracy?: string;
  securityRisk?: string;
  createdAt: string;
  updatedAt: string;
}

interface PresurveyAnswer {
  id: string;
  projectId: string;
  uid: string;
  questionId: string;
  questionText: string;
  answer: string;
  answerType?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Flag {
  id: string;
  surveyLinkId: string;
  projectId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message?: string;
  metadata?: any;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

class AmplifyServerService {
  private apiEndpoint: string;
  private apiKey: string;

  constructor() {
    this.apiEndpoint = outputs.data.url;
    this.apiKey = outputs.data.api_key;
  }

  private async makeGraphQLRequest<T>(query: string, variables: any = {}): Promise<GraphQLResponse<T>> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        console.error(`GraphQL errors:`, result.errors);
      }
      
      return result;
    } catch (error) {
      console.error('GraphQL request failed:', error);
      throw error;
    }
  }

  // Project operations
  async getProject(id: string): Promise<{ data: Project | null }> {
    const query = `
      query GetProject($id: ID!) {
        getProject(id: $id) {
          id
          name
          description
          status
          targetCompletions
          currentCompletions
          surveyUrl
          settings
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ getProject: Project }>(query, { id });
    return { data: result.data?.getProject || null };
  }

  async listProjects(): Promise<{ data: Project[] }> {
    const query = `
      query ListProjects {
        listProjects {
          items {
            id
            name
            description
            status
            targetCompletions
            currentCompletions
            surveyUrl
            settings
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listProjects: { items: Project[] } }>(query);
    return { data: result.data?.listProjects?.items || [] };
  }

  // Vendor operations
  async getVendor(id: string): Promise<{ data: Vendor | null }> {
    const query = `
      query GetVendor($id: ID!) {
        getVendor(id: $id) {
          id
          name
          contactName
          contactEmail
          settings
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ getVendor: Vendor }>(query, { id });
    return { data: result.data?.getVendor || null };
  }

  async listVendors(filter?: any): Promise<{ data: Vendor[] }> {
    const query = `
      query ListVendors($filter: ModelVendorFilterInput) {
        listVendors(filter: $filter) {
          items {
            id
            name
            contactName
            contactEmail
            settings
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listVendors: { items: Vendor[] } }>(query, { filter });
    return { data: result.data?.listVendors?.items || [] };
  }

  async createVendor(input: {
    name: string;
    contactName?: string;
    contactEmail?: string;
    settings?: string;
  }): Promise<{ data: Vendor | null }> {
    const query = `
      mutation CreateVendor($input: CreateVendorInput!) {
        createVendor(input: $input) {
          id
          name
          contactName
          contactEmail
          settings
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createVendor: Vendor }>(query, { input });
    return { data: result.data?.createVendor || null };
  }

  async deleteVendor(input: { id: string }): Promise<{ data: Vendor | null }> {
    const query = `
      mutation DeleteVendor($input: DeleteVendorInput!) {
        deleteVendor(input: $input) {
          id
          name
          contactName
          contactEmail
          settings
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ deleteVendor: Vendor }>(query, { input });
    return { data: result.data?.deleteVendor || null };
  }

  // SurveyLink operations
  async createSurveyLink(input: {
    projectId: string;
    uid: string;
    vendorId?: string;
    status: string;
    metadata?: string;
    geoData?: any;
  }): Promise<{ data: SurveyLink | null }> {
    // Clean the input to remove any undefined values that might cause GraphQL issues
    const cleanInput = {
      projectId: input.projectId,
      uid: input.uid,
      status: input.status,
      ...(input.vendorId ? { vendorId: input.vendorId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.geoData ? { geoData: input.geoData } : {})
    };

    console.log('DEBUG: Creating survey link with input:', { uid: cleanInput.uid, linkType: JSON.parse(cleanInput.metadata || '{}').linkType });

    const query = `
      mutation CreateSurveyLink($input: CreateSurveyLinkInput!) {
        createSurveyLink(input: $input) {
          id
          projectId
          uid
          vendorId
          status
          metadata
          createdAt
          updatedAt
          clickedAt
          completedAt
          ipAddress
          userAgent
          geoData
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createSurveyLink: SurveyLink }>(query, { input: cleanInput });
    
    if (result.errors) {
      console.error('GraphQL errors during survey link creation:', result.errors);
    }
    
    if (result.data?.createSurveyLink) {
      console.log('DEBUG: Successfully created survey link:', result.data.createSurveyLink.id);
    } else {
      console.error('DEBUG: Failed to create survey link - no data returned');
    }
    
    return { data: result.data?.createSurveyLink || null };
  }

  async listSurveyLinksByProject(projectId: string): Promise<{ data: SurveyLink[] }> {
    const query = `
      query ListSurveyLinks($filter: ModelSurveyLinkFilterInput) {
        listSurveyLinks(filter: $filter) {
          items {
            id
            projectId
            uid
            vendorId
            status
            metadata
            createdAt
            updatedAt
            clickedAt
            completedAt
            ipAddress
            userAgent
            geoData
          }
        }
      }
    `;

    const filter = {
      projectId: { eq: projectId }
    };

    const result = await this.makeGraphQLRequest<{ listSurveyLinks: { items: SurveyLink[] } }>(query, { filter });
    return { data: result.data?.listSurveyLinks?.items || [] };
  }

  async getSurveyLinkByUid(uid: string): Promise<{ data: SurveyLink | null }> {
    const query = `
      query ListSurveyLinks($filter: ModelSurveyLinkFilterInput) {
        listSurveyLinks(filter: $filter) {
          items {
            id
            projectId
            uid
            vendorId
            status
            metadata
            createdAt
            updatedAt
            clickedAt
            completedAt
            ipAddress
            userAgent
            geoData
          }
        }
      }
    `;

    const filter = {
      uid: { eq: uid }
    };

    const result = await this.makeGraphQLRequest<{ listSurveyLinks: { items: SurveyLink[] } }>(query, { filter });
    const items = result.data?.listSurveyLinks?.items || [];
    return { data: items.length > 0 ? items[0] : null };
  }

  async getSurveyLinkById(id: string): Promise<{ data: SurveyLink | null }> {
    const query = `
      query GetSurveyLink($id: ID!) {
        getSurveyLink(id: $id) {
          id
          projectId
          uid
          vendorId
          status
          metadata
          createdAt
          updatedAt
          clickedAt
          completedAt
          ipAddress
          userAgent
          geoData
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ getSurveyLink: SurveyLink }>(query, { id });
    return { data: result.data?.getSurveyLink || null };
  }

  async updateSurveyLink(id: string, input: {
    status?: string;
    clickedAt?: string;
    completedAt?: string;
    ipAddress?: string;
    userAgent?: string;
    geoData?: any;
    metadata?: string;
  }): Promise<{ data: SurveyLink | null }> {
    const query = `
      mutation UpdateSurveyLink($input: UpdateSurveyLinkInput!) {
        updateSurveyLink(input: $input) {
          id
          projectId
          uid
          vendorId
          status
          metadata
          createdAt
          updatedAt
          clickedAt
          completedAt
          ipAddress
          userAgent
          geoData
        }
      }
    `;

    const updateInput = { id, ...input };
    const result = await this.makeGraphQLRequest<{ updateSurveyLink: SurveyLink }>(query, { input: updateInput });
    return { data: result.data?.updateSurveyLink || null };
  }

  // Question operations
  async createQuestion(input: {
    projectId: string;
    text: string;
    type: string;
    options?: any;
    sequence: number;
    isRequired?: boolean;
    isTrap?: boolean;
    settings?: any;
  }): Promise<{ data: any | null }> {
    const query = `
      mutation CreateQuestion($input: CreateQuestionInput!) {
        createQuestion(input: $input) {
          id
          projectId
          text
          type
          options
          sequence
          isRequired
          isTrap
          settings
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createQuestion: any }>(query, { input });
    return { data: result.data?.createQuestion || null };
  }

  async listQuestionsByProject(projectId: string): Promise<{ data: any[] }> {
    const query = `
      query ListQuestions($filter: ModelQuestionFilterInput) {
        listQuestions(filter: $filter) {
          items {
            id
            projectId
            text
            type
            options
            sequence
            isRequired
            isTrap
            settings
            createdAt
            updatedAt
          }
        }
      }
    `;

    const filter = {
      projectId: { eq: projectId }
    };

    const result = await this.makeGraphQLRequest<{ listQuestions: { items: any[] } }>(query, { filter });
    return { data: result.data?.listQuestions?.items || [] };
  }

  async deleteQuestion(id: string): Promise<{ data: any | null }> {
    const query = `
      mutation DeleteQuestion($input: DeleteQuestionInput!) {
        deleteQuestion(input: $input) {
          id
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ deleteQuestion: any }>(query, { input: { id } });
    return { data: result.data?.deleteQuestion || null };
  }

  // Response operations
  async createResponse(input: {
    surveyLinkId: string;
    questionId: string;
    answer: string;
    metadata?: any;
  }): Promise<{ data: any | null }> {
    const query = `
      mutation CreateResponse($input: CreateResponseInput!) {
        createResponse(input: $input) {
          id
          surveyLinkId
          questionId
          answer
          metadata
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createResponse: any }>(query, { input });
    return { data: result.data?.createResponse || null };
  }

  async listResponsesBySurveyLink(surveyLinkId: string): Promise<{ data: any[] }> {
    const query = `
      query ListResponses($filter: ModelResponseFilterInput) {
        listResponses(filter: $filter) {
          items {
            id
            surveyLinkId
            questionId
            answer
            metadata
            createdAt
            updatedAt
          }
        }
      }
    `;

    const filter = {
      surveyLinkId: { eq: surveyLinkId }
    };

    const result = await this.makeGraphQLRequest<{ listResponses: { items: any[] } }>(query, { filter });
    return { data: result.data?.listResponses?.items || [] };
  }

  // ProjectVendor operations
  async listProjectVendors(filter?: any): Promise<{ data: any[] }> {
    const query = `
      query ListProjectVendors($filter: ModelProjectVendorFilterInput) {
        listProjectVendors(filter: $filter) {
          items {
            id
            projectId
            vendorId
            quota
            currentCount
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listProjectVendors: { items: any[] } }>(query, { filter });
    return { data: result.data?.listProjectVendors?.items || [] };
  }

  async createProjectVendor(input: {
    projectId: string;
    vendorId: string;
    quota?: number;
    currentCount?: number;
  }): Promise<{ data: any | null }> {
    const query = `
      mutation CreateProjectVendor($input: CreateProjectVendorInput!) {
        createProjectVendor(input: $input) {
          id
          projectId
          vendorId
          quota
          currentCount
          createdAt
          updatedAt
        }
      }
    `;

    const createInput = {
      projectId: input.projectId,
      vendorId: input.vendorId,
      quota: input.quota || 0,
      currentCount: input.currentCount || 0
    };

    const result = await this.makeGraphQLRequest<{ createProjectVendor: any }>(query, { input: createInput });
    return { data: result.data?.createProjectVendor || null };
  }

  async updateProjectVendor(projectId: string, vendorId: string, updates: {
    currentCount?: number;
    quota?: number;
  }): Promise<{ data: any | null }> {
    // First find the ProjectVendor record
    const existingResult = await this.listProjectVendors({
      and: [
        { projectId: { eq: projectId } },
        { vendorId: { eq: vendorId } }
      ]
    });

    if (existingResult.data.length === 0) {
      return { data: null };
    }

    const projectVendor = existingResult.data[0];

    const query = `
      mutation UpdateProjectVendor($input: UpdateProjectVendorInput!) {
        updateProjectVendor(input: $input) {
          id
          projectId
          vendorId
          quota
          currentCount
          createdAt
          updatedAt
        }
      }
    `;

    const input = {
      id: projectVendor.id,
      ...updates
    };

    const result = await this.makeGraphQLRequest<{ updateProjectVendor: any }>(query, { input });
    return { data: result.data?.updateProjectVendor || null };
  }

  // Additional utility methods
  async listSurveyLinks(filter?: any): Promise<{ data: SurveyLink[] }> {
    const query = `
      query ListSurveyLinks($filter: ModelSurveyLinkFilterInput) {
        listSurveyLinks(filter: $filter) {
          items {
            id
            projectId
            uid
            vendorId
            status
            metadata
            createdAt
            updatedAt
            clickedAt
            completedAt
            ipAddress
            userAgent
            geoData
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listSurveyLinks: { items: SurveyLink[] } }>(query, { filter });
    return { data: result.data?.listSurveyLinks?.items || [] };
  }

  async listFlagsByProject(projectId: string): Promise<{ data: any[] }> {
    // Get all survey links for the project and analyze for flags
    const surveyLinksResult = await this.listSurveyLinks({
      projectId: { eq: projectId }
    });

    const flags = [];
    for (const link of surveyLinksResult.data) {
      if (link.metadata) {
        try {
          const metadata = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;
          
          // Check for suspicious patterns
          if (metadata.device?.isMobile === false && metadata.device?.isDesktop === false) {
            flags.push({
              id: `flag-${link.id}-device`,
              linkId: link.id,
              type: 'SUSPICIOUS_DEVICE',
              message: 'Unknown device type detected',
              severity: 'MEDIUM',
              createdAt: link.createdAt
            });
          }

          if (metadata.security?.vpnDetected) {
            flags.push({
              id: `flag-${link.id}-vpn`,
              linkId: link.id,
              type: 'VPN_DETECTED',
              message: 'VPN or proxy detected',
              severity: 'HIGH',
              createdAt: link.createdAt
            });
          }

          if (metadata.behavior?.timeOnPage && metadata.behavior.timeOnPage < 5) {
            flags.push({
              id: `flag-${link.id}-speed`,
              linkId: link.id,
              type: 'SUSPICIOUS_SPEED',
              message: 'Completed survey too quickly',
              severity: 'MEDIUM',
              createdAt: link.createdAt
            });
          }

          if (metadata.security?.botScore && metadata.security.botScore > 0.7) {
            flags.push({
              id: `flag-${link.id}-bot`,
              linkId: link.id,
              type: 'BOT_DETECTED',
              message: 'High bot probability detected',
              severity: 'HIGH',
              createdAt: link.createdAt
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    return { data: flags };
  }

  async listVendorsByProject(projectId: string): Promise<{ data: any[] }> {
    // Get project vendors and their vendor details
    const projectVendorsResult = await this.listProjectVendors({
      projectId: { eq: projectId }
    });

    const vendorDetails = [];
    for (const pv of projectVendorsResult.data) {
      const vendorResult = await this.getVendor(pv.vendorId);
      if (vendorResult.data) {
        vendorDetails.push({
          ...vendorResult.data,
          quota: pv.quota,
          currentCount: pv.currentCount,
          projectVendorId: pv.id
        });
      }
    }

    return { data: vendorDetails };
  }

  // Enhanced data collection methods
  async createRawDataRecord(input: Omit<RawDataRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: RawDataRecord | null }> {
    const query = `
      mutation CreateRawDataRecord($input: CreateRawDataRecordInput!) {
        createRawDataRecord(input: $input) {
          id
          projectId
          uid
          surveyData
          presurveyAnswers
          completionData
          enhancedFingerprint
          behavioralData
          securityContext
          geoLocationData
          vpnDetectionData
          ipAddress
          userAgent
          submittedAt
          processingFlags
          dataQualityScore
          timeOnSurvey
          deviceType
          browserType
          locationAccuracy
          securityRisk
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createRawDataRecord: RawDataRecord }>(query, { input });
    return { data: result.data?.createRawDataRecord || null };
  }

  async getRawDataRecord(id: string): Promise<{ data: RawDataRecord | null }> {
    const query = `
      query GetRawDataRecord($id: ID!) {
        getRawDataRecord(id: $id) {
          id
          projectId
          uid
          surveyData
          presurveyAnswers
          completionData
          enhancedFingerprint
          behavioralData
          securityContext
          geoLocationData
          vpnDetectionData
          ipAddress
          userAgent
          submittedAt
          processingFlags
          dataQualityScore
          timeOnSurvey
          deviceType
          browserType
          locationAccuracy
          securityRisk
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ getRawDataRecord: RawDataRecord }>(query, { id });
    return { data: result.data?.getRawDataRecord || null };
  }

  async listRawDataRecords(filter?: any): Promise<{ data: RawDataRecord[] }> {
    const query = `
      query ListRawDataRecords($filter: ModelRawDataRecordFilterInput) {
        listRawDataRecords(filter: $filter) {
          items {
            id
            projectId
            uid
            surveyData
            presurveyAnswers
            completionData
            enhancedFingerprint
            behavioralData
            securityContext
            geoLocationData
            vpnDetectionData
            ipAddress
            userAgent
            submittedAt
            processingFlags
            dataQualityScore
            timeOnSurvey
            deviceType
            browserType
            locationAccuracy
            securityRisk
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listRawDataRecords: { items: RawDataRecord[] } }>(query, { filter });
    return { data: result.data?.listRawDataRecords?.items || [] };
  }

  async listRawDataRecordsByProject(projectId: string): Promise<{ data: RawDataRecord[] }> {
    const filter = { projectId: { eq: projectId } };
    return this.listRawDataRecords(filter);
  }

  async createPresurveyAnswer(input: Omit<PresurveyAnswer, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: PresurveyAnswer | null }> {
    const query = `
      mutation CreatePresurveyAnswer($input: CreatePresurveyAnswerInput!) {
        createPresurveyAnswer(input: $input) {
          id
          projectId
          uid
          questionId
          questionText
          answer
          answerType
          metadata
          ipAddress
          userAgent
          submittedAt
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createPresurveyAnswer: PresurveyAnswer }>(query, { input });
    return { data: result.data?.createPresurveyAnswer || null };
  }

  async listPresurveyAnswers(filter?: any): Promise<{ data: PresurveyAnswer[] }> {
    const query = `
      query ListPresurveyAnswers($filter: ModelPresurveyAnswerFilterInput) {
        listPresurveyAnswers(filter: $filter) {
          items {
            id
            projectId
            uid
            questionId
            questionText
            answer
            answerType
            metadata
            ipAddress
            userAgent
            submittedAt
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listPresurveyAnswers: { items: PresurveyAnswer[] } }>(query, { filter });
    return { data: result.data?.listPresurveyAnswers?.items || [] };
  }

  async listPresurveyAnswersByProject(projectId: string): Promise<{ data: PresurveyAnswer[] }> {
    const filter = { projectId: { eq: projectId } };
    return this.listPresurveyAnswers(filter);
  }

  async listPresurveyAnswersByUid(uid: string): Promise<{ data: PresurveyAnswer[] }> {
    const filter = { uid: { eq: uid } };
    return this.listPresurveyAnswers(filter);
  }

  async createFlag(input: Omit<Flag, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: Flag | null }> {
    const query = `
      mutation CreateFlag($input: CreateFlagInput!) {
        createFlag(input: $input) {
          id
          surveyLinkId
          projectId
          reason
          severity
          message
          metadata
          resolvedAt
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ createFlag: Flag }>(query, { input });
    return { data: result.data?.createFlag || null };
  }

  async updateFlag(id: string, input: Partial<Flag>): Promise<{ data: Flag | null }> {
    const query = `
      mutation UpdateFlag($input: UpdateFlagInput!) {
        updateFlag(input: $input) {
          id
          surveyLinkId
          projectId
          reason
          severity
          message
          metadata
          resolvedAt
          createdAt
          updatedAt
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ updateFlag: Flag }>(query, { input: { id, ...input } });
    return { data: result.data?.updateFlag || null };
  }

  async listFlags(filter?: any): Promise<{ data: Flag[] }> {
    const query = `
      query ListFlags($filter: ModelFlagFilterInput) {
        listFlags(filter: $filter) {
          items {
            id
            surveyLinkId
            projectId
            reason
            severity
            message
            metadata
            resolvedAt
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.makeGraphQLRequest<{ listFlags: { items: Flag[] } }>(query, { filter });
    return { data: result.data?.listFlags?.items || [] };
  }

  async listFlagsByProjectEnhanced(projectId: string): Promise<{ data: Flag[] }> {
    const filter = { projectId: { eq: projectId } };
    return this.listFlags(filter);
  }
}

// Create a singleton instance
let serverService: AmplifyServerService | null = null;

export function getAmplifyServerService(): AmplifyServerService {
  if (!serverService) {
    serverService = new AmplifyServerService();
  }
  return serverService;
}
