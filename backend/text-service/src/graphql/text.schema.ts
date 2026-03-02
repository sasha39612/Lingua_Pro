// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';

/**
 * Text Service GraphQL Schema
 * 
 * Provides:
 * - Text entity for federation
 * - Queries: texts (list), text (single)
 * - Mutation: submitText (receives text, returns analysis)
 * 
 * In production, submitText would call AI Orchestrator
 * For now, uses simple mock analysis
 */
export const textTypeDefs = gql`
  type Text @key(fields: "id") {
    id: ID!
    userId: ID!
    language: String!
    originalText: String!
    correctedText: String
    textScore: Float
    feedback: String
    createdAt: String!
  }

  type Query {
    texts(userId: ID!): [Text!]!
    text(id: ID!): Text
  }

  type Mutation {
    submitText(userId: ID!, language: String!, text: String!): Text!
  }
`;

/**
 * Simple mock AI analysis for demonstration
 * 
 * In production, this would call AI Orchestrator:
 * - Send text to language model
 * - Receive corrections, scores, feedback
 * - Store in database
 */
function simulateAIAnalysis(text: string) {
  // Mock analysis rules
  const corrections: string[] = [];
  const issues: string[] = [];

  // Check for common errors
  if (text.includes('studing')) {
    corrections.push(text.replace('studing', 'studying'));
    issues.push('Spelling: "studing" → "studying"');
  }
  if (text.includes('I am not sure about') && !text.includes('?')) {
    corrections.push(text + '?');
    issues.push('Missing question mark');
  }
  if (text.endsWith('!.') || text.endsWith('?')) {
    issues.push('Double punctuation');
  }

  const corrected = corrections.length > 0 ? corrections[0] : text;
  const feedback = issues.length > 0 
    ? issues.join('; ')
    : 'Great work! No obvious errors detected.';

  return { corrected, feedback };
}

function calculateTextScore(original: string, corrections: any): number {
  // Simple scoring based on original text length and corrections
  const wordCount = original.split(' ').length;
  const errorCount = corrections.feedback === 'Great work! No obvious errors detected.' ? 0 : 1;
  
  // Score: 1.0 if no errors, decreases with more errors
  const score = Math.max(0.5, 1.0 - (errorCount * 0.15));
  return parseFloat(score.toFixed(2));
}

export const textSchema = buildSubgraphSchema([
  {
    typeDefs: textTypeDefs,
    resolvers: {
      Query: {
        texts: (_: any, { userId }: any) => [
          {
            id: '1',
            userId,
            language: 'english',
            originalText: 'Hello world',
            correctedText: 'Hello, world.',
            textScore: 0.85,
            feedback: 'Missing comma',
            createdAt: new Date().toISOString()
          }
        ],
        text: (_: any, { id }: any) => ({
          id,
          userId: '1',
          language: 'english',
          originalText: 'Hello world',
          correctedText: 'Hello, world.',
          textScore: 0.85,
          feedback: 'Missing comma',
          createdAt: new Date().toISOString()
        })
      },
      Mutation: {
        submitText: (_: any, { userId, language, text }: any, context: any) => {
          // In production: AI orchestrator would analyze text here
          // For now: simple mock with grammar feedback
          
          const corrections = simulateAIAnalysis(text);
          const score = calculateTextScore(text, corrections);
          
          return {
            id: 'text_' + Date.now(),
            userId,
            language,
            originalText: text,
            correctedText: corrections.corrected,
            textScore: score,
            feedback: corrections.feedback,
            createdAt: new Date().toISOString()
          };
        }
      },
      Text: {
        __resolveReference: (text: any) => text
      }
    }
  }
]);
