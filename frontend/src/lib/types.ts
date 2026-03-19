export type AppLanguage = 'English' | 'German' | 'Albanian' | 'Polish' | 'Ukrainian';

export type UserRole = 'student' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  language: string;
}

export interface TextResult {
  id: string;
  originalText: string;
  correctedText?: string | null;
  textScore?: number | null;
  feedback?: string | null;
  createdAt: string;
}

export interface LearningTask {
  id: string;
  language: string;
  level: string;
  skill: string;
  prompt: string;
  referenceText?: string | null;
  focusPhonemes: string[];
  answerOptions: string[];
  correctAnswer?: string | null;
  createdAt: string;
}
