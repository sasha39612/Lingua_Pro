import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';

export const statsTypeDefs = gql`
  type UserStats @key(fields: "userId") {
    userId: ID!
    avgTextScore: Float
    avgPronunciationScore: Float
    totalSubmissions: Int!
    createdAt: String!
  }

  type Query {
    stats(userId: ID!): UserStats
  }
`;

export const statsSchema = buildSubgraphSchema([
  {
    typeDefs: statsTypeDefs,
    resolvers: {
      Query: {
        stats: (_: any, { userId }: any) => ({
          userId,
          avgTextScore: 0.87,
          avgPronunciationScore: 0.82,
          totalSubmissions: 15,
          createdAt: new Date().toISOString()
        })
      }
    }
  }
]);
