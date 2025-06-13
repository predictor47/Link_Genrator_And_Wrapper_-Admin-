/**
 * Honeypot Question Service
 * Invisible questions to detect automated/bot responses
 */

interface HoneypotQuestion {
  id: string;
  fieldName: string;
  type: 'text' | 'checkbox' | 'select' | 'hidden';
  label?: string;
  placeholder?: string;
  options?: string[];
  expectedAnswer?: string | boolean;
  triggerFlags: string[];
  styling: 'invisible' | 'offscreen' | 'transparent' | 'hidden';
}

interface HoneypotResult {
  triggered: boolean;
  triggeredQuestions: string[];
  suspicionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  confidence: number;
}

// Predefined honeypot questions
const HONEYPOT_QUESTIONS: HoneypotQuestion[] = [
  {
    id: 'hp_email_confirm',
    fieldName: 'email_confirmation',
    type: 'text',
    label: 'Confirm your email address',
    placeholder: 'Enter your email again',
    expectedAnswer: '',
    triggerFlags: ['BOT_FILLED_HONEYPOT', 'EMAIL_CONFIRMATION_FILLED'],
    styling: 'invisible'
  },
  {
    id: 'hp_website',
    fieldName: 'website_url',
    type: 'text',
    label: 'Website URL (leave blank)',
    placeholder: 'http://',
    expectedAnswer: '',
    triggerFlags: ['BOT_FILLED_WEBSITE', 'SPAM_PATTERN'],
    styling: 'offscreen'
  },
  {
    id: 'hp_phone_verify',
    fieldName: 'phone_verification',
    type: 'text',
    label: 'Phone verification',
    placeholder: 'Enter verification code',
    expectedAnswer: '',
    triggerFlags: ['BOT_FILLED_PHONE', 'FAKE_VERIFICATION'],
    styling: 'transparent'
  },
  {
    id: 'hp_checkbox_invisible',
    fieldName: 'terms_extra',
    type: 'checkbox',
    label: 'I agree to receive promotional emails',
    expectedAnswer: false,
    triggerFlags: ['BOT_CHECKED_HONEYPOT', 'AUTOMATED_INTERACTION'],
    styling: 'invisible'
  },
  {
    id: 'hp_select_hidden',
    fieldName: 'preferred_contact',
    type: 'select',
    label: 'Preferred contact method',
    options: ['Email', 'Phone', 'SMS', 'Mail'],
    expectedAnswer: '',
    triggerFlags: ['BOT_SELECTED_OPTION', 'AUTOMATED_FORM_FILL'],
    styling: 'hidden'
  },
  {
    id: 'hp_timestamp_check',
    fieldName: 'form_timestamp',
    type: 'hidden',
    expectedAnswer: '',
    triggerFlags: ['TIMING_ANOMALY', 'TOO_FAST_SUBMISSION'],
    styling: 'hidden'
  },
  {
    id: 'hp_math_question',
    fieldName: 'security_check',
    type: 'text',
    label: 'What is 5 + 3? (Security check)',
    placeholder: 'Enter the answer',
    expectedAnswer: '',
    triggerFlags: ['BOT_ANSWERED_MATH', 'FAILED_HUMAN_TEST'],
    styling: 'offscreen'
  }
];

export class HoneypotService {
  private generatedQuestions = new Map<string, HoneypotQuestion[]>();
  private submissionTimes = new Map<string, number>();

  /**
   * Generate honeypot questions for a form
   */
  generateHoneypots(sessionId: string, questionCount: number = 3): {
    questions: HoneypotQuestion[];
    css: string;
    javascript: string;
  } {
    // Select random questions
    const selectedQuestions = this.selectRandomQuestions(questionCount);
    
    // Store for validation
    this.generatedQuestions.set(sessionId, selectedQuestions);
    this.submissionTimes.set(sessionId, Date.now());
    
    // Generate CSS to hide honeypots
    const css = this.generateHoneypotCSS(selectedQuestions);
    
    // Generate JavaScript for advanced detection
    const javascript = this.generateHoneypotJS(selectedQuestions);
    
    return {
      questions: selectedQuestions,
      css,
      javascript
    };
  }

  /**
   * Validate honeypot responses
   */
  validateHoneypots(sessionId: string, formData: Record<string, any>): HoneypotResult {
    const questions = this.generatedQuestions.get(sessionId);
    const submissionTime = this.submissionTimes.get(sessionId);
    
    if (!questions) {
      return {
        triggered: false,
        triggeredQuestions: [],
        suspicionLevel: 'LOW',
        flags: ['NO_HONEYPOT_DATA'],
        confidence: 0
      };
    }

    const triggered: string[] = [];
    const flags: string[] = [];
    let suspicionScore = 0;

    // Check each honeypot question
    for (const question of questions) {
      const userAnswer = formData[question.fieldName];
      
      if (this.isHoneypotTriggered(question, userAnswer)) {
        triggered.push(question.id);
        flags.push(...question.triggerFlags);
        suspicionScore += this.getQuestionSuspicionScore(question);
      }
    }

    // Check submission timing
    if (submissionTime) {
      const timeDiff = Date.now() - submissionTime;
      if (timeDiff < 5000) { // Less than 5 seconds
        flags.push('TOO_FAST_SUBMISSION');
        suspicionScore += 30;
      } else if (timeDiff < 2000) { // Less than 2 seconds
        flags.push('EXTREMELY_FAST_SUBMISSION');
        suspicionScore += 50;
      }
    }

    // Determine suspicion level
    const suspicionLevel = this.calculateSuspicionLevel(suspicionScore);
    
    // Clean up stored data
    this.generatedQuestions.delete(sessionId);
    this.submissionTimes.delete(sessionId);

    return {
      triggered: triggered.length > 0 || suspicionScore > 0,
      triggeredQuestions: triggered,
      suspicionLevel,
      flags: Array.from(new Set(flags)), // Remove duplicates
      confidence: Math.min(suspicionScore, 100)
    };
  }

