/**
 * Flatline Detection Service
 * Detects respondents who give the same or similar answers to multiple questions
 */

interface FlatlineResult {
  isFlatline: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  patterns: FlatlinePattern[];
  score: number;
  recommendations: string[];
}

interface FlatlinePattern {
  type: 'identical' | 'similar' | 'sequence' | 'alternating' | 'extreme';
  questions: string[];
  values: any[];
  confidence: number;
  description: string;
}

interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: 'scale' | 'multiple-choice' | 'text' | 'rating' | 'ranking';
  answer: any;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export class FlatlineDetectionService {
  /**
   * Analyze responses for flatline patterns
   */
  detectFlatline(responses: QuestionResponse[]): FlatlineResult {
    const patterns: FlatlinePattern[] = [];
    let totalScore = 0;

    // Filter relevant question types for flatline detection
    const scaleQuestions = responses.filter(r => r.questionType === 'scale' || r.questionType === 'rating');
    const multipleChoiceQuestions = responses.filter(r => r.questionType === 'multiple-choice');
    const textQuestions = responses.filter(r => r.questionType === 'text');

    // Detect identical scale responses
    const identicalPattern = this.detectIdenticalResponses(scaleQuestions);
    if (identicalPattern) {
      patterns.push(identicalPattern);
      totalScore += this.getPatternScore(identicalPattern);
    }

    // Detect sequence patterns (1,2,3,4,5... or 5,4,3,2,1...)
    const sequencePattern = this.detectSequencePattern(scaleQuestions);
    if (sequencePattern) {
      patterns.push(sequencePattern);
      totalScore += this.getPatternScore(sequencePattern);
    }

    // Detect alternating patterns (1,5,1,5,1,5...)
    const alternatingPattern = this.detectAlternatingPattern(scaleQuestions);
    if (alternatingPattern) {
      patterns.push(alternatingPattern);
      totalScore += this.getPatternScore(alternatingPattern);
    }

    // Detect extreme responses (all 1s or all 5s)
    const extremePattern = this.detectExtremeResponses(scaleQuestions);
    if (extremePattern) {
      patterns.push(extremePattern);
      totalScore += this.getPatternScore(extremePattern);
    }

    // Detect similar multiple choice patterns
    const mcPattern = this.detectMultipleChoicePattern(multipleChoiceQuestions);
    if (mcPattern) {
      patterns.push(mcPattern);
      totalScore += this.getPatternScore(mcPattern);
    }

    // Detect text response patterns
    const textPattern = this.detectTextResponsePatterns(textQuestions);
    if (textPattern) {
      patterns.push(textPattern);
      totalScore += this.getPatternScore(textPattern);
    }

    // Calculate overall severity
    const severity = this.calculateSeverity(totalScore, patterns.length);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, severity);

    return {
      isFlatline: patterns.length > 0,
      severity,
      patterns,
      score: totalScore,
      recommendations
    };
  }

  /**
   * Detect identical responses across scale questions
   */
  private detectIdenticalResponses(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 3) return null;

    const values = questions.map(q => q.answer);
    const uniqueValues = Array.from(new Set(values));

    // Check for identical responses
    if (uniqueValues.length === 1 && questions.length >= 3) {
      return {
        type: 'identical',
        questions: questions.map(q => q.questionId),
        values,
        confidence: this.calculateIdenticalConfidence(questions.length),
        description: `Identical response "${values[0]}" given to ${questions.length} scale questions`
      };
    }

    // Check for mostly identical (90%+ same response)
    const mostCommon = this.getMostCommonValue(values);
    const identicalCount = values.filter(v => v === mostCommon.value).length;
    const identicalPercentage = identicalCount / values.length;

    if (identicalPercentage >= 0.9 && questions.length >= 5) {
      return {
        type: 'identical',
        questions: questions.map(q => q.questionId),
        values,
        confidence: this.calculateIdenticalConfidence(identicalCount) * identicalPercentage,
        description: `${Math.round(identicalPercentage * 100)}% identical responses (${mostCommon.value}) across ${questions.length} questions`
      };
    }

    return null;
  }

  /**
   * Detect sequence patterns in responses
   */
  private detectSequencePattern(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 4) return null;

    const values = questions.map(q => Number(q.answer)).filter(v => !isNaN(v));
    if (values.length < 4) return null;

    // Check for ascending sequence
    const isAscending = this.isSequence(values, 1);
    if (isAscending.isSequence && isAscending.matchCount >= 4) {
      return {
        type: 'sequence',
        questions: questions.slice(0, isAscending.matchCount).map(q => q.questionId),
        values: values.slice(0, isAscending.matchCount),
        confidence: this.calculateSequenceConfidence(isAscending.matchCount, values.length),
        description: `Ascending sequence pattern detected (${isAscending.matchCount}/${values.length} questions)`
      };
    }

    // Check for descending sequence
    const isDescending = this.isSequence(values, -1);
    if (isDescending.isSequence && isDescending.matchCount >= 4) {
      return {
        type: 'sequence',
        questions: questions.slice(0, isDescending.matchCount).map(q => q.questionId),
        values: values.slice(0, isDescending.matchCount),
        confidence: this.calculateSequenceConfidence(isDescending.matchCount, values.length),
        description: `Descending sequence pattern detected (${isDescending.matchCount}/${values.length} questions)`
      };
    }

    return null;
  }

  /**
   * Detect alternating patterns
   */
  private detectAlternatingPattern(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 4) return null;

    const values = questions.map(q => Number(q.answer)).filter(v => !isNaN(v));
    if (values.length < 4) return null;

    const alternatingResult = this.isAlternating(values);
    if (alternatingResult.isAlternating && alternatingResult.matchCount >= 4) {
      return {
        type: 'alternating',
        questions: questions.slice(0, alternatingResult.matchCount).map(q => q.questionId),
        values: values.slice(0, alternatingResult.matchCount),
        confidence: this.calculateAlternatingConfidence(alternatingResult.matchCount, values.length),
        description: `Alternating pattern detected between ${alternatingResult.values.join(' and ')} (${alternatingResult.matchCount}/${values.length} questions)`
      };
    }

    return null;
  }

  /**
   * Detect extreme responses (all highest or lowest values)
   */
  private detectExtremeResponses(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 3) return null;

    const scaleQuestions = questions.filter(q => q.scaleMin !== undefined && q.scaleMax !== undefined);
    if (scaleQuestions.length < 3) return null;

    const extremeCounts = {
      minimum: 0,
      maximum: 0
    };

    scaleQuestions.forEach(q => {
      const answer = Number(q.answer);
      if (answer === q.scaleMin) extremeCounts.minimum++;
      if (answer === q.scaleMax) extremeCounts.maximum++;
    });

    const minPercentage = extremeCounts.minimum / scaleQuestions.length;
    const maxPercentage = extremeCounts.maximum / scaleQuestions.length;

    if (minPercentage >= 0.8) {
      return {
        type: 'extreme',
        questions: scaleQuestions.map(q => q.questionId),
        values: scaleQuestions.map(q => q.answer),
        confidence: minPercentage * 100,
        description: `${Math.round(minPercentage * 100)}% extreme low responses (minimum scale values)`
      };
    }

    if (maxPercentage >= 0.8) {
      return {
        type: 'extreme',
        questions: scaleQuestions.map(q => q.questionId),
        values: scaleQuestions.map(q => q.answer),
        confidence: maxPercentage * 100,
        description: `${Math.round(maxPercentage * 100)}% extreme high responses (maximum scale values)`
      };
    }

    return null;
  }

  /**
   * Detect patterns in multiple choice responses
   */
  private detectMultipleChoicePattern(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 3) return null;

    // Check for always selecting first option
    const firstOptionCount = questions.filter(q => {
      const options = q.options || [];
      return q.answer === options[0] || q.answer === 'A' || q.answer === '1';
    }).length;

    const firstOptionPercentage = firstOptionCount / questions.length;
    if (firstOptionPercentage >= 0.8) {
      return {
        type: 'similar',
        questions: questions.map(q => q.questionId),
        values: questions.map(q => q.answer),
        confidence: firstOptionPercentage * 100,
        description: `${Math.round(firstOptionPercentage * 100)}% first option selection pattern`
      };
    }

    // Check for always selecting last option
    const lastOptionCount = questions.filter(q => {
      const options = q.options || [];
      return q.answer === options[options.length - 1] || 
             (typeof q.answer === 'string' && options.length > 0 && q.answer === String.fromCharCode(64 + options.length));
    }).length;

    const lastOptionPercentage = lastOptionCount / questions.length;
    if (lastOptionPercentage >= 0.8) {
      return {
        type: 'similar',
        questions: questions.map(q => q.questionId),
        values: questions.map(q => q.answer),
        confidence: lastOptionPercentage * 100,
        description: `${Math.round(lastOptionPercentage * 100)}% last option selection pattern`
      };
    }

    return null;
  }

  /**
   * Detect patterns in text responses
   */
  private detectTextResponsePatterns(questions: QuestionResponse[]): FlatlinePattern | null {
    if (questions.length < 3) return null;

    const answers = questions.map(q => String(q.answer || '').toLowerCase().trim());
    
    // Check for identical text responses
    const uniqueAnswers = Array.from(new Set(answers));
    if (uniqueAnswers.length === 1 && answers[0].length > 0) {
      return {
        type: 'identical',
        questions: questions.map(q => q.questionId),
        values: questions.map(q => q.answer),
        confidence: 95,
        description: `Identical text response "${answers[0]}" given to all text questions`
      };
    }

    // Check for very short responses
    const shortResponses = answers.filter(a => a.length > 0 && a.length <= 3);
    const shortPercentage = shortResponses.length / answers.filter(a => a.length > 0).length;
    
    if (shortPercentage >= 0.8 && shortResponses.length >= 3) {
      return {
        type: 'similar',
        questions: questions.map(q => q.questionId),
        values: questions.map(q => q.answer),
        confidence: shortPercentage * 80,
        description: `${Math.round(shortPercentage * 100)}% very short text responses (≤3 characters)`
      };
    }

    return null;
  }

  /**
   * Check if values form a sequence
   */
  private isSequence(values: number[], direction: 1 | -1): { isSequence: boolean; matchCount: number } {
    if (values.length < 2) return { isSequence: false, matchCount: 0 };

    let matchCount = 1;
    for (let i = 1; i < values.length; i++) {
      if (values[i] === values[i - 1] + direction) {
        matchCount++;
      } else {
        break;
      }
    }

    return {
      isSequence: matchCount >= 4,
      matchCount
    };
  }

  /**
   * Check if values alternate between two values
   */
  private isAlternating(values: number[]): { isAlternating: boolean; matchCount: number; values: number[] } {
    if (values.length < 4) return { isAlternating: false, matchCount: 0, values: [] };

    const firstTwo = [values[0], values[1]];
    let matchCount = 2;

    for (let i = 2; i < values.length; i++) {
      const expectedValue = firstTwo[i % 2];
      if (values[i] === expectedValue) {
        matchCount++;
      } else {
        break;
      }
    }

    return {
      isAlternating: matchCount >= 4,
      matchCount,
      values: firstTwo
    };
  }

  /**
   * Get the most common value in an array
   */
  private getMostCommonValue(values: any[]): { value: any; count: number } {
    const counts = new Map();
    values.forEach(value => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    let mostCommon = { value: null, count: 0 };
    counts.forEach((count, value) => {
      if (count > mostCommon.count) {
        mostCommon = { value, count };
      }
    });

    return mostCommon;
  }

  /**
   * Calculate confidence for identical patterns
   */
  private calculateIdenticalConfidence(count: number): number {
    return Math.min(30 + (count * 15), 100);
  }

  /**
   * Calculate confidence for sequence patterns
   */
  private calculateSequenceConfidence(matchCount: number, totalCount: number): number {
    const ratio = matchCount / totalCount;
    return Math.min(40 + (ratio * 40) + (matchCount * 5), 100);
  }

  /**
   * Calculate confidence for alternating patterns
   */
  private calculateAlternatingConfidence(matchCount: number, totalCount: number): number {
    const ratio = matchCount / totalCount;
    return Math.min(35 + (ratio * 35) + (matchCount * 5), 100);
  }

  /**
   * Get score for a pattern
   */
  private getPatternScore(pattern: FlatlinePattern): number {
    const baseScores = {
      'identical': 40,
      'sequence': 30,
      'alternating': 25,
      'extreme': 35,
      'similar': 20
    };

    const baseScore = baseScores[pattern.type] || 15;
    const confidenceMultiplier = pattern.confidence / 100;
    
    return Math.round(baseScore * confidenceMultiplier);
  }

  /**
   * Calculate overall severity
   */
  private calculateSeverity(score: number, patternCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Adjust score based on number of patterns
    const adjustedScore = score + (patternCount - 1) * 10;

    if (adjustedScore >= 80) return 'CRITICAL';
    if (adjustedScore >= 60) return 'HIGH';
    if (adjustedScore >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(patterns: FlatlinePattern[], severity: string): string[] {
    const recommendations: string[] = [];

    if (patterns.some(p => p.type === 'identical')) {
      recommendations.push('Consider flagging for manual review due to identical responses');
      recommendations.push('Implement attention check questions to verify engagement');
    }

    if (patterns.some(p => p.type === 'sequence')) {
      recommendations.push('Response shows sequential pattern - likely automated or disengaged');
      recommendations.push('Consider excluding from analysis or requesting re-participation');
    }

    if (patterns.some(p => p.type === 'alternating')) {
      recommendations.push('Alternating pattern detected - suggests systematic non-engagement');
      recommendations.push('Review survey design for potential bias or confusion');
    }

    if (patterns.some(p => p.type === 'extreme')) {
      recommendations.push('Extreme response bias detected - may indicate strong opinions or disengagement');
      recommendations.push('Consider validating with follow-up questions');
    }

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      recommendations.push('Strong recommendation to exclude this response from final analysis');
      recommendations.push('Consider implementing stronger quality checks for future respondents');
    }

    return recommendations;
  }

  /**
   * Batch analyze multiple response sets
   */
  batchAnalyze(responseSets: Array<{ id: string; responses: QuestionResponse[] }>): Map<string, FlatlineResult> {
    const results = new Map<string, FlatlineResult>();
    
    responseSets.forEach(({ id, responses }) => {
      const result = this.detectFlatline(responses);
      results.set(id, result);
    });
    
    return results;
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(results: FlatlineResult[]): {
    totalResponses: number;
    flatlineDetected: number;
    severityBreakdown: Record<string, number>;
    commonPatterns: Record<string, number>;
  } {
    const severityBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const commonPatterns: Record<string, number> = {};
    
    results.forEach(result => {
      if (result.isFlatline) {
        severityBreakdown[result.severity]++;
        
        result.patterns.forEach(pattern => {
          commonPatterns[pattern.type] = (commonPatterns[pattern.type] || 0) + 1;
        });
      }
    });
    
    return {
      totalResponses: results.length,
      flatlineDetected: results.filter(r => r.isFlatline).length,
      severityBreakdown,
      commonPatterns
    };
  }
}

// Export singleton instance
export const flatlineDetectionService = new FlatlineDetectionService();
