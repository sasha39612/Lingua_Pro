// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';
import axios from 'axios';
import * as dotenv from 'dotenv';
// @ts-ignore - Prisma v7 types export resolution
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://user:password@localhost:5432/lingua_pro_text?schema=public';
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

// central prisma client used by both GraphQL resolvers and helpers
const prisma = new PrismaClient({ adapter });

// base HTTP client for AI orchestrator calls
const orchestrator = axios.create({
  baseURL: process.env.AI_ORCHESTRATOR_URL || 'http://ai-orchestrator:4005',
  timeout: 10000,
});

/**
 * GraphQL type definitions for text service.
 * includes Text entity and Task entity for federation.
 */
export const textTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

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

  type Task {
    id: ID!
    language: String!
    level: String!
    skill: String!
    prompt: String!
    audioUrl: String
    referenceText: String
    focusPhonemes: [String!]!
    answerOptions: [String!]!
    correctAnswer: String
    createdAt: String!
  }

  type Query {
    texts(userId: ID!): [Text!]!
    text(id: ID!): Text
    tasks(language: String!, level: String!, skill: String): [Task!]!
  }

  input CheckTextInput {
    userId: ID!
    language: String!
    text: String!
  }

  type Mutation {
    submitText(userId: ID!, language: String!, text: String!): Text!
    checkText(input: CheckTextInput!): Text!
  }
`;

/**
 * A very small local fallback analysis used when the AI orchestrator
 * cannot be reached.  It mimics the original Phase‑1 functionality.
 */
export function simulateAIAnalysis(text: string) {
  const corrections: string[] = [];
  const issues: string[] = [];

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

export function calculateTextScore(original: string, corrections: any): number {
  const errorCount =
    corrections.feedback === 'Great work! No obvious errors detected.' ? 0 : 1;
  const score = Math.max(0.5, 1.0 - errorCount * 0.15);
  return parseFloat(score.toFixed(2));
}

/**
 * Helper used by both REST controllers and GraphQL resolvers.
 * Sends the submission to the AI orchestrator and persists the
 * result in the database. Returns the saved Text record.
 */
export async function analyzeAndSave(
  userId: string,
  language: string,
  text: string
) {
  language = language.toLowerCase();
  let corrected = text;
  let feedback = 'Great work! No obvious errors detected.';
  let textScore: number | null = null;

  try {
    const resp = await orchestrator.post('/text/analyze', { text, language });
    const data = resp.data || {};
    corrected = data.correctedText || corrected;
    feedback = data.feedback || feedback;
    textScore = typeof data.textScore === 'number' ? data.textScore : null;
    if (textScore === null) {
      textScore = calculateTextScore(text, { feedback });
    }
  } catch (e: any) {
    console.warn('orchestrator error, falling back to local mock analysis', e?.message || e);
    const local = simulateAIAnalysis(text);
    corrected = local.corrected;
    feedback = local.feedback;
    textScore = calculateTextScore(text, local);
  }

  try {
    const record = await prisma.text.create({
      data: {
        userId: parseInt(userId, 10),
        language,
        originalText: text,
        correctedText: corrected,
        textScore,
        feedback
      }
    });

    return record;
  } catch (e: any) {
    console.error('failed to persist text analysis', e?.message || e);
    return {
      id: -1,
      userId: parseInt(userId, 10),
      language,
      originalText: text,
      correctedText: corrected,
      textScore,
      feedback,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Query the database for tasks matching language/level/skill. If none exist
 * then attempt to generate them via the AI orchestrator and persist the new
 * items so the next request can hit the cache.
 */
export async function fetchTasks(
  language: string,
  level: string,
  skill?: string
) {
  language = language.toLowerCase();
  const where: any = { language, level };
  if (skill) where.skill = skill;

  let tasks: any[] = [];
  try {
    tasks = await prisma.task.findMany({ where });
  } catch (e: any) {
    console.error('failed to query cached tasks', e?.message || e);
    tasks = [];
  }
  if (tasks.length === 0) {
    try {
      const resp = await orchestrator.post('/tasks/generate', { language, level, skill });
      if (resp.data?.tasks) {
        const created: any[] = [];
        for (const t of resp.data.tasks) {
          try {
            const record = await prisma.task.create({ data: { ...t, language: t.language?.toLowerCase() ?? language } });
            created.push(record);
          } catch (e: any) {
            console.warn('failed to persist generated task', e?.message || e);
          }
        }
        tasks = created;
      }
    } catch (e: any) {
      console.error('failed to generate tasks from orchestrator', e?.message || e);
      tasks = [];
    }
  }
  return tasks;
}

export const textSchema = buildSubgraphSchema([
  {
    typeDefs: textTypeDefs,
    resolvers: {
      Query: {
        texts: (_: any, { userId }: any) =>
          prisma.text.findMany({ where: { userId: parseInt(userId, 10) } }),
        text: (_: any, { id }: any) =>
          prisma.text.findUnique({ where: { id: parseInt(id, 10) } }),
        tasks: (_: any, { language, level, skill }: any) =>
          fetchTasks(language, level, skill)
      },
      Mutation: {
        submitText: (_: any, { userId, language, text }: any) =>
          analyzeAndSave(userId, language, text),
        checkText: (_: any, { input }: any) =>
          analyzeAndSave(input.userId, input.language, input.text),
      },
      Text: {
        __resolveReference: (text: any) => text
      }
    }
  }
]);
