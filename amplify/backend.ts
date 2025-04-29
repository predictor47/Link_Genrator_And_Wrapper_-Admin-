import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';

// Define your backend configuration
const backend = defineBackend({
  auth,
  data
});

// Configure the password policy in the underlying Cognito User Pool
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 7,
  },
};

export default backend;