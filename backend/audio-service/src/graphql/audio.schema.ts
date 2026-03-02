// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';

export const audioTypeDefs = gql`
  type AudioRecord @key(fields: "id") {
    id: ID!
    userId: ID!
    language: String!
    transcript: String
    pronunciationScore: Float
    feedback: String
    audioUrl: String
    createdAt: String!
  }

  type Query {
    audioRecords(userId: ID!): [AudioRecord!]!
    audioRecord(id: ID!): AudioRecord
  }

  type Mutation {
    submitAudio(userId: ID!, language: String!, audioUrl: String!): AudioRecord!
  }
`;

export const audioSchema = buildSubgraphSchema([
  {
    typeDefs: audioTypeDefs,
    resolvers: {
      Query: {
        audioRecords: (_: any, { userId }: any) => [
          {
            id: '1',
            userId,
            language: 'english',
            transcript: 'Hello world',
            pronunciationScore: 0.88,
            feedback: 'Clear pronunciation',
            audioUrl: 's3://bucket/audio-1.wav',
            createdAt: new Date().toISOString()
          }
        ],
        audioRecord: (_: any, { id }: any) => ({
          id,
          userId: '1',
          language: 'english',
          transcript: 'Hello world',
          pronunciationScore: 0.88,
          feedback: 'Clear pronunciation',
          audioUrl: 's3://bucket/audio-1.wav',
          createdAt: new Date().toISOString()
        })
      },
      Mutation: {
        submitAudio: (_: any, { userId, language, audioUrl }: any) => ({
          id: Math.random().toString(),
          userId,
          language,
          transcript: 'Transcribed text',
          pronunciationScore: 0.85,
          feedback: 'Good attempt',
          audioUrl,
          createdAt: new Date().toISOString()
        })
      }
    }
  }
]);
