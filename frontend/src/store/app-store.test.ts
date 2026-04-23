import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app-store';

const initialState = {
  user: null,
  language: 'English' as const,
  level: 'A2',
  theme: 'system' as const,
  lastTaskTitle: null,
  audioScores: [0.62, 0.7, 0.68, 0.77],
  recentResults: [],
};

beforeEach(() => {
  useAppStore.setState(initialState);
  localStorage.clear();
});

describe('useAppStore', () => {
  describe('setUser', () => {
    it('sets user', () => {
      const user = { id: '1', email: 'a@b.com', role: 'student' as const, language: 'English' as const };
      useAppStore.getState().setUser(user);
      expect(useAppStore.getState().user).toEqual(user);
    });

    it('clears user', () => {
      const user = { id: '1', email: 'a@b.com', role: 'student' as const, language: 'English' as const };
      useAppStore.getState().setUser(user);
      useAppStore.getState().setUser(null);
      expect(useAppStore.getState().user).toBeNull();
    });
  });

  describe('setLanguage / setLevel / setTheme', () => {
    it('updates language', () => {
      useAppStore.getState().setLanguage('German');
      expect(useAppStore.getState().language).toBe('German');
    });

    it('updates level', () => {
      useAppStore.getState().setLevel('B2');
      expect(useAppStore.getState().level).toBe('B2');
    });

    it('updates theme', () => {
      useAppStore.getState().setTheme('dark');
      expect(useAppStore.getState().theme).toBe('dark');
    });
  });

  describe('addAudioScore', () => {
    it('prepends new score to audioScores', () => {
      useAppStore.getState().addAudioScore(0.95);
      expect(useAppStore.getState().audioScores[0]).toBe(0.95);
    });

    it('keeps at most 16 scores', () => {
      for (let i = 0; i < 20; i++) {
        useAppStore.getState().addAudioScore(0.5);
      }
      expect(useAppStore.getState().audioScores.length).toBeLessThanOrEqual(16);
    });
  });

  describe('addResult / clearResults', () => {
    const fakeResult = {
      id: '1',
      originalText: 'Hello',
      createdAt: '2026-01-01T00:00:00Z',
    };

    it('prepends result to recentResults', () => {
      useAppStore.getState().addResult(fakeResult);
      expect(useAppStore.getState().recentResults[0]).toEqual(fakeResult);
    });

    it('keeps at most 12 results', () => {
      for (let i = 0; i < 15; i++) {
        useAppStore.getState().addResult({ ...fakeResult, id: String(i) });
      }
      expect(useAppStore.getState().recentResults.length).toBeLessThanOrEqual(12);
    });

    it('clearResults empties the array', () => {
      useAppStore.getState().addResult(fakeResult);
      useAppStore.getState().clearResults();
      expect(useAppStore.getState().recentResults).toEqual([]);
    });
  });

  describe('logout', () => {
    it('clears user, recentResults, and lastTaskTitle', () => {
      useAppStore.setState({
        user: { id: '1', email: 'a@b.com', role: 'student', language: 'English' },
        lastTaskTitle: 'Write an essay',
        recentResults: [{ id: '1', originalText: 'Hi', createdAt: '2026-01-01T00:00:00Z' }],
      });

      useAppStore.getState().logout();

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.lastTaskTitle).toBeNull();
      expect(state.recentResults).toEqual([]);
    });

    it('preserves language and level after logout', () => {
      useAppStore.getState().setLanguage('Polish');
      useAppStore.getState().setLevel('C1');
      useAppStore.getState().logout();

      expect(useAppStore.getState().language).toBe('Polish');
      expect(useAppStore.getState().level).toBe('C1');
    });
  });

  describe('setLastTaskTitle', () => {
    it('updates and clears lastTaskTitle', () => {
      useAppStore.getState().setLastTaskTitle('Describe your weekend');
      expect(useAppStore.getState().lastTaskTitle).toBe('Describe your weekend');

      useAppStore.getState().setLastTaskTitle(null);
      expect(useAppStore.getState().lastTaskTitle).toBeNull();
    });
  });
});
