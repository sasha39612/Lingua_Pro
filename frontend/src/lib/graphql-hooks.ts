'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql-client';
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
    mutationFn: (input: { variables: RegisterVariables; token?: string | null }) =>
      graphqlRequest<RegisterData, RegisterVariables>({
        operationName: 'Register',
        variables: input.variables,
        token: input.token,
      }),
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (input: { variables: LoginVariables; token?: string | null }) =>
      graphqlRequest<LoginData, LoginVariables>({
        operationName: 'Login',
        variables: input.variables,
        token: input.token,
      }),
  });
}

export function useCheckTextMutation() {
  return useMutation({
    mutationFn: (input: { variables: CheckTextVariables; token?: string | null }) =>
      graphqlRequest<CheckTextData, CheckTextVariables>({
        operationName: 'CheckText',
        variables: input.variables,
        token: input.token,
      }),
  });
}

export function useTasksQuery(input: {
  enabled: boolean;
  variables: TasksVariables;
  token?: string | null;
}) {
  return useQuery({
    queryKey: ['tasks', input.variables.language, input.variables.level, input.variables.skill],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<TasksData, TasksVariables>({
        operationName: 'Tasks',
        variables: input.variables,
        token: input.token,
      }),
  });
}

export function useTextsQuery(input: {
  enabled: boolean;
  variables: TextsVariables;
  token?: string | null;
}) {
  return useQuery({
    queryKey: ['texts', input.variables.userId],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<TextsData, TextsVariables>({
        operationName: 'Texts',
        variables: input.variables,
        token: input.token,
      }),
  });
}

export function useMeQuery(input: { enabled: boolean; token?: string | null }) {
  return useQuery({
    queryKey: ['me', input.token],
    enabled: input.enabled,
    queryFn: () =>
      graphqlRequest<MeData>({
        operationName: 'Me',
        token: input.token,
      }),
  });
}
