export const GRAPHQL_OPERATIONS = {
  Register: `mutation Register($email: String!, $password: String!, $language: String) {
    register(email: $email, password: $password, language: $language) {
      token
      user {
        id
        email
        role
        language
        level
      }
    }
  }`,
  Login: `mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        role
        language
        level
      }
    }
  }`,
  Me: `query Me {
    me {
      id
      email
      role
      language
      level
    }
  }`,
  UpdateLevel: `mutation UpdateLevel($level: CEFRLevel!) {
    updateLevel(level: $level) {
      id
      level
    }
  }`,
  CheckText: `mutation CheckText($input: CheckTextInput!) {
    checkText(input: $input) {
      id
      originalText
      correctedText
      textScore
      feedback
      createdAt
    }
  }`,
  Tasks: `query Tasks($language: String!, $level: String!, $skill: String) {
    tasks(language: $language, level: $level, skill: $skill) {
      id
      language
      level
      skill
      prompt
      referenceText
      focusPhonemes
      answerOptions
      correctAnswer
      questions
      createdAt
    }
  }`,
  Texts: `query Texts($userId: ID!) {
    texts(userId: $userId) {
      id
      originalText
      correctedText
      textScore
      feedback
      createdAt
    }
  }`,
  AdminUsers: `query AdminUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      id
      email
      role
      language
      createdAt
    }
  }`,
} as const;

export type OperationName = keyof typeof GRAPHQL_OPERATIONS;
