import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource for the Link Generator and Wrapper Admin tool
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      // Require email verification during signup
      verificationEmailSubject: 'Your verification code for Survey Link Generator Admin',
      verificationEmailBody: (createCode: () => string) => `Your verification code is: ${createCode()}`,
    },
  },
  multifactor: {
    mode: 'OPTIONAL', // Using the correct enum value
    sms: {
      smsMessage: (createCode: () => string) => `Your authentication code is: ${createCode()}`,
    },
  }});