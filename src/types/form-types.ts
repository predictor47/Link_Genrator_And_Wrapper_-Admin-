// Shared types for enhanced form system

export interface QuestionOption {
  id: string;
  text: string;
  value: string;
  isDisqualifying?: boolean;
  skipToQuestion?: string; // ID of question to skip to
  skipToAction?: 'next' | 'end_success' | 'end_disqualify' | 'skip_to'; // Action to take
}

export interface ConditionalLogic {
  id: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  action: 'skip_to' | 'end_success' | 'end_disqualify' | 'show_message';
  target?: string; // Question ID to skip to
  message?: string; // Message to show
}

export interface EnhancedQuestion {
  id: string;
  text: string;
  description?: string;
  type: 'short-text' | 'paragraph' | 'multiple-choice' | 'checkbox' | 'dropdown' | 'number' | 'email' | 'scale';
  required: boolean;
  isLead: boolean;
  isQualifying: boolean;
  options?: QuestionOption[];
  disqualifyingAnswers?: string[];
  conditionalLogic?: ConditionalLogic[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface EnhancedFormData {
  id: string;
  title: string;
  questions: EnhancedQuestion[];
  responses: any[];
  qualified: number;
  disqualified: number;
  createdAt: Date;
  lastModified: Date;
}

// Legacy question interface for backward compatibility
export interface LegacyQuestion {
  id: string;
  text: string;
  type: string;
  options?: any[];
  validation?: any;
  logic?: any[];
  settings?: any;
  sequence: number;
  isRequired: boolean;
  isTrap?: boolean;
  isQualifier?: boolean;
  groupId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegacyFormData {
  id: string;
  title: string;
  questions: LegacyQuestion[];
  responses: any[];
  qualified: number;
  disqualified: number;
  createdAt: Date;
  lastModified: Date;
}

// Helper function to convert between formats
export function convertLegacyToEnhanced(legacy: LegacyQuestion): EnhancedQuestion {
  const typeMap: Record<string, EnhancedQuestion['type']> = {
    'text': 'short-text',
    'textarea': 'paragraph',
    'email': 'email',
    'number': 'number',
    'single_choice': 'multiple-choice',
    'multiple_choice': 'checkbox',
    'dropdown': 'dropdown',
    'scale': 'scale',
    'MULTIPLE_CHOICE': 'multiple-choice',
    'TEXT': 'short-text',
    'EMAIL': 'email',
    'NUMBER': 'number'
  };

  return {
    id: legacy.id,
    text: legacy.text,
    description: '',
    type: typeMap[legacy.type] || 'short-text',
    required: legacy.isRequired ?? true,
    isLead: false,
    isQualifying: legacy.isQualifier || false,
    options: legacy.options?.map((opt: any, index: number) => {
      // Handle both simple string options and enhanced option objects
      if (typeof opt === 'string') {
        return {
          id: `opt_${index}`,
          text: opt,
          value: opt.toLowerCase().replace(/\s+/g, '_'),
          isDisqualifying: false,
          skipToAction: 'next' as const
        };
      } else {
        return {
          id: opt.id || `opt_${index}`,
          text: opt.text,
          value: opt.value || opt.text.toLowerCase().replace(/\s+/g, '_'),
          isDisqualifying: opt.isDisqualifying || false,
          skipToAction: opt.skipToAction || 'next' as const,
          skipToQuestion: opt.skipToQuestion
        };
      }
    }) || [],
    disqualifyingAnswers: []
  };
}

export function convertEnhancedToLegacy(enhanced: EnhancedQuestion, sequence: number = 0): LegacyQuestion {
  const typeMap: Record<EnhancedQuestion['type'], string> = {
    'short-text': 'TEXT',
    'paragraph': 'textarea',
    'email': 'EMAIL',
    'number': 'NUMBER',
    'multiple-choice': 'MULTIPLE_CHOICE',
    'checkbox': 'multiple_choice',
    'dropdown': 'dropdown',
    'scale': 'scale'
  };

  return {
    id: enhanced.id,
    text: enhanced.text,
    type: typeMap[enhanced.type],
    options: enhanced.options || [], // Keep full option objects with conditional logic
    sequence,
    isRequired: enhanced.required,
    isQualifier: enhanced.isQualifying,
    logic: enhanced.conditionalLogic || []
  };
}
