import { Resolver, Query, Context } from '@nestjs/graphql';
import { GraphQLObjectType } from 'graphql';
import { AuthContext } from '../auth/auth-context.service';

/**
 * Delegated resolver for the gateway
 * Demonstrates:
 * - JWT validation via context
 * - User context injection
 * - Delegation to Auth Service subgraph
 */
@Resolver()
export class DelegatedResolver {
  /**
   * Gateway Query: me
   *
   * Flow:
   * 1. Client sends: Authorization: Bearer <jwt>
   * 2. Gateway validates JWT and extracts user
   * 3. Gateway adds user to context
   * 4. Federation automatically delegates to auth-service's User entity resolver
   * 5. Auth service returns full User data
   */
  @Query(() => Object, { nullable: true })
  me(@Context() ctx: any): any {
    const authContext: AuthContext = ctx.authContext;

    if (!authContext || !authContext.userId) {
      return null; // unauthenticated
    }

    // Return user stub; federation gateway will delegate to auth service
    // to resolve full User entity via @key(fields: "id")
    return {
      __typename: 'User',
      id: authContext.userId,
      email: authContext.user?.email || '',
      role: authContext.user?.role || 'student',
      language: authContext.user?.language || 'english',
    };
  }

  /**
   * Example: explicit service-to-service call with header forwarding
   * (demonstrates what happens behind federation)
   */
  @Query(() => String, { nullable: true })
  async validateUserWithAuthService(
    @Context() ctx: any,
  ): Promise<string> {
    const authContext: AuthContext = ctx.authContext;
    const token: string | undefined = authContext.token;

    if (!token) {
      throw new Error('No token provided');
    }

    // Example: forward request to auth-service with original token
    try {
      const response = await fetch('http://auth-service:4001/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // forward original token
          'X-Trace-ID': ctx.req?.headers['x-trace-id'] || Date.now().toString(), // tracing
        },
        body: JSON.stringify({
          query: `query { me { id email role } }`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Auth service error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify(data.data?.me || {});
    } catch (err) {
      console.error('Service delegation error:', err);
      throw err;
    }
  }
}
