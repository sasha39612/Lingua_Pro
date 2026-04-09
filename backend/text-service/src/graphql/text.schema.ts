// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';
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
    updateTaskSetScore(language: String!, level: String!, skill: String!, score: Float!): Boolean!
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
 * Generate tasks via the AI orchestrator and persist them to the shared pool.
 */
async function generateAndPersistTasks(language: string, level: string, skill: string): Promise<any[]> {
  try {
    const resp = await orchestrator.post('/tasks/generate', { language, level, skill });
    if (!resp.data?.tasks) return [];
    const created: any[] = [];
    for (const t of resp.data.tasks) {
      try {
        const record = await prisma.task.create({
          data: { ...t, language: t.language?.toLowerCase() ?? language },
        });
        created.push(record);
      } catch (e: any) {
        console.warn('failed to persist generated task', e?.message || e);
      }
    }
    return created;
  } catch (e: any) {
    console.error('failed to generate tasks from orchestrator', e?.message || e);
    return [];
  }
}

/**
 * Query the database for tasks matching language/level/skill. If none exist
 * then attempt to generate them via the AI orchestrator and persist the new
 * items so the next request can hit the cache.
 *
 * When userId is provided the function tracks per-user task assignment:
 *  - First request  → generate/fetch tasks, save a UserTaskSet record.
 *  - Subsequent requests, score < 0.95 → return the same tasks from the DB.
 *  - Subsequent requests, score >= 0.95 → generate fresh tasks, reset the set.
 */
export async function fetchTasks(
  language: string,
  level: string,
  skill?: string,
  userId?: number | null,
) {
  language = language.toLowerCase();
  const effectiveSkill = skill || 'reading';

  // ── Shared-cache path (no authenticated user) ──────────────────────────────
  if (!userId) {
    const where: any = { language, level, skill: effectiveSkill };
    let tasks: any[] = [];
    try {
      tasks = await prisma.task.findMany({ where });
    } catch (e: any) {
      console.error('failed to query cached tasks', e?.message || e);
    }
    if (tasks.length === 0) {
      tasks = await generateAndPersistTasks(language, level, effectiveSkill);
    }
    return tasks;
  }

  // ── Per-user path ──────────────────────────────────────────────────────────
  const db = prisma as any;

  let existingSet: any = null;
  try {
    existingSet = await db.userTaskSet.findUnique({
      where: { userId_language_level_skill: { userId, language, level, skill: effectiveSkill } },
    });
  } catch (e: any) {
    console.error('failed to query user task set', e?.message || e);
  }

  if (existingSet) {
    const completed = existingSet.score !== null && existingSet.score >= 0.95;

    if (completed) {
      // User finished with ≥ 95% — generate a fresh set of tasks
      const newTasks = await generateAndPersistTasks(language, level, effectiveSkill);
      if (newTasks.length > 0) {
        try {
          await db.userTaskSet.update({
            where: { id: existingSet.id },
            data: { taskIds: newTasks.map((t: any) => t.id), score: null },
          });
        } catch (e: any) {
          console.error('failed to update user task set', e?.message || e);
        }
        return newTasks;
      }
    }

    // Return the tasks previously assigned to this user
    if (existingSet.taskIds && existingSet.taskIds.length > 0) {
      try {
        const tasks = await prisma.task.findMany({
          where: { id: { in: existingSet.taskIds } },
        });
        if (tasks.length > 0) return tasks;
      } catch (e: any) {
        console.error('failed to fetch tasks by ids', e?.message || e);
      }
    }
  }

  // No set yet (or tasks were deleted) — fetch from shared pool or generate
  let tasks: any[] = [];
  try {
    tasks = await prisma.task.findMany({ where: { language, level, skill: effectiveSkill } });
  } catch (e: any) {
    console.error('failed to query task pool', e?.message || e);
  }
  if (tasks.length === 0) {
    tasks = await generateAndPersistTasks(language, level, effectiveSkill);
  }

  const assignedIds = tasks.slice(0, 3).map((t: any) => t.id);
  try {
    if (existingSet) {
      await db.userTaskSet.update({
        where: { id: existingSet.id },
        data: { taskIds: assignedIds, score: null },
      });
    } else {
      await db.userTaskSet.create({
        data: { userId, language, level, skill: effectiveSkill, taskIds: assignedIds },
      });
    }
  } catch (e: any) {
    console.error('failed to save user task set', e?.message || e);
  }

  return tasks.slice(0, 3);
}

/**
 * Update the score for a user's task set after they complete tasks.
 * Score should be 0–1 (e.g. 1.0 = 100%, 0.95 = 95%).
 */
export async function updateTaskSetScore(
  userId: number,
  language: string,
  level: string,
  skill: string,
  score: number,
): Promise<boolean> {
  const db = prisma as any;
  try {
    await db.userTaskSet.updateMany({
      where: { userId, language: language.toLowerCase(), level, skill },
      data: { score },
    });
    return true;
  } catch (e: any) {
    console.error('failed to update task set score', e?.message || e);
    return false;
  }
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
        tasks: (_: any, { language, level, skill }: any, context: any) =>
          fetchTasks(language, level, skill, context?.userId ?? null),
      },
      Mutation: {
        submitText: (_: any, { userId, language, text }: any) =>
          analyzeAndSave(userId, language, text),
        checkText: (_: any, { input }: any) =>
          analyzeAndSave(input.userId, input.language, input.text),
        updateTaskSetScore: (_: any, { language, level, skill, score }: any, context: any) => {
          const userId = context?.userId;
          if (!userId) return false;
          return updateTaskSetScore(userId, language, level, skill, score);
        },
      },
      Text: {
        __resolveReference: (text: any) => text
      }
    }
  }
]);
