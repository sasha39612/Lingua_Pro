// modules below may not have type declarations available yet
// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';

export const authTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0")

  type User @key(fields: "id") {
    id: ID!
    email: String!
    role: String!
    language: String!
  }

  type Query {
    me: User
    user(id: ID!): User
  }

  type Mutation {
    register(email: String!, password: String!, language: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`;

export const authSchema = buildSubgraphSchema([
  {
    typeDefs: authTypeDefs,
    resolvers: {
      Query: {
        me: (_: any, _args: any, context: any) => {
          // In production: extract userId from validated JWT in context
          // For now, mock user
          const userId = context.userId || '1';
          return {
            id: userId,
            email: 'demo@example.com',
            role: 'student',
            language: 'english'
          };
        },
        user: (_: any, { id }: any) => ({
          id,
          email: 'demo@example.com',
          role: 'student',
          language: 'english'
        })
      },
      Mutation: {
        register: () => ({
          token: 'mock-token-register',
          user: {
            id: '1',
            email: 'demo@example.com',
            role: 'student',
            language: 'english'
          }
        }),
        login: () => ({
          token: 'mock-token-login',
          user: {
            id: '1',
            email: 'demo@example.com',
            role: 'student',
            language: 'english'
          }
        })
      },
      User: {
        __resolveReference: (user: any) => ({
          ...user,
          email: 'demo@example.com',
          role: 'student',
          language: 'english'
        })
      }
    }
  }
]);
