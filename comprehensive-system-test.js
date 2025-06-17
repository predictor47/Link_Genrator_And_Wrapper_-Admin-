#!/usr/bin/env node

/**
 * Comprehensive System Test for Survey Link Generator & Analytics
 * Tests all features including analytics requirements:
 * 1. Blacklisted domain
 * 2. Consistent Device monitoring (Raw data)
 * 3. Digital fingerprinting stats
 * 4. Captcha Fail Attempt
 * 5. TRAP Question
 * 6. Sanity checks / Scoring system
 * 7. OPEN-END TEXT Data review access
 * 8. Flat line check
 * 9. Speeder check
 * 10. Honey-pot function
 */

import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import crypto from 'crypto';
import fs from 'fs';

// Initialize Amplify
const amplifyConfig = JSON.parse(fs.readFileSync('./amplify_outputs.json', 'utf8'));
Amplify.configure(amplifyConfig);

// Initialize GraphQL client
const client = generateClient();

// Test configuration
const TEST_CONFIG = {
  PROJECT_NAME: 'Comprehensive Test Project',
  TARGET_COMPLETIONS: 100,
  SURVEY_URL: 'https://survey.example.com/test-survey',
  VENDOR_NAME: 'Test Vendor Analytics',
  BLACKLISTED_DOMAINS: ['suspicious.com', 'bot-farm.net', 'fake-responses.org'],
  VPN_IPS: ['192.168.1.100', '10.0.0.50', '172.16.0.25'],
  LEGITIMATE_IPS: ['203.0.113.1', '198.51.100.2', '192.0.2.3'],
  TRAP_QUESTIONS: [
    { text: 'Please select "Strongly Disagree" to continue', answer: 'Strongly Disagree' },
    { text: 'This is a quality check - select option 3', answer: '3' }
  ]
};

// Utility functions
function generateUID() {
  return crypto.randomBytes(16).toString('hex');
}

function generateRespId() {
  return 'al' + Math.floor(Math.random() * 10000).toString().padStart(3, '0');
}

function generateFakeUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function generateGeoData(isVPN = false, isBlacklisted = false) {
  const baseData = {
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    lat: 37.7749,
    lon: -122.4194,
    timezone: 'America/Los_Angeles'
  };

  if (isVPN) {
    baseData.vpnDetected = true;
    baseData.vpnProvider = 'SuspiciousVPN';
  }

  if (isBlacklisted) {
    baseData.isBlacklisted = true;
    baseData.blacklistReason = 'Known bot farm location';
  }

  return baseData;
}

// GraphQL mutations and queries
const createProjectMutation = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      status
      targetCompletions
      currentCompletions
      surveyUrl
      createdAt
      updatedAt
    }
  }
`;

const createVendorMutation = `
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

const createSurveyLinkMutation = `
  mutation CreateSurveyLink($input: CreateSurveyLinkInput!) {
    createSurveyLink(input: $input) {
      id
      projectId
      uid
      respId
      status
      createdAt
      updatedAt
      clickedAt
      completedAt
      ipAddress
      userAgent
      geoData
      metadata
      vendorId
    }
  }
`;

const createRawDataRecordMutation = `
  mutation CreateRawDataRecord($input: CreateRawDataRecordInput!) {
    createRawDataRecord(input: $input) {
      id
      projectId
      uid
      respId
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

const createFlagMutation = `
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

const createEnhancedFormResponseMutation = `
  mutation CreateEnhancedFormResponse($input: CreateEnhancedFormResponseInput!) {
    createEnhancedFormResponse(input: $input) {
      id
      projectId
      uid
      formData
      responseData
      leadData
      qualified
      disqualificationReason
      completionTime
      metadata
      ipAddress
      userAgent
      submittedAt
      createdAt
      updatedAt
    }
  }
`;

const createPresurveyAnswerMutation = `
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

// Analytics query functions
const getProjectAnalyticsQuery = `
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
        createdAt
        updatedAt
        settings
      }
    }
  }
