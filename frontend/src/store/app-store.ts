'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppLanguage, AuthUser, TextResult } from '@/lib/types';
import type { Locale } from '@/i18n/locales';

interface AppState {
  user: AuthUser | null;
  language: AppLanguage;
  level: string;
  theme: 'light' | 'dark' | 'system';
  uiLocale: Locale;
  lastTaskTitle: string | null;
  audioScores: number[];
  recentResults: TextResult[];
  setUser: (user: AuthUser | null) => void;
  setLanguage: (language: AppLanguage) => void;
  setLevel: (level: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setUiLocale: (locale: Locale) => void;
  setLastTaskTitle: (title: string | null) => void;
  addAudioScore: (score: number) => void;
  addResult: (result: TextResult) => void;
  clearResults: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      language: 'English',
      level: 'A2',
      theme: 'system',
      uiLocale: 'en',
      lastTaskTitle: null,
      audioScores: [0.62, 0.7, 0.68, 0.77],
      recentResults: [],
      setUser: (user) => set({ user }),
      setLanguage: (language) => set({ language }),
      setLevel: (level) => set({ level }),
      setTheme: (theme) => set({ theme }),
      setUiLocale: (uiLocale) => set({ uiLocale }),
      setLastTaskTitle: (title) => set({ lastTaskTitle: title }),
      addAudioScore: (score) =>
        set((state) => ({
          audioScores: [score, ...state.audioScores].slice(0, 16),
        })),
      addResult: (result) =>
        set((state) => ({
          recentResults: [result, ...state.recentResults].slice(0, 12),
        })),
      clearResults: () => set({ recentResults: [] }),
      logout: () => set({ user: null, recentResults: [], lastTaskTitle: null }),
    }),
    {
      name: 'lingua-pro-zustand',
      partialize: (state) => ({
        user: state.user,
        language: state.language,
        level: state.level,
        theme: state.theme,
        uiLocale: state.uiLocale,
        lastTaskTitle: state.lastTaskTitle,
      }),
    },
  ),
);
