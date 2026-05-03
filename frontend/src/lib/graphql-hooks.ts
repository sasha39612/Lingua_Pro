'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql-client';
import { CEFRLevel } from '@/lib/types';
import {
  CheckTextData,
  CheckTextVariables,
  LoginData,
  LoginVariables,
  MeData,
  RegisterData,
  RegisterVariables,
  TasksData,
  TasksVariables,
  TextsData,
  TextsVariables,
} from '@/lib/graphql-types';

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (variables: RegisterVariables) =>
      graphqlRequest<RegisterData, RegisterVariables>({
        operationName: 'Register',
        variables,
      }),
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (variables: LoginVariables) =>
      graphqlRequest<LoginData, LoginVariables>({
        operationName: 'Login',
        variables,
      }),
  });
}

export function useCheckTextMutation() {
  return useMutation({
    mutationFn: (variables: CheckTextVariables) =>
      graphqlRequest<CheckTextData, CheckTextVariables>({
        operationName: 'CheckText',
        variables,
      }),
  });
}

export function useTasksQuery(input: {
  enabled: boolean;
  variables: TasksVariables;
}) {
  return useQuery({
    queryKey: ['tasks', input.variables.language, input.variables.level, input.variables.skill],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<TasksData, TasksVariables>({
        operationName: 'Tasks',
        variables: input.variables,
      }),
  });
}

export function useTextsQuery(input: {
  enabled: boolean;
  variables: TextsVariables;
}) {
  return useQuery({
    queryKey: ['texts', input.variables.userId],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<TextsData, TextsVariables>({
        operationName: 'Texts',
        variables: input.variables,
      }),
  });
}

export function useMeQuery(input: { enabled: boolean }) {
  return useQuery({
    queryKey: ['me'],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<MeData>({
        operationName: 'Me',
      }),
  });
}

type UpdateLevelVars = { level: CEFRLevel };
type UpdateLevelData = { updateLevel: { id: string; level: CEFRLevel } };
type UpdateLevelContext = { previous: unknown };

export function useUpdateLevelMutation() {
  const queryClient = useQueryClient();
  return useMutation<UpdateLevelData, Error, UpdateLevelVars, UpdateLevelContext>({
    mutationFn: (variables) =>
      graphqlRequest<UpdateLevelData, UpdateLevelVars>({
        operationName: 'UpdateLevel',
        variables,
      }),
    onMutate: async ({ level }) => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      const previous = queryClient.getQueryData(['me']);
      queryClient.setQueryData(['me'], (old: any) => {
        if (!old?.me) return old;
        return { ...old, me: { ...old.me, level } };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['me'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