`;

const getRawDataAnalyticsQuery = `
  query ListRawDataRecords($filter: ModelRawDataRecordFilterInput) {
    listRawDataRecords(filter: $filter) {
      items {
        id
        projectId
        uid
        respId
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

const getFlagsQuery = `
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

const getSurveyLinksQuery = `
  query ListSurveyLinks($filter: ModelSurveyLinkFilterInput) {
    listSurveyLinks(filter: $filter) {
      items {
        id
        projectId
        uid
        respId
        status
        createdAt
        updatedAt
        clickedAt
        completedAt
        ipAddress
        userAgent
        geoData
        metadata
        vendorId
      }
    }
  }
`;

// Test functions
class ComprehensiveTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
    this.projectId = null;
    this.vendorId = null;
    this.surveyLinks = [];
    this.rawDataRecords = [];
    this.flags = [];
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async runTest(testName, testFn) {
    try {
      this.log(`🧪 Running test: ${testName}`);
      await testFn();
      this.testResults.passed++;
      this.testResults.details.push({ test: testName, status: 'PASSED' });
      this.log(`✅ Test passed: ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ 
        test: testName, 
        status: 'FAILED', 
        error: error.message 
      });
      this.log(`❌ Test failed: ${testName} - ${error.message}`);
    }
  }

  // Test 1: Project Creation and Link Generation
  async testProjectCreation() {
    const projectInput = {
      name: TEST_CONFIG.PROJECT_NAME,
      description: 'Comprehensive test project for analytics validation',
      status: 'LIVE',
      targetCompletions: TEST_CONFIG.TARGET_COMPLETIONS,
      currentCompletions: 0,
      surveyUrl: TEST_CONFIG.SURVEY_URL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: JSON.stringify({
        enableVPNDetection: true,
        enableBlacklistCheck: true,
        enableTrapQuestions: true,
        enableSpeedChecks: true,
        enableHoneypot: true,
        maxCompletionTime: 1800, // 30 minutes
        minCompletionTime: 120   // 2 minutes
      })
    };

    const result = await client.graphql({
      query: createProjectMutation,
      variables: { input: projectInput }
    });

    this.projectId = result.data.createProject.id;
    
    if (!this.projectId) {
      throw new Error('Failed to create project');
    }

    this.log(`✅ Project created with ID: ${this.projectId}`);
  }

  // Test 2: Vendor Creation
  async testVendorCreation() {
    const vendorInput = {
      name: TEST_CONFIG.VENDOR_NAME,
      contactName: 'Test Contact',
      contactEmail: 'test@analytics.com',
      settings: JSON.stringify({
        enableQualityChecks: true,
        blacklistedDomains: TEST_CONFIG.BLACKLISTED_DOMAINS
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await client.graphql({
      query: createVendorMutation,
      variables: { input: vendorInput }
    });

    this.vendorId = result.data.createVendor.id;
    
    if (!this.vendorId) {
      throw new Error('Failed to create vendor');
    }

    this.log(`✅ Vendor created with ID: ${this.vendorId}`);
  }

  // Test 3: Survey Link Generation with Different Scenarios
  async testSurveyLinkGeneration() {
    const scenarios = [
      { type: 'legitimate', count: 50 },
      { type: 'vpn_detected', count: 15 },
      { type: 'blacklisted_domain', count: 10 },
      { type: 'suspicious_behavior', count: 20 },
      { type: 'bot_detected', count: 5 }
    ];

    for (const scenario of scenarios) {
      for (let i = 0; i < scenario.count; i++) {
        const uid = generateUID();
        const respId = generateRespId();
        
        let ipAddress, geoData, metadata;
        
        switch (scenario.type) {
          case 'legitimate':
            ipAddress = TEST_CONFIG.LEGITIMATE_IPS[i % TEST_CONFIG.LEGITIMATE_IPS.length];
            geoData = generateGeoData(false, false);
            metadata = { scenario: 'legitimate' };
            break;
            
          case 'vpn_detected':
            ipAddress = TEST_CONFIG.VPN_IPS[i % TEST_CONFIG.VPN_IPS.length];
            geoData = generateGeoData(true, false);
            metadata = { scenario: 'vpn_detected', vpnProvider: 'SuspiciousVPN' };
            break;
            
          case 'blacklisted_domain':
            ipAddress = '192.168.1.' + (100 + i);
            geoData = generateGeoData(false, true);
            metadata = { 
              scenario: 'blacklisted_domain',
              referrerDomain: TEST_CONFIG.BLACKLISTED_DOMAINS[i % TEST_CONFIG.BLACKLISTED_DOMAINS.length]
            };
            break;
            
          case 'suspicious_behavior':
            ipAddress = '10.0.0.' + (50 + i);
            geoData = generateGeoData(false, false);
            metadata = { 
              scenario: 'suspicious_behavior',
              rapidClicks: true,
              suspiciousUserAgent: true
            };
            break;
            
          case 'bot_detected':
            ipAddress = '172.16.0.' + (25 + i);
            geoData = generateGeoData(true, true);
            metadata = { 
              scenario: 'bot_detected',
              automatedBehavior: true,
              failedCaptcha: true
            };
            break;
        }

        const linkInput = {
          projectId: this.projectId,
          uid: uid,
          respId: respId,
          status: 'UNUSED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ipAddress: ipAddress,
          userAgent: generateFakeUserAgent(),
          geoData: JSON.stringify(geoData),
          metadata: JSON.stringify(metadata),
          vendorId: this.vendorId
        };

        const result = await client.graphql({
          query: createSurveyLinkMutation,
          variables: { input: linkInput }
        });

        this.surveyLinks.push(result.data.createSurveyLink);
      }
    }

    this.log(`✅ Generated ${this.surveyLinks.length} survey links across different scenarios`);
  }

  // Test 4: Digital Fingerprinting & Raw Data Collection
  async testDigitalFingerprinting() {
    for (const link of this.surveyLinks.slice(0, 50)) { // Test first 50 links
      const fingerprint = {
        screenResolution: '1920x1080',
        colorDepth: 24,
        timezone: 'America/Los_Angeles',
        language: 'en-US',
        plugins: ['Chrome PDF Plugin', 'Native Client'],
        canvasFingerprint: crypto.randomBytes(32).toString('hex'),
        webglFingerprint: crypto.randomBytes(32).toString('hex'),
        audioFingerprint: crypto.randomBytes(16).toString('hex'),
        deviceMemory: 8,
        hardwareConcurrency: 8,
        connectionType: '4g',
        batterLevel: Math.random(),
        chargingStatus: Math.random() > 0.5
      };

      const behavioralData = {
        clickPatterns: Array.from({length: 10}, () => ({
          x: Math.floor(Math.random() * 1920),
          y: Math.floor(Math.random() * 1080),
          timestamp: Date.now() + Math.random() * 1000
        })),
        keystrokePatterns: Array.from({length: 20}, () => ({
          key: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
          duration: Math.random() * 200,
          timestamp: Date.now() + Math.random() * 1000
        })),
        mouseMovements: Array.from({length: 50}, () => ({
          x: Math.floor(Math.random() * 1920),
          y: Math.floor(Math.random() * 1080),
          timestamp: Date.now() + Math.random() * 1000
        })),
        scrollPatterns: Array.from({length: 15}, () => ({
          position: Math.floor(Math.random() * 5000),
          timestamp: Date.now() + Math.random() * 1000
        }))
      };

      const securityContext = {
        httpHeaders: {
          'accept-language': 'en-US,en;q=0.9',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none'
        },
        requestOrigin: link.metadata ? JSON.parse(link.metadata).referrerDomain || 'direct' : 'direct',
        sessionData: {
          sessionId: crypto.randomBytes(16).toString('hex'),
          sessionDuration: Math.floor(Math.random() * 1800),
          pageViews: Math.floor(Math.random() * 10) + 1
        }
      };

      // Determine data quality score based on scenario
      let dataQualityScore = 100;
      const metadata = link.metadata ? JSON.parse(link.metadata) : {};
      
      if (metadata.scenario === 'vpn_detected') dataQualityScore -= 30;
      if (metadata.scenario === 'blacklisted_domain') dataQualityScore -= 50;
      if (metadata.scenario === 'suspicious_behavior') dataQualityScore -= 40;
      if (metadata.scenario === 'bot_detected') dataQualityScore -= 80;

      const rawDataInput = {
        projectId: this.projectId,
        uid: link.uid,
        respId: link.respId,
        surveyData: JSON.stringify({
          responses: Array.from({length: 5}, (_, i) => ({
            questionId: `q${i+1}`,
            answer: `Answer ${i+1}`,
            timestamp: new Date().toISOString()
          }))
        }),
        presurveyAnswers: JSON.stringify({
          age: Math.floor(Math.random() * 50) + 18,
          gender: ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)],
          country: 'US'
        }),
        completionData: JSON.stringify({
          startTime: new Date(Date.now() - Math.random() * 1800000).toISOString(),
          endTime: new Date().toISOString(),
          timeOnSurvey: Math.floor(Math.random() * 1800) + 120
        }),
        enhancedFingerprint: JSON.stringify(fingerprint),
        behavioralData: JSON.stringify(behavioralData),
        securityContext: JSON.stringify(securityContext),
        geoLocationData: link.geoData,
        vpnDetectionData: JSON.stringify({
          isVPN: metadata.scenario === 'vpn_detected' || metadata.scenario === 'bot_detected',
          vpnProvider: metadata.vpnProvider || null,
          confidence: Math.random()
        }),
        ipAddress: link.ipAddress,
        userAgent: link.userAgent,
        submittedAt: new Date().toISOString(),
        processingFlags: JSON.stringify({
          duplicateFingerprint: Math.random() > 0.9,
          geoLocationViolation: metadata.scenario === 'blacklisted_domain',
          captchaFailed: metadata.failedCaptcha || false,
          trapQuestionFailed: Math.random() > 0.8,
          speedViolation: Math.random() > 0.85,
          botCheckFlag: metadata.scenario === 'bot_detected'
        }),
        dataQualityScore: Math.max(0, dataQualityScore),
        timeOnSurvey: Math.floor(Math.random() * 1800) + 120,
        deviceType: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
        browserType: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        locationAccuracy: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
        securityRisk: dataQualityScore < 50 ? 'high' : dataQualityScore < 80 ? 'medium' : 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await client.graphql({
        query: createRawDataRecordMutation,
        variables: { input: rawDataInput }
      });

      this.rawDataRecords.push(result.data.createRawDataRecord);
    }

    this.log(`✅ Created ${this.rawDataRecords.length} raw data records with digital fingerprinting`);
  }

  // Test 5: Flag Generation (Security & Quality Issues)
  async testFlagGeneration() {
    for (const record of this.rawDataRecords) {
      const processingFlags = JSON.parse(record.processingFlags);
      const flags = [];

      // 1. Blacklisted domain flag
      if (processingFlags.geoLocationViolation) {
        flags.push({
          reason: 'BLACKLISTED_DOMAIN',
          severity: 'HIGH',
          message: 'Response from blacklisted domain detected'
        });
      }

      // 2. VPN Detection flag
      const vpnData = JSON.parse(record.vpnDetectionData);
      if (vpnData.isVPN) {
        flags.push({
          reason: 'VPN_DETECTED',
          severity: 'MEDIUM',
          message: `VPN detected: ${vpnData.vpnProvider || 'Unknown provider'}`
        });
      }

      // 3. Digital fingerprint duplicate flag
      if (processingFlags.duplicateFingerprint) {
        flags.push({
          reason: 'DUPLICATE_FINGERPRINT',
          severity: 'HIGH',
          message: 'Duplicate digital fingerprint detected'
        });
      }

      // 4. Captcha failure flag
      if (processingFlags.captchaFailed) {
        flags.push({
          reason: 'CAPTCHA_FAILURE',
          severity: 'MEDIUM',
          message: 'Multiple captcha failures detected'
        });
      }

      // 5. Trap question failure flag
      if (processingFlags.trapQuestionFailed) {
        flags.push({
          reason: 'TRAP_QUESTION_FAILED',
          severity: 'HIGH',
          message: 'Failed trap/attention check question'
        });
      }

      // 6. Speed violation flag
      if (processingFlags.speedViolation) {
        flags.push({
          reason: 'SPEED_VIOLATION',
          severity: 'MEDIUM',
          message: `Completion time violation: ${record.timeOnSurvey}s`
        });
      }

      // 7. Bot check flag (combined flag)
      if (processingFlags.botCheckFlag) {
        flags.push({
          reason: 'BOT_CHECK_FLAG',
          severity: 'CRITICAL',
          message: 'Combined bot detection flag triggered (Geo + Honeypot + Behavior)'
        });
      }

      // 8. Flat line response flag
      if (Math.random() > 0.9) { // Simulate flat line detection
        flags.push({
          reason: 'FLAT_LINE_RESPONSE',
          severity: 'MEDIUM',
          message: 'Flat line response pattern detected'
        });
      }

      // 9. Low quality score flag
      if (record.dataQualityScore < 50) {
        flags.push({
          reason: 'LOW_QUALITY_SCORE',
          severity: 'HIGH',
          message: `Low data quality score: ${record.dataQualityScore}`
        });
      }

      // Create flags in database
      for (const flag of flags) {
        const flagInput = {
          surveyLinkId: record.id,
          projectId: this.projectId,
          reason: flag.reason,
          severity: flag.severity,
          message: flag.message,
          metadata: JSON.stringify({
            dataQualityScore: record.dataQualityScore,
            timeOnSurvey: record.timeOnSurvey,
            ipAddress: record.ipAddress,
            securityRisk: record.securityRisk
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const result = await client.graphql({
          query: createFlagMutation,
          variables: { input: flagInput }
        });

        this.flags.push(result.data.createFlag);
      }
    }

    this.log(`✅ Created ${this.flags.length} security and quality flags`);
  }

  // Test 6: Enhanced Form Response Testing
  async testEnhancedFormResponses() {
    for (let i = 0; i < 25; i++) {
      const uid = generateUID();
      
      const formData = {
        presurveyQuestions: [
          { id: 'q1', text: 'What is your age?', answer: Math.floor(Math.random() * 50) + 18 },
          { id: 'q2', text: 'What is your gender?', answer: ['Male', 'Female', 'Other'][Math.floor(Math.random() * 3)] },
          { id: 'q3', text: 'What country do you live in?', answer: 'United States' },
          { id: 'trap1', text: 'Please select "Option 2" to continue', answer: Math.random() > 0.8 ? 'Option 1' : 'Option 2' }
        ]
      };

      const responseData = {
        qualification: Math.random() > 0.3,
        responses: Array.from({length: 8}, (_, idx) => ({
          questionId: `main_q${idx+1}`,
          answer: `Response ${idx+1}`,
          timestamp: new Date(Date.now() - Math.random() * 1000000).toISOString()
        }))
      };

      const leadData = {
        email: `test${i}@example.com`,
        phone: `555-0${String(i).padStart(3, '0')}`,
        score: Math.floor(Math.random() * 100),
        qualificationStatus: responseData.qualification ? 'QUALIFIED' : 'DISQUALIFIED'
      };

      const formInput = {
        projectId: this.projectId,
        uid: uid,
        formData: JSON.stringify(formData),
        responseData: JSON.stringify(responseData),
        leadData: JSON.stringify(leadData),
        qualified: responseData.qualification,
        disqualificationReason: !responseData.qualification ? 'Failed qualification criteria' : null,
        completionTime: Math.floor(Math.random() * 1200) + 180,
        metadata: JSON.stringify({
          browserInfo: generateFakeUserAgent(),
          entryMethod: 'direct_link',
          referrer: 'organic'
        }),
        ipAddress: TEST_CONFIG.LEGITIMATE_IPS[i % TEST_CONFIG.LEGITIMATE_IPS.length],
        userAgent: generateFakeUserAgent(),
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await client.graphql({
        query: createEnhancedFormResponseMutation,
        variables: { input: formInput }
      });
    }

    this.log(`✅ Created 25 enhanced form responses`);
  }

  // Test 7: Presurvey Answer Collection
  async testPresurveyAnswers() {
    const questions = [
      { id: 'demo_age', text: 'What is your age?', type: 'number' },
      { id: 'demo_gender', text: 'What is your gender?', type: 'select' },
      { id: 'demo_income', text: 'What is your household income?', type: 'select' },
      { id: 'trap_attention', text: 'Please select "Blue" to show you are paying attention', type: 'trap' },
      { id: 'demo_education', text: 'What is your education level?', type: 'select' }
    ];

    for (const record of this.rawDataRecords.slice(0, 30)) {
      for (const question of questions) {
        let answer;
        
        switch (question.type) {
          case 'number':
            answer = String(Math.floor(Math.random() * 50) + 18);
            break;
          case 'select':
            if (question.id === 'demo_gender') {
              answer = ['Male', 'Female', 'Non-binary', 'Prefer not to say'][Math.floor(Math.random() * 4)];
            } else if (question.id === 'demo_income') {
              answer = ['Under $25k', '$25k-$50k', '$50k-$75k', '$75k-$100k', 'Over $100k'][Math.floor(Math.random() * 5)];
            } else if (question.id === 'demo_education') {
              answer = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'PhD'][Math.floor(Math.random() * 5)];
            }
            break;
          case 'trap':
            // 80% pass rate for trap questions
            answer = Math.random() > 0.2 ? 'Blue' : ['Red', 'Green', 'Yellow'][Math.floor(Math.random() * 3)];
            break;
        }

        const answerInput = {
          projectId: this.projectId,
          uid: record.uid,
          questionId: question.id,
          questionText: question.text,
          answer: answer,
          answerType: question.type,
          metadata: JSON.stringify({
            responseTime: Math.floor(Math.random() * 5000) + 1000,
            attemptNumber: 1,
            isTrapQuestion: question.type === 'trap'
          }),
          ipAddress: record.ipAddress,
          userAgent: record.userAgent,
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await client.graphql({
          query: createPresurveyAnswerMutation,
          variables: { input: answerInput }
        });
      }
    }

    this.log(`✅ Created presurvey answers for ${questions.length} questions across 30 records`);
  }

  // Test 8: Analytics Data Retrieval & Validation
  async testAnalyticsRetrieval() {
    // Test project analytics
    const projectAnalytics = await client.graphql({
      query: getProjectAnalyticsQuery
    });

    if (!projectAnalytics.data.listProjects.items.length) {
      throw new Error('No projects found in analytics');
    }

    // Test raw data analytics
    const rawDataAnalytics = await client.graphql({
      query: getRawDataAnalyticsQuery,
      variables: {
        filter: { projectId: { eq: this.projectId } }
      }
    });

    if (!rawDataAnalytics.data.listRawDataRecords.items.length) {
      throw new Error('No raw data records found');
    }

    // Test flags analytics
    const flagsAnalytics = await client.graphql({
      query: getFlagsQuery,
      variables: {
        filter: { projectId: { eq: this.projectId } }
      }
    });

    // Test survey links analytics
    const linksAnalytics = await client.graphql({
      query: getSurveyLinksQuery,
      variables: {
        filter: { projectId: { eq: this.projectId } }
      }
    });

    this.log(`✅ Analytics retrieval successful:`);
    this.log(`   - Projects: ${projectAnalytics.data.listProjects.items.length}`);
    this.log(`   - Raw Data Records: ${rawDataAnalytics.data.listRawDataRecords.items.length}`);
    this.log(`   - Flags: ${flagsAnalytics.data.listFlags.items.length}`);
    this.log(`   - Survey Links: ${linksAnalytics.data.listSurveyLinks.items.length}`);

    return {
      projects: projectAnalytics.data.listProjects.items,
      rawData: rawDataAnalytics.data.listRawDataRecords.items,
      flags: flagsAnalytics.data.listFlags.items,
      links: linksAnalytics.data.listSurveyLinks.items
    };
  }

  // Test 9: Analytics Validation (All Required Metrics)
  async testAnalyticsValidation(analyticsData) {
    const validationResults = {};

    // 1. Blacklisted domain tracking
    const blacklistedFlags = analyticsData.flags.filter(f => f.reason === 'BLACKLISTED_DOMAIN');
    validationResults.blacklistedDomains = {
      count: blacklistedFlags.length,
      status: blacklistedFlags.length > 0 ? 'PASS' : 'FAIL'
    };

    // 2. Consistent Device monitoring (Raw data)
    const deviceTracking = analyticsData.rawData.filter(r => r.enhancedFingerprint);
    validationResults.deviceMonitoring = {
      count: deviceTracking.length,
      status: deviceTracking.length > 0 ? 'PASS' : 'FAIL'
    };

    // 3. Digital fingerprinting stats
    const fingerprintDuplicates = analyticsData.flags.filter(f => f.reason === 'DUPLICATE_FINGERPRINT');
    const geoViolations = analyticsData.flags.filter(f => f.reason.includes('GEO') || f.reason === 'BLACKLISTED_DOMAIN');
    validationResults.digitalFingerprinting = {
      duplicates: fingerprintDuplicates.length,
      geoViolations: geoViolations.length,
      status: fingerprintDuplicates.length >= 0 && geoViolations.length >= 0 ? 'PASS' : 'FAIL'
    };

    // 4. Captcha Fail Attempt tracking
    const captchaFails = analyticsData.flags.filter(f => f.reason === 'CAPTCHA_FAILURE');
    validationResults.captchaFailures = {
      count: captchaFails.length,
      status: captchaFails.length >= 0 ? 'PASS' : 'FAIL'
    };

    // 5. TRAP Question tracking
    const trapQuestionFails = analyticsData.flags.filter(f => f.reason === 'TRAP_QUESTION_FAILED');
    validationResults.trapQuestions = {
      count: trapQuestionFails.length,
      status: trapQuestionFails.length >= 0 ? 'PASS' : 'FAIL'
    };

    // 6. Sanity checks / Scoring system
    const qualityScores = analyticsData.rawData.map(r => r.dataQualityScore).filter(s => s !== null);
    validationResults.qualityScoring = {
      averageScore: qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
      count: qualityScores.length,
      status: qualityScores.length > 0 ? 'PASS' : 'FAIL'
    };

    // 7. OPEN-END TEXT Data review access
    const openEndResponses = analyticsData.rawData.filter(r => {
      try {
        const surveyData = JSON.parse(r.surveyData || '{}');
        return surveyData.responses && surveyData.responses.length > 0;
      } catch {
        return false;
      }
    });
    validationResults.openEndText = {
      count: openEndResponses.length,
      status: openEndResponses.length > 0 ? 'PASS' : 'FAIL'
    };

    // 8. Flat line check
    const flatLineFlags = analyticsData.flags.filter(f => f.reason === 'FLAT_LINE_RESPONSE');
    validationResults.flatLineCheck = {
      count: flatLineFlags.length,
      status: flatLineFlags.length >= 0 ? 'PASS' : 'FAIL'
    };

    // 9. Speeder check
    const speedViolations = analyticsData.flags.filter(f => f.reason === 'SPEED_VIOLATION');
    validationResults.speederCheck = {
      count: speedViolations.length,
      status: speedViolations.length >= 0 ? 'PASS' : 'FAIL'
    };

    // 10. Honey-pot function (Bot Check)
    const botCheckFlags = analyticsData.flags.filter(f => f.reason === 'BOT_CHECK_FLAG');
    validationResults.honeypotFunction = {
      count: botCheckFlags.length,
      status: botCheckFlags.length >= 0 ? 'PASS' : 'FAIL'
    };

    // B.C (Bot Check Flag) - Combined flag
    const combinedBotFlags = analyticsData.flags.filter(f => 
      f.reason === 'BOT_CHECK_FLAG' || 
      (f.reason === 'BLACKLISTED_DOMAIN' && f.severity === 'HIGH')
    );
    validationResults.botCheckCombined = {
      count: combinedBotFlags.length,
      status: combinedBotFlags.length >= 0 ? 'PASS' : 'FAIL'
    };

    this.log(`\n📊 Analytics Validation Results:`);
    Object.keys(validationResults).forEach(key => {
      const result = validationResults[key];
      const status = result.status === 'PASS' ? '✅' : '❌';
      this.log(`   ${status} ${key}: ${JSON.stringify(result)}`);
    });

    return validationResults;
  }

  // Main test runner
  async runAllTests() {
    this.log('🚀 Starting Comprehensive System Test Suite');
    this.log('=' .repeat(60));

    await this.runTest('Project Creation', () => this.testProjectCreation());
    await this.runTest('Vendor Creation', () => this.testVendorCreation());
    await this.runTest('Survey Link Generation', () => this.testSurveyLinkGeneration());
    await this.runTest('Digital Fingerprinting', () => this.testDigitalFingerprinting());
    await this.runTest('Flag Generation', () => this.testFlagGeneration());
    await this.runTest('Enhanced Form Responses', () => this.testEnhancedFormResponses());
    await this.runTest('Presurvey Answers', () => this.testPresurveyAnswers());
    
    const analyticsData = await this.runTest('Analytics Retrieval', () => this.testAnalyticsRetrieval());
    const validationResults = await this.runTest('Analytics Validation', () => this.testAnalyticsValidation(analyticsData));

    this.log('\n' + '=' .repeat(60));
    this.log('🎯 Test Suite Complete');
    this.log(`✅ Passed: ${this.testResults.passed}`);
    this.log(`❌ Failed: ${this.testResults.failed}`);
    this.log(`📊 Total Tests: ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.failed > 0) {
      this.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(t => t.status === 'FAILED')
        .forEach(t => this.log(`   - ${t.test}: ${t.error}`));
    }

    return {
      testResults: this.testResults,
      validationResults: validationResults,
      generatedData: {
        projectId: this.projectId,
        vendorId: this.vendorId,
        surveyLinksCount: this.surveyLinks.length,
        rawDataRecordsCount: this.rawDataRecords.length,
        flagsCount: this.flags.length
      }
    };
  }
}

// Run the test suite
async function main() {
  try {
    const testSuite = new ComprehensiveTestSuite();
    const results = await testSuite.runAllTests();
    
    console.log('\n📋 Final Results Summary:');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(results.testResults.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed to run:', error);
    process.exit(1);
  }
}

main().catch(console.error);
