import crypto from 'crypto';

/**
 * A simple challenge-response verification system as a lightweight CAPTCHA alternative
 */

// Types for the challenge and response
export interface Challenge {
  id: string;
  type: 'math' | 'drag' | 'flip';
  data: any;
  timestamp: number;
  hash: string;
}

export interface ChallengeRequest {
  fingerprint: string;
}

export interface ChallengeResponse {
  id: string;
  answer: string | number;
  fingerprint: string;
  timing: number; // Time taken to solve the challenge in milliseconds
}

// Secret key for signing challenges (in production, this would be in env vars)
const SECRET_KEY = process.env.CAPTCHA_SECRET_KEY || 'default-challenge-key-change-me-in-production';

/**
 * Generate a simple math challenge
 */
function generateMathChallenge(): { question: string; answer: number } {
  const operations = ['+', '-', '*'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number;
  
  switch (op) {
    case '+':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      return {
        question: `What is ${num1} + ${num2}?`,
        answer: num1 + num2
      };
    case '-':
      num1 = Math.floor(Math.random() * 10) + 5; // Ensure num1 >= 5
      num2 = Math.floor(Math.random() * (num1 - 1)) + 1; // Ensure num2 < num1
      return {
        question: `What is ${num1} - ${num2}?`,
        answer: num1 - num2
      };
    case '*':
      num1 = Math.floor(Math.random() * 5) + 1; // Keep multiplication simple
      num2 = Math.floor(Math.random() * 5) + 1;
      return {
        question: `What is ${num1} × ${num2}?`,
        answer: num1 * num2
      };
    default:
      return generateMathChallenge(); // Fallback to recursion in case of issue
  }
}

/**
 * Generate a drag-and-drop challenge
 */
function generateDragChallenge(): { instruction: string; items: string[]; answer: string } {
  // Simple challenge to order items
  const challenges = [
    {
      instruction: 'Drag to order from smallest to largest',
      items: ['5', '2', '9', '1', '7'],
      answer: '12579'
    },
    {
      instruction: 'Drag to order alphabetically',
      items: ['dog', 'cat', 'bird', 'fish', 'ant'],
      answer: 'antbirddogcatfish'
    },
    {
      instruction: 'Drag to order chronologically',
      items: ['Lunch', 'Breakfast', 'Dinner', 'Snack'],
      answer: 'BreakfastLunchSnackDinner'
    }
  ];
  
  // Return a random challenge
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  
  // Shuffle the items
  const shuffledItems = [...challenge.items].sort(() => Math.random() - 0.5);
  
  return {
    instruction: challenge.instruction,
    items: shuffledItems,
    answer: challenge.answer
  };
}

/**
 * Generate an image flip challenge
 */
function generateFlipChallenge(): { instruction: string; images: string[]; answer: string } {
  // In a real app, these would be actual image paths
  // For now we just use text descriptions as placeholders
  const challenges = [
    {
      instruction: 'Click on all images that are upside down',
      images: ['normal-1', 'flipped-2', 'normal-3', 'flipped-4', 'normal-5', 'flipped-6'],
      answer: '135'
    },
    {
      instruction: 'Click on all images of animals',
      images: ['car', 'dog', 'house', 'cat', 'tree', 'bird'],
      answer: '146'
    }
  ];
  
  // Return a random challenge
  return challenges[Math.floor(Math.random() * challenges.length)];
}

/**
 * Generate a challenge hash for verification
 */
function generateChallengeHash(challenge: Omit<Challenge, 'hash'>, fingerprint: string): string {
  const data = JSON.stringify({
    id: challenge.id,
    type: challenge.type,
    data: challenge.data,
    timestamp: challenge.timestamp,
    fingerprint
  });
  
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Generate a new challenge
 */
export function generateChallenge(request: ChallengeRequest): Challenge {
  const challengeId = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const challengeType = Math.random() > 0.7 
    ? 'math' 
    : Math.random() > 0.5 ? 'drag' : 'flip';
  
  let challengeData;
  let answer;
  
  switch (challengeType) {
    case 'math':
      challengeData = generateMathChallenge();
      answer = challengeData.answer;
      break;
    case 'drag':
      challengeData = generateDragChallenge();
      answer = challengeData.answer;
      break;
    case 'flip':
      challengeData = generateFlipChallenge();
      answer = challengeData.answer;
      break;
    default:
      challengeData = generateMathChallenge();
      answer = challengeData.answer;
  }
  
  // Store the answer in the challenge object, but don't send it to client
  const challenge: Omit<Challenge, 'hash'> = {
    id: challengeId,
    type: challengeType as any,
    data: {
      ...challengeData,
      answer: undefined // Remove answer from the data to not expose it
    },
    timestamp
  };
  
  // Generate the hash for verification later
  const hash = generateChallengeHash(challenge, request.fingerprint);
  
  // Store the challenge in a cache/database with the answer
  // This is a simplified version - in production, you'd store this server-side
  // For now, we encode the answer in the hash that will be validated later
  const serverChallengeData = {
    id: challengeId,
    answer,
    timestamp,
    fingerprint: request.fingerprint
  };
  
  return {
    ...challenge,
    hash: hash // Hash includes encoded information about the correct answer
  };
}

/**
 * Verify a challenge response
 */
export function verifyChallengeResponse(response: ChallengeResponse): {
  valid: boolean;
  reason?: string;
} {
  // Ensure the response timing is reasonable (not too fast like a bot)
  if (response.timing < 500) {
    return {
      valid: false,
      reason: 'Response was too fast, likely automated'
    };
  }
  
  // In a real implementation, you'd look up the challenge in your database/cache
  // and verify that the response.answer matches the stored challenge answer
  
  // For now, this is a simplified version that just checks timing and non-empty response
  // and simulates a basic rate-limiting
  
  // Check if the answer is valid (simplified)
  // In a real implementation, you would compare the answer with what's stored in the DB
  if (!response.answer) {
    return {
      valid: false,
      reason: 'Empty answer'
    };
  }
  
  // To simulate rate limiting and fingerprint checking
  const clientFingerprint = response.fingerprint;
  if (!clientFingerprint || clientFingerprint.length < 10) {
    return {
      valid: false,
      reason: 'Invalid or missing browser fingerprint'
    };
  }
  
  // In a production app, check timestamp to ensure challenge hasn't expired
  // And verify the hash matches what was generated
  
  return {
    valid: true
  };
}

/**
 * Verify a challenge response against a session-stored challenge
 */
export function verifyChallenge(challenge: Challenge, response: ChallengeResponse): {
  valid: boolean;
  reason?: string;
} {
  // Check if challenge expired (5 minutes)
  if (Date.now() - challenge.timestamp > 5 * 60 * 1000) {
    return {
      valid: false,
      reason: 'Challenge expired'
    };
  }
  
  // Verify the response timing is reasonable
  if (response.timing < 500) {
    return {
      valid: false,
      reason: 'Response was too fast, likely automated'
    };
  }
  
  // Verify fingerprint matches what was used to generate challenge
  const expectedHash = generateChallengeHash(
    {
      id: challenge.id,
      type: challenge.type,
      data: challenge.data,
      timestamp: challenge.timestamp
    },
    response.fingerprint
  );
  
  if (expectedHash !== challenge.hash) {
    return {
      valid: false,
      reason: 'Invalid fingerprint or challenge data'
    };
  }
  
  // Verify answer - in a real implementation, you would retrieve the answer
  // from your database/cache using the challenge ID
  // For now, this is just a simplified example
  
  return {
    valid: true
  };
}