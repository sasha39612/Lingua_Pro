/**
 * Example Delegated Resolver Flow
 *
 * Use Case: Query { me: User }
 *
 * 1. CLIENT REQUEST
 *    POST /graphql
 *    Authorization: Bearer <jwt>
 *    { query: "{ me { id email role language } }" }
 *
 * 2. GATEWAY: Request Interception
 *    - JwtAuthGuard validates Authorization header
 *    - AuthContextService extracts user from JWT token
 *    - User context injected into GraphQL context
 *
 * 3. GATEWAY: Query Resolution
 *    - DelegatedResolver.me() is called
 *    - Returns User stub with id (for federation key)
 *    - Context includes authContext with validated user info
 *
 * 4. FEDERATION: Entity Resolution
 *    - Apollo Gateway recognizes User type is defined in auth subgraph
 *    - Delegates to auth-service:/graphql
 *    - Forwards request with original Authorization header
 *    - Auth service receives request, context includes user data
 *
 * 5. AUTH SERVICE: Resolution
 *    - Auth service's User.__resolveReference() is called
 *    - Returns full User entity
 *    - In production: would query database by id
 *
 * 6. GATEWAY: Response Assembly
 *    - Gateway composes final response from all subgraph results
 *    - Returns User data to client
 *
 * 7. CLIENT RESPONSE
 *    {
 *      "data": {
 *        "me": {
 *          "id": "1",
 *          "email": "demo@example.com",
 *          "role": "student",
 *          "language": "english"
 *        }
 *      }
 *    }
 *
 * Key Validations:
 * ✓ JWT token validated at gateway
 * ✓ User context passed through GraphQL context
 * ✓ Headers (Authorization, X-Trace-ID) forwarded to subgraphs
 * ✓ Cross-service federation delegation works
 * ✓ Entity references resolved correctly
 */

export const DELEGATED_RESOLVER_EXAMPLE = `
  query GetCurrentUser {
    me {
      id
      email
      role
      language
    }
  }
`;

export const DELEGATED_WITH_TRACING = `
  Headers:
  - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  - X-Trace-ID: trace-12345

  Query:
  {
    me {
      id
      email
      role
      language
    }
  }
`;
