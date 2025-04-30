import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    
    // External providers configuration
    externalProviders: {
      callbackUrls: [
        'http://localhost:3000/',
        'https://yourdomain.com/'
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://yourdomain.com/'
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