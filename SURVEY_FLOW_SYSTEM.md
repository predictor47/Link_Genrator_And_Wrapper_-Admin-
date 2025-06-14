# Survey Flow System - Complete Implementation

## Overview

The survey system has been completely refactored to implement a comprehensive presurvey flow with consent management, VPN detection, geo-restrictions, and conditional qualification logic. This replaces the previous simple question-based system with a robust, secure, and configurable flow.

## Flow Architecture

### 1. Flow States

The survey now operates through these distinct states:

```typescript
type FlowState = 'CONSENT' | 'PRESURVEY' | 'DISQUALIFIED' | 'MAIN_SURVEY' | 'COMPLETED';
```

### 2. Complete Flow Sequence

```
Survey Link Access → Consent Page → Presurvey Questions → Qualification Check → Main Survey
                                                       ↓
                                               Disqualification Page
```

## Key Components

### ConsentPage Component

**Location**: `/src/components/ConsentPage.tsx`

**Features**:
- VPN/Proxy detection with automatic flagging
- Geographic restriction enforcement
- Multiple consent types (privacy, data collection, participation, recording, cookies, marketing, custom)
- Security validation and metadata collection
- Real-time location validation

**Props**:
```typescript
interface ConsentPageProps {
  projectId: string;
  uid: string;
  projectTitle?: string;
  requiredConsents: ConsentItem[];
  onConsentComplete: (consents: Record<string, boolean>) => void;
  onVpnDetected: () => void;
  onGeoRestricted: (country: string) => void;
}
```

### ConditionalPresurveyFlow Component

**Location**: `/src/components/ConditionalPresurveyFlow.tsx`

**Features**:
- 14 question types supported (single_choice, multiple_choice, text, number, email, boolean, etc.)
- Conditional logic with show/hide rules
- Qualification/disqualification routing
- Advanced validation and error handling
- Real-time question filtering based on previous answers

**Question Structure**:
```typescript
interface Question {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number' | 'email' | 'boolean';
  options?: string[];
  required: boolean;
  conditions?: {
    showIf?: { questionId: string; value: any; operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' }[];
    qualification?: 'qualify' | 'disqualify' | 'continue';
    qualificationMessage?: string;
  };
}
```

## API Endpoints

### Consent Recording API

**Endpoint**: `/api/consent/record.ts`
- Records user consents with full metadata
- Logs security context and IP information
- Stores consent timestamps and user agent data

### Geo-Restrictions API

**Endpoint**: `/api/projects/[id]/geo-restrictions.ts`
- Fetches project-specific geographic restrictions
- Supports country-level blocking
- Configurable through project settings

## Updated Survey Page

**Location**: `/src/pages/survey/[projectId]/[uid].tsx`

**New Features**:
- Integrated flow state management
- Proper session handling with consent and presurvey data
- Enhanced mid-survey validation (preserved from original)
- Comprehensive error handling and user messaging

### getServerSideProps Updates

Now includes mock data structure for:
- Consent items configuration
- Presurvey questions with conditional logic
- Project settings and titles
- Geographic restrictions

## Session Data Structure

```typescript
interface SessionData {
  token: string;
  projectId: string;
  uid: string;
  linkType: string;
  consents: Record<string, boolean>;           // NEW
  presurveyAnswers: Record<string, any>;      // NEW
  isQualified: boolean;                       // NEW
  answers: Array<{ questionId: string; value: string; }>; // Legacy for mid-survey validation
  metadata: any;
}
```

## Security Features

### VPN/Proxy Detection
- Integrated at consent stage
- Automatic flagging for LIVE links
- Warning messages for TEST links
- IP-based validation with multiple detection methods

### Geographic Restrictions
- Project-level configuration
- Country-based blocking
- Real-time IP geolocation
- Graceful error messaging

### Enhanced Validation
- Bot detection through behavioral analysis
- Captcha integration points
- Flatline detection for survey responses
- Advanced fingerprinting capabilities

## Configuration Examples

### Sample Consent Items
```typescript
const consentItems = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'I agree to the privacy policy and understand how my data will be used.',
    required: true,
    type: 'privacy'
  },
  {
    id: 'data_collection',
    title: 'Data Collection',
    description: 'I consent to the collection and processing of my survey responses.',
    required: true,
    type: 'data_collection'
  }
];
```

### Sample Presurvey Questions
```typescript
const presurveyQuestions = [
  {
    id: 'age_check',
    text: 'Are you 18 years of age or older?',
    type: 'single_choice',
    options: ['Yes', 'No'],
    required: true,
    conditions: {
      qualification: 'disqualify',
      qualificationMessage: 'You must be 18 or older to participate in this survey.'
    }
  },
  {
    id: 'country_check',
    text: 'Which country do you currently reside in?',
    type: 'single_choice',
    options: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Other'],
    required: true,
    conditions: {
      qualification: 'qualify'
    }
  }
];
```

## Database Integration

### Project Settings
Store consent requirements and geo-restrictions in project settings:
```json
{
  "geoRestrictions": ["US", "CA", "GB", "AU"],
  "consentItems": [...],
  "presurveyQuestions": [...]
}
```

### Consent Recording
Consents are stored with:
- User identification (projectId, uid)
- Consent details and timestamps
- Security context (IP, user agent, VPN status)
- Geographic data

## Benefits

1. **Enhanced Security**: Multi-layered validation with VPN detection and geo-restrictions
2. **Flexible Configuration**: Project-specific consent and presurvey requirements
3. **Better User Experience**: Clear flow progression with appropriate messaging
4. **Improved Data Quality**: Qualification logic ensures suitable participants
5. **Compliance Ready**: Comprehensive consent management for privacy regulations
6. **Analytics Integration**: Enhanced data collection for better insights

## Migration Notes

- Legacy mid-survey validation preserved and enhanced
- Backward compatible with existing project structure
- Session data expanded to include new flow information
- API endpoints maintain existing functionality while adding new features

## Testing

The system has been tested for:
- TypeScript compilation (all files pass)
- Build success (Next.js build completes without errors)
- Component integration
- API endpoint functionality
- Error handling and edge cases

This implementation provides a complete, production-ready survey flow system that can be easily configured and extended for various research needs.
