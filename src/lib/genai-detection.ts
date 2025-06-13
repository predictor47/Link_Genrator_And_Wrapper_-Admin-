/**
 * GenAI Detection Service
 * Detects AI-generated responses in survey submissions
 */

interface GenAIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  indicators: AIIndicator[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

interface AIIndicator {
  type: 'linguistic' | 'structural' | 'semantic' | 'statistical' | 'behavioral';
  description: string;
  score: number;
  evidence: any;
}

interface TextAnalysis {
  text: string;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  complexityScore: number;
  formalityScore: number;
  repetitionScore: number;
  vocabularyDiversity: number;
}

// Known AI-generated text patterns
const AI_PATTERNS = [
  {
    pattern: /\b(as an ai|i'm an ai|i am an artificial|as a language model|i don't have personal|i cannot have opinions)\b/i,
    score: 90,
    description: 'Direct AI self-identification'
  },
  {
    pattern: /\b(furthermore|moreover|additionally|consequently|nevertheless|nonetheless)\b/gi,
    score: 15,
    description: 'Overuse of formal transitional phrases'
  },
  {
    pattern: /\b(it's important to note|it's worth noting|it should be noted)\b/gi,
    score: 20,
    description: 'AI-typical hedging phrases'
  },
  {
    pattern: /\b(various|numerous|multiple|several|diverse)\b/gi,
    score: 10,
    description: 'Generic quantifier overuse'
  },
  {
    pattern: /\b(comprehensive|holistic|multifaceted|nuanced)\b/gi,
    score: 15,
    description: 'AI-preferred descriptive terms'
  }
];

// Suspicious response templates
const SUSPICIOUS_TEMPLATES = [
  'I appreciate your question',
  'Thank you for asking',
  'This is an interesting question',
  'There are several factors to consider',
  'It depends on various factors',
  'In my opinion, I believe that',
  'I would say that'
];

export class GenAIDetectionService {
  /**
   * Analyze text responses for AI generation indicators
   */
  analyzeTextResponses(responses: Array<{ questionId: string; text: string }>): GenAIDetectionResult {
    const indicators: AIIndicator[] = [];
    let totalScore = 0;

    // Analyze each response
    responses.forEach(response => {
      const analysis = this.analyzeText(response.text);
      const responseIndicators = this.detectResponseIndicators(response.text, analysis);
      indicators.push(...responseIndicators);
    });

    // Cross-response analysis
    const crossIndicators = this.analyzeCrossResponsePatterns(responses);
    indicators.push(...crossIndicators);

    // Calculate total score
    totalScore = indicators.reduce((sum, indicator) => sum + indicator.score, 0);

    // Determine confidence and risk level
    const confidence = Math.min(totalScore, 100);
    const riskLevel = this.calculateRiskLevel(confidence, indicators);
    const isAIGenerated = confidence >= 60;

    return {
      isAIGenerated,
      confidence,
      indicators,
      riskLevel,
      recommendations: this.generateRecommendations(indicators, riskLevel)
    };
  }

  /**
   * Analyze individual text for AI indicators
   */
  private analyzeText(text: string): TextAnalysis {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Calculate vocabulary diversity (unique words / total words)
    const uniqueWords = new Set(words);
    const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
    
    // Calculate average words per sentence
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Calculate complexity score (based on sentence length variance)
    const sentenceLengths = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
    const lengthVariance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length || 0;
    const complexityScore = Math.sqrt(lengthVariance);
    
    // Calculate formality score (presence of formal words)
    const formalWords = words.filter(word => 
      ['therefore', 'consequently', 'furthermore', 'moreover', 'additionally', 'nevertheless'].includes(word)
    );
    const formalityScore = words.length > 0 ? (formalWords.length / words.length) * 100 : 0;
    
    // Calculate repetition score
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    const repeatedWords = Array.from(wordCounts.values()).filter(count => count > 1);
    const repetitionScore = words.length > 0 ? (repeatedWords.length / words.length) * 100 : 0;

    return {
      text,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence,
      complexityScore,
      formalityScore,
      repetitionScore,
      vocabularyDiversity
    };
  }

  /**
   * Detect AI indicators in individual responses
   */
  private detectResponseIndicators(text: string, analysis: TextAnalysis): AIIndicator[] {
    const indicators: AIIndicator[] = [];

    // Check for direct AI patterns
    AI_PATTERNS.forEach(pattern => {
      const matches = text.match(pattern.pattern);
      if (matches) {
        indicators.push({
          type: 'linguistic',
          description: pattern.description,
          score: pattern.score * matches.length,
          evidence: { matches: matches, pattern: pattern.pattern.toString() }
        });
      }
    });

    // Check for suspicious templates
    SUSPICIOUS_TEMPLATES.forEach(template => {
      if (text.toLowerCase().includes(template.toLowerCase())) {
        indicators.push({
          type: 'structural',
          description: 'Uses common AI response template',
          score: 25,
          evidence: { template }
        });
      }
    });

    // Analyze formality
    if (analysis.formalityScore > 5) {
      indicators.push({
        type: 'linguistic',
        description: 'Unusually high formality for survey response',
        score: Math.min(analysis.formalityScore * 2, 30),
        evidence: { formalityScore: analysis.formalityScore }
      });
    }

    // Analyze sentence structure uniformity
    if (analysis.complexityScore < 2 && analysis.sentenceCount > 2) {
      indicators.push({
        type: 'structural',
        description: 'Unusually uniform sentence structure',
        score: 20,
        evidence: { complexityScore: analysis.complexityScore }
      });
    }

    // Check for perfect grammar/punctuation (AI tendency)
    const grammarScore = this.assessGrammarQuality(text);
    if (grammarScore > 95 && analysis.wordCount > 20) {
      indicators.push({
        type: 'linguistic',
        description: 'Suspiciously perfect grammar and punctuation',
        score: 15,
        evidence: { grammarScore }
      });
    }

    // Check vocabulary diversity
    if (analysis.vocabularyDiversity < 0.5 && analysis.wordCount > 30) {
      indicators.push({
        type: 'statistical',
        description: 'Low vocabulary diversity suggests AI generation',
        score: 25,
        evidence: { vocabularyDiversity: analysis.vocabularyDiversity }
      });
    }

    // Check for extremely long responses to simple questions
    if (analysis.wordCount > 150) {
      indicators.push({
        type: 'behavioral',
        description: 'Unusually verbose response for survey context',
        score: 15,
        evidence: { wordCount: analysis.wordCount }
      });
    }

    return indicators;
  }

  /**
   * Analyze patterns across multiple responses
   */
  private analyzeCrossResponsePatterns(responses: Array<{ questionId: string; text: string }>): AIIndicator[] {
    const indicators: AIIndicator[] = [];

    if (responses.length < 2) return indicators;

    // Check for consistent writing style (AI tends to be very consistent)
    const analyses = responses.map(r => this.analyzeText(r.text));
    
    // Check formality consistency
    const formalityScores = analyses.map(a => a.formalityScore);
    const formalityVariance = this.calculateVariance(formalityScores);
    if (formalityVariance < 1 && formalityScores.length > 2) {
      indicators.push({
        type: 'statistical',
        description: 'Suspiciously consistent formality across responses',
        score: 20,
        evidence: { formalityVariance, scores: formalityScores }
      });
    }

    // Check for similar response lengths
    const wordCounts = analyses.map(a => a.wordCount);
    const lengthVariance = this.calculateVariance(wordCounts);
    const avgLength = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    if (lengthVariance < (avgLength * 0.1) && wordCounts.length > 2) {
      indicators.push({
        type: 'behavioral',
        description: 'Unusually similar response lengths',
        score: 15,
        evidence: { lengthVariance, avgLength, wordCounts }
      });
    }

    // Check for repeated phrases across responses
    const repeatedPhrases = this.findRepeatedPhrases(responses.map(r => r.text));
    if (repeatedPhrases.length > 0) {
      indicators.push({
        type: 'semantic',
        description: 'Identical phrases repeated across multiple responses',
        score: repeatedPhrases.length * 10,
        evidence: { repeatedPhrases }
      });
    }

    // Check response timing consistency (if available)
    // This would require timestamp data from the survey system

    return indicators;
  }

  /**
   * Assess grammar quality (simplified)
   */
  private assessGrammarQuality(text: string): number {
    let score = 100;
    
    // Check for common grammar issues
    const issues = [
      /\s{2,}/g, // Multiple spaces
      /\.\s*\./g, // Double periods
      /\s+,/g, // Space before comma
      /[a-z]\.[A-Z]/g, // Missing space after period
      /\s+$/g, // Trailing spaces
    ];

    issues.forEach(issue => {
      const matches = text.match(issue);
      if (matches) {
        score -= matches.length * 5;
      }
    });

    return Math.max(score, 0);
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  /**
   * Find repeated phrases across multiple texts
   */
  private findRepeatedPhrases(texts: string[]): string[] {
    const phrases = new Set<string>();
    const repeatedPhrases: string[] = [];

    // Extract 3-5 word phrases
    texts.forEach(text => {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      for (let i = 0; i <= words.length - 3; i++) {
        for (let len = 3; len <= Math.min(5, words.length - i); len++) {
          const phrase = words.slice(i, i + len).join(' ');
          if (phrase.length > 10) { // Only consider substantial phrases
            if (phrases.has(phrase)) {
              if (!repeatedPhrases.includes(phrase)) {
                repeatedPhrases.push(phrase);
              }
            } else {
              phrases.add(phrase);
            }
          }
        }
      }
    });

    return repeatedPhrases;
  }

  /**
   * Calculate risk level based on confidence and indicators
   */
  private calculateRiskLevel(confidence: number, indicators: AIIndicator[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const hasDirectAIIndicators = indicators.some(i => i.score >= 50);
    
    if (hasDirectAIIndicators || confidence >= 85) return 'CRITICAL';
    if (confidence >= 70) return 'HIGH';
    if (confidence >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate recommendations based on detection results
   */
  private generateRecommendations(indicators: AIIndicator[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('Strongly recommend excluding this response from analysis');
      recommendations.push('Consider implementing additional verification steps');
    }

    if (indicators.some(i => i.type === 'linguistic' && i.score > 30)) {
      recommendations.push('Response shows clear linguistic markers of AI generation');
      recommendations.push('Implement AI detection tools in survey validation');
    }

    if (indicators.some(i => i.type === 'behavioral')) {
      recommendations.push('Response patterns inconsistent with typical human survey behavior');
      recommendations.push('Consider adding behavioral validation checks');
    }

    if (indicators.some(i => i.type === 'structural')) {
      recommendations.push('Response structure suggests automated generation');
      recommendations.push('Review survey design to discourage AI assistance');
    }

    recommendations.push('Consider manual review for quality assurance');

    return recommendations;
  }

  /**
   * Batch analyze multiple response sets
   */
  batchAnalyze(responseSets: Array<{
    respondentId: string;
    responses: Array<{ questionId: string; text: string }>;
  }>): Map<string, GenAIDetectionResult> {
    const results = new Map<string, GenAIDetectionResult>();

    responseSets.forEach(({ respondentId, responses }) => {
      const result = this.analyzeTextResponses(responses);
      results.set(respondentId, result);
    });

    return results;
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(results: GenAIDetectionResult[]): {
    totalAnalyzed: number;
    aiDetected: number;
    riskLevelBreakdown: Record<string, number>;
    commonIndicators: Record<string, number>;
    averageConfidence: number;
  } {
    const riskLevelBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const indicatorCounts: Record<string, number> = {};
    let totalConfidence = 0;

    results.forEach(result => {
      riskLevelBreakdown[result.riskLevel]++;
      totalConfidence += result.confidence;

      result.indicators.forEach(indicator => {
        indicatorCounts[indicator.type] = (indicatorCounts[indicator.type] || 0) + 1;
      });
    });

    return {
      totalAnalyzed: results.length,
      aiDetected: results.filter(r => r.isAIGenerated).length,
      riskLevelBreakdown,
      commonIndicators: indicatorCounts,
      averageConfidence: results.length > 0 ? totalConfidence / results.length : 0
    };
  }

  /**
   * Update AI patterns based on new findings
   */
  addCustomPattern(pattern: RegExp, score: number, description: string): void {
    AI_PATTERNS.push({
      pattern,
      score,
      description
    });
  }
}

// Export singleton instance
export const genAIDetectionService = new GenAIDetectionService();
