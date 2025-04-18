import axios from 'axios';

interface VerifyCaptchaResponse {
  success: boolean;
  errorCodes?: string[];
}

/**
 * Verify hCaptcha token with hCaptcha API
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await axios.post<VerifyCaptchaResponse>(
      'https://hcaptcha.com/siteverify',
      new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET || '',
        response: token,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.success;
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return false;
  }
}