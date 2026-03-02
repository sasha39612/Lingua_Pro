/// <reference types="node" />
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { CheckTextInput, CheckTextResult } from './text-input.types';
import { AuthContext } from '../auth/auth-context.service';
import { Logger } from '@nestjs/common';

/**
 * Mutation Delegation Example
 *
 * Demonstrates:
 * - Circuit breaker pattern for service-to-service calls
 * - Error propagation and fallback responses
 * - Timeout handling and retry logic
 * - Header forwarding (Authorization, X-Trace-ID)
 */
@Resolver()
export class MutationDelegationResolver {
  private readonly logger = new Logger(MutationDelegationResolver.name);

  constructor(private circuitBreakerService: CircuitBreakerService) {}

  /**
   * Mutation: checkText
   *
   * Flow:
   * 1. Gateway receives mutation with CheckTextInput
   * 2. JwtAuthGuard validates Authorization header
   * 3. AuthContextService extracts user from JWT
   * 4. CircuitBreakerService wraps the text-service call
   * 5. If text-service is down/slow, circuit breaker trips
   * 6. Fallback response returned or error propagated
   * 7. Response forwarded to client
   */
  @Mutation(() => CheckTextResult)
  async checkText(
    @Args('input') input: CheckTextInput,
    @Context() ctx: any
  ): Promise<CheckTextResult> {
    const authContext: AuthContext = ctx.authContext;
    const token: string | undefined = authContext.token;
    const traceId = ctx.req?.headers['x-trace-id'] || Date.now().toString();

    if (!token) {
      throw new Error('Authentication required');
    }

    this.logger.log(`[${traceId}] checkText called for user: ${authContext.userId}`);

    // Call text-service with circuit breaker protection
    return this.circuitBreakerService.execute(
      async () => {
        return this.delegateToTextService(input, token, traceId);
      },
      () => {
        // Fallback: return mock response if text-service unavailable
        this.logger.warn(`[${traceId}] Text service unavailable, returning fallback`);
        return {
          id: 'fallback-' + Date.now(),
          originalText: input.text,
          correctedText: input.text,
          textScore: 0,
          feedback: 'Service temporarily unavailable, please retry',
          createdAt: new Date().toISOString()
        };
      }
    );
  }

  /**
   * Delegate to Text Service via GraphQL query
   *
   * Includes:
   * - Authorization header forwarding
   * - Trace ID for distributed tracing
   * - Timeout handling (10s via circuit breaker)
   * - Error propagation on non-fallback failure
   */
  private async delegateToTextService(
    input: CheckTextInput,
    token: string,
    traceId: string
  ): Promise<CheckTextResult> {
    const textServiceUrl =
      process.env.TEXT_SERVICE_URL || 'http://text-service:4002/graphql';

    const query = `
      mutation SubmitText($userId: ID!, $language: String!, $text: String!) {
        submitText(userId: $userId, language: $language, text: $text) {
          id
          originalText
          correctedText
          textScore
          feedback
          createdAt
        }
      }
    `;

    try {
      this.logger.debug(`[${traceId}] Delegating to text-service: ${textServiceUrl}`);

      const response = await fetch(textServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // forward JWT
          'X-Trace-ID': traceId, // distributed tracing
        },
        body: JSON.stringify({
          query,
          variables: {
            userId: input.userId,
            language: input.language,
            text: input.text,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `[${traceId}] Text service HTTP error: ${response.status} ${errorText}`
        );
        throw new Error(`Text service error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        const errorMsg = data.errors.map((e: any) => e.message).join('; ');
        this.logger.error(`[${traceId}] Text service GraphQL error: ${errorMsg}`);
        throw new Error(`Text service error: ${errorMsg}`);
      }

      const result = data.data?.submitText;
      if (!result) {
        throw new Error('No data returned from text-service');
      }

      this.logger.log(`[${traceId}] Text service mutation succeeded`);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[${traceId}] Delegation error:`, errMsg);
      throw err; // propagate to circuit breaker for handling
    }
  }
}
