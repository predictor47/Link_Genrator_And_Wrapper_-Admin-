import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    
    // External providers configuration
    externalProviders: {
      callbackUrls: [
        'http://localhost:3000/',
        'https://admin.protegeresearchsurvey.com/',
        'https://protegeresearchsurvey.com/'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://admin.protegeresearchsurvey.com/',
        'https://protegeresearchsurvey.com/'
      ]
    },
  },
  
  // Define user attributes
  userAttributes: {
    email: {
      required: true,
      mutable: true
    }
  },
  
  name: "SurveyLinkWrapper",
  accountRecovery: 'EMAIL_ONLY'
});