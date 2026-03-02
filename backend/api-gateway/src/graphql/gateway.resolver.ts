import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class GatewayResolver {
  @Query(() => String)
  hello() {
    return 'Lingua Pro API Gateway';
  }

  @Query(() => String)
  healthGraph() {
    return 'ok';
  }
}
