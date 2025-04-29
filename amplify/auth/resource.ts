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
  
  // Add MFA configuration
  multifactor: {
    mode: 'OPTIONAL',
    sms: {
      smsMessage: (code) => `Your verification code is ${code}`
    }
  },
  
  // Define user attributes
  userAttributes: {
    // Standard attributes - only email is a standard attribute here
    email: {
      required: true,
      mutable: true
    }
  },
  
  // Set the name separately from userAttributes since it's a top-level property
  name: "SurveyLinkWrapper",

  // Set account recovery method
  accountRecovery: 'EMAIL_ONLY'
});