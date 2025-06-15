// Shared types for enhanced form system

export interface QuestionOption {
  id: string;
  text: string;
  value: string;
  isDisqualifying?: boolean;
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
    options: legacy.options?.map((opt: any, index: number) => ({
      id: `opt_${index}`,
      text: typeof opt === 'string' ? opt : opt.text,
      value: typeof opt === 'string' ? opt.toLowerCase().replace(/\s+/g, '_') : opt.value,
      isDisqualifying: false
    })) || [],
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
    options: enhanced.options?.map(opt => opt.text) || [],
    sequence,
    isRequired: enhanced.required,
    isQualifier: enhanced.isQualifying
  };
}
