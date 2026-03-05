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
    audioPath: String
    createdAt: String!
  }

  type Query {
    audioRecords(userId: ID!): [AudioRecord!]!
    audioRecord(id: ID!): AudioRecord
  }

  type Mutation {
    submitAudio(userId: ID!, language: String!, audioPath: String!): AudioRecord!
  }
`;

export const audioResolvers = {
  Query: {
    audioRecords: (_: any, { userId }: any, context: any) => {
      // Will be implemented by AudioService
      return context.audioService.getAudioByUserId(userId);
    },
    audioRecord: (_: any, { id }: any, context: any) => {
      // Will be implemented by AudioService
      return context.audioService.getAudioById(id);
    }
  },
  Mutation: {
    submitAudio: (_: any, { userId, language, audioPath }: any, context: any) => {
      // Will be implemented by AudioService
      return context.audioService.analyzeAudio(userId, language, audioPath);
    }
  }
};

export const audioSchema = buildSubgraphSchema([
  {
    typeDefs: audioTypeDefs,
    resolvers: audioResolvers
  }
]);

// Fallback simulation for testing
export function simulateAudioAnalysis(audioPath: string, language: string) {
  const fileName = audioPath.split('/').pop();
  return {
    id: Math.random().toString(),
    transcript: `[Transcribed from ${fileName}] Sample transcription for ${language} language`,
    pronunciationScore: Math.round(Math.random() * 100),
    feedback: 'Analysis complete',
    audioPath,
    createdAt: new Date().toISOString()
  };
}
