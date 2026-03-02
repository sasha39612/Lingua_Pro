import { InputType, Field, ObjectType } from '@nestjs/graphql';

@InputType()
export class CheckTextInput {
  @Field()
  userId!: string;

  @Field()
  language!: string;

  @Field()
  text!: string;
}

@ObjectType()
export class CheckTextResult {
  @Field()
  id!: string;

  @Field()
  originalText!: string;

  @Field({ nullable: true })
  correctedText?: string;

  @Field({ nullable: true })
  textScore?: number;

  @Field({ nullable: true })
  feedback?: string;

  @Field()
  createdAt!: string;
}