  /**
   * Check if a specific honeypot was triggered
   */
  private isHoneypotTriggered(question: HoneypotQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'text':
        // Text fields should be empty
        return userAnswer && userAnswer.toString().trim().length > 0;
        
      case 'checkbox':
        // Honeypot checkboxes should not be checked
        return Boolean(userAnswer);
        
      case 'select':
        // Select fields should have no selection
        return userAnswer && userAnswer !== '';
        
      case 'hidden':
        // Hidden fields should not be modified
        return userAnswer && userAnswer !== question.expectedAnswer;
        
      default:
        return false;
    }
  }

  /**
   * Get suspicion score for a specific question type
   */
  private getQuestionSuspicionScore(question: HoneypotQuestion): number {
    const scores = {
      'text': 25,
      'checkbox': 30,
      'select': 20,
      'hidden': 40
    };
    
    return scores[question.type] || 15;
  }

  /**
   * Calculate overall suspicion level
   */
  private calculateSuspicionLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Select random honeypot questions
   */
  private selectRandomQuestions(count: number): HoneypotQuestion[] {
    const shuffled = [...HONEYPOT_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Generate CSS to hide honeypot fields
   */
  private generateHoneypotCSS(questions: HoneypotQuestion[]): string {
    const styles: string[] = [];
    
    for (const question of questions) {
      const selector = `[name="${question.fieldName}"], #${question.fieldName}`;
      
      switch (question.styling) {
        case 'invisible':
          styles.push(`${selector} { opacity: 0; visibility: hidden; }`);
          break;
        case 'offscreen':
          styles.push(`${selector} { position: absolute; left: -9999px; top: -9999px; }`);
          break;
        case 'transparent':
          styles.push(`${selector} { opacity: 0; position: absolute; z-index: -1; }`);
          break;
        case 'hidden':
          styles.push(`${selector} { display: none; }`);
          break;
      }
    }
    
    return `<style type="text/css">\n${styles.join('\n')}\n</style>`;
  }

  /**
   * Generate JavaScript for advanced honeypot detection
   */
  private generateHoneypotJS(questions: HoneypotQuestion[]): string {
    const fieldNames = questions.map(q => q.fieldName);
    
    return `
<script type="text/javascript">
(function() {
  var honeypotFields = ${JSON.stringify(fieldNames)};
  var interactions = {};
  
  // Track interactions with honeypot fields
  honeypotFields.forEach(function(fieldName) {
    var field = document.querySelector('[name="' + fieldName + '"]') || document.getElementById(fieldName);
    if (field) {
      ['focus', 'input', 'change', 'click'].forEach(function(event) {
        field.addEventListener(event, function() {
          interactions[fieldName] = interactions[fieldName] || [];
          interactions[fieldName].push({
            type: event,
            timestamp: Date.now()
          });
        });
      });
    }
  });
  
  // Add interaction data to form submission
  document.addEventListener('submit', function(e) {
    var form = e.target;
    var interactionField = document.createElement('input');
    interactionField.type = 'hidden';
    interactionField.name = '_honeypot_interactions';
    interactionField.value = JSON.stringify(interactions);
    form.appendChild(interactionField);
  });
})();
</script>`;
  }

  /**
   * Analyze interaction patterns for additional bot detection
   */
  analyzeInteractionPatterns(interactionData: string): {
    suspicious: boolean;
    reasons: string[];
    confidence: number;
  } {
    const reasons: string[] = [];
    let suspicionScore = 0;
    
    try {
      const interactions = JSON.parse(interactionData || '{}');
      
      // Check if any honeypot fields were interacted with
      for (const [fieldName, events] of Object.entries(interactions) as [string, any[]][]) {
        if (events && events.length > 0) {
          reasons.push(`Interaction detected with honeypot field: ${fieldName}`);
          suspicionScore += 40;
          
          // Analyze interaction timing
          const timings = events.map(e => e.timestamp);
          if (timings.length > 1) {
            const intervals = [];
            for (let i = 1; i < timings.length; i++) {
              intervals.push(timings[i] - timings[i-1]);
            }
            
            // Check for suspiciously regular intervals (bot behavior)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            
            if (variance < 100) { // Very low variance suggests automated behavior
              reasons.push('Suspiciously regular interaction timing detected');
              suspicionScore += 25;
            }
          }
        }
      }
    } catch (e) {
      reasons.push('Failed to parse interaction data');
      suspicionScore += 10;
    }
    
    return {
      suspicious: suspicionScore > 0,
      reasons,
      confidence: Math.min(suspicionScore, 100)
    };
  }

  /**
   * Get honeypot statistics
   */
  getHoneypotStats(): {
    totalQuestions: number;
    activeGenerated: number;
    questionTypes: Record<string, number>;
  } {
    const questionTypes: Record<string, number> = {};
    
    HONEYPOT_QUESTIONS.forEach(q => {
      questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
    });
    
    return {
      totalQuestions: HONEYPOT_QUESTIONS.length,
      activeGenerated: this.generatedQuestions.size,
      questionTypes
    };
  }

  /**
   * Clean expired sessions
   */
  cleanExpiredSessions(maxAge: number = 1000 * 60 * 30): void { // 30 minutes default
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    this.submissionTimes.forEach((timestamp, sessionId) => {
      if (now - timestamp > maxAge) {
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => {
      this.generatedQuestions.delete(sessionId);
      this.submissionTimes.delete(sessionId);
    });
  }
}

// Export singleton instance
export const honeypotService = new HoneypotService();
