import { AuthUser, LearningTask, TextResult } from '@/lib/types';

export interface RegisterVariables {
  email: string;
  password: string;
  language?: string;
}

export interface RegisterData {
  register: {
    token: string;
    user: AuthUser;
  };
}

export interface LoginVariables {
  email: string;
  password: string;
}

export interface LoginData {
  login: {
    token: string;
    user: AuthUser;
  };
}

export interface MeData {
  me: AuthUser | null;
}

export interface CheckTextVariables {
  input: {
    userId: string;
    language: string;
    text: string;
  };
}

export interface CheckTextData {
  checkText: TextResult;
}

export interface TasksVariables {
  language: string;
  level: string;
  skill?: string;
}

export interface TasksData {
  tasks: LearningTask[];
}

export interface TextsVariables {
  userId: string;
}

export interface TextsData {
  texts: TextResult[];
}
