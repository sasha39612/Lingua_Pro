
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model AudioRecord
 * 
 */
export type AudioRecord = $Result.DefaultSelection<Prisma.$AudioRecordPayload>
/**
 * Model Task
 * 
 */
export type Task = $Result.DefaultSelection<Prisma.$TaskPayload>
/**
 * Model ListeningScore
 * 
 */
export type ListeningScore = $Result.DefaultSelection<Prisma.$ListeningScorePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more AudioRecords
 * const audioRecords = await prisma.audioRecord.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more AudioRecords
   * const audioRecords = await prisma.audioRecord.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.audioRecord`: Exposes CRUD operations for the **AudioRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AudioRecords
    * const audioRecords = await prisma.audioRecord.findMany()
    * ```
    */
  get audioRecord(): Prisma.AudioRecordDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.task`: Exposes CRUD operations for the **Task** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tasks
    * const tasks = await prisma.task.findMany()
    * ```
    */
  get task(): Prisma.TaskDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.listeningScore`: Exposes CRUD operations for the **ListeningScore** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ListeningScores
    * const listeningScores = await prisma.listeningScore.findMany()
    * ```
    */
  get listeningScore(): Prisma.ListeningScoreDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.4.2
   * Query Engine version: 94a226be1cf2967af2541cca5529f0f7ba866919
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    AudioRecord: 'AudioRecord',
    Task: 'Task',
    ListeningScore: 'ListeningScore'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "audioRecord" | "task" | "listeningScore"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      AudioRecord: {
        payload: Prisma.$AudioRecordPayload<ExtArgs>
        fields: Prisma.AudioRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AudioRecordFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AudioRecordFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          findFirst: {
            args: Prisma.AudioRecordFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AudioRecordFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          findMany: {
            args: Prisma.AudioRecordFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>[]
          }
          create: {
            args: Prisma.AudioRecordCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          createMany: {
            args: Prisma.AudioRecordCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AudioRecordCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>[]
          }
          delete: {
            args: Prisma.AudioRecordDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          update: {
            args: Prisma.AudioRecordUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          deleteMany: {
            args: Prisma.AudioRecordDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AudioRecordUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AudioRecordUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>[]
          }
          upsert: {
            args: Prisma.AudioRecordUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AudioRecordPayload>
          }
          aggregate: {
            args: Prisma.AudioRecordAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAudioRecord>
          }
          groupBy: {
            args: Prisma.AudioRecordGroupByArgs<ExtArgs>
            result: $Utils.Optional<AudioRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.AudioRecordCountArgs<ExtArgs>
            result: $Utils.Optional<AudioRecordCountAggregateOutputType> | number
          }
        }
      }
      Task: {
        payload: Prisma.$TaskPayload<ExtArgs>
        fields: Prisma.TaskFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findFirst: {
            args: Prisma.TaskFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findMany: {
            args: Prisma.TaskFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          create: {
            args: Prisma.TaskCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          createMany: {
            args: Prisma.TaskCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          delete: {
            args: Prisma.TaskDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          update: {
            args: Prisma.TaskUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          deleteMany: {
            args: Prisma.TaskDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          upsert: {
            args: Prisma.TaskUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          aggregate: {
            args: Prisma.TaskAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTask>
          }
          groupBy: {
            args: Prisma.TaskGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskCountArgs<ExtArgs>
            result: $Utils.Optional<TaskCountAggregateOutputType> | number
          }
        }
      }
      ListeningScore: {
        payload: Prisma.$ListeningScorePayload<ExtArgs>
        fields: Prisma.ListeningScoreFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ListeningScoreFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ListeningScoreFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          findFirst: {
            args: Prisma.ListeningScoreFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ListeningScoreFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          findMany: {
            args: Prisma.ListeningScoreFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>[]
          }
          create: {
            args: Prisma.ListeningScoreCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          createMany: {
            args: Prisma.ListeningScoreCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ListeningScoreCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>[]
          }
          delete: {
            args: Prisma.ListeningScoreDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          update: {
            args: Prisma.ListeningScoreUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          deleteMany: {
            args: Prisma.ListeningScoreDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ListeningScoreUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ListeningScoreUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>[]
          }
          upsert: {
            args: Prisma.ListeningScoreUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ListeningScorePayload>
          }
          aggregate: {
            args: Prisma.ListeningScoreAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateListeningScore>
          }
          groupBy: {
            args: Prisma.ListeningScoreGroupByArgs<ExtArgs>
            result: $Utils.Optional<ListeningScoreGroupByOutputType>[]
          }
          count: {
            args: Prisma.ListeningScoreCountArgs<ExtArgs>
            result: $Utils.Optional<ListeningScoreCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    audioRecord?: AudioRecordOmit
    task?: TaskOmit
    listeningScore?: ListeningScoreOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type TaskCountOutputType
   */

  export type TaskCountOutputType = {
    listeningScores: number
  }

  export type TaskCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listeningScores?: boolean | TaskCountOutputTypeCountListeningScoresArgs
  }

  // Custom InputTypes
  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCountOutputType
     */
    select?: TaskCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountListeningScoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListeningScoreWhereInput
  }


  /**
   * Models
   */

  /**
   * Model AudioRecord
   */

  export type AggregateAudioRecord = {
    _count: AudioRecordCountAggregateOutputType | null
    _avg: AudioRecordAvgAggregateOutputType | null
    _sum: AudioRecordSumAggregateOutputType | null
    _min: AudioRecordMinAggregateOutputType | null
    _max: AudioRecordMaxAggregateOutputType | null
  }

  export type AudioRecordAvgAggregateOutputType = {
    id: number | null
    userId: number | null
    pronunciationScore: number | null
  }

  export type AudioRecordSumAggregateOutputType = {
    id: number | null
    userId: number | null
    pronunciationScore: number | null
  }

  export type AudioRecordMinAggregateOutputType = {
    id: number | null
    userId: number | null
    language: string | null
    transcript: string | null
    pronunciationScore: number | null
    feedback: string | null
    audioUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AudioRecordMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    language: string | null
    transcript: string | null
    pronunciationScore: number | null
    feedback: string | null
    audioUrl: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AudioRecordCountAggregateOutputType = {
    id: number
    userId: number
    language: number
    transcript: number
    pronunciationScore: number
    feedback: number
    audioUrl: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AudioRecordAvgAggregateInputType = {
    id?: true
    userId?: true
    pronunciationScore?: true
  }

  export type AudioRecordSumAggregateInputType = {
    id?: true
    userId?: true
    pronunciationScore?: true
  }

  export type AudioRecordMinAggregateInputType = {
    id?: true
    userId?: true
    language?: true
    transcript?: true
    pronunciationScore?: true
    feedback?: true
    audioUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AudioRecordMaxAggregateInputType = {
    id?: true
    userId?: true
    language?: true
    transcript?: true
    pronunciationScore?: true
    feedback?: true
    audioUrl?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AudioRecordCountAggregateInputType = {
    id?: true
    userId?: true
    language?: true
    transcript?: true
    pronunciationScore?: true
    feedback?: true
    audioUrl?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AudioRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AudioRecord to aggregate.
     */
    where?: AudioRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AudioRecords to fetch.
     */
    orderBy?: AudioRecordOrderByWithRelationInput | AudioRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AudioRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AudioRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AudioRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AudioRecords
    **/
    _count?: true | AudioRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AudioRecordAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AudioRecordSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AudioRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AudioRecordMaxAggregateInputType
  }

  export type GetAudioRecordAggregateType<T extends AudioRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateAudioRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAudioRecord[P]>
      : GetScalarType<T[P], AggregateAudioRecord[P]>
  }




  export type AudioRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AudioRecordWhereInput
    orderBy?: AudioRecordOrderByWithAggregationInput | AudioRecordOrderByWithAggregationInput[]
    by: AudioRecordScalarFieldEnum[] | AudioRecordScalarFieldEnum
    having?: AudioRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AudioRecordCountAggregateInputType | true
    _avg?: AudioRecordAvgAggregateInputType
    _sum?: AudioRecordSumAggregateInputType
    _min?: AudioRecordMinAggregateInputType
    _max?: AudioRecordMaxAggregateInputType
  }

  export type AudioRecordGroupByOutputType = {
    id: number
    userId: number
    language: string
    transcript: string | null
    pronunciationScore: number | null
    feedback: string | null
    audioUrl: string | null
    createdAt: Date
    updatedAt: Date
    _count: AudioRecordCountAggregateOutputType | null
    _avg: AudioRecordAvgAggregateOutputType | null
    _sum: AudioRecordSumAggregateOutputType | null
    _min: AudioRecordMinAggregateOutputType | null
    _max: AudioRecordMaxAggregateOutputType | null
  }

  type GetAudioRecordGroupByPayload<T extends AudioRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AudioRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AudioRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AudioRecordGroupByOutputType[P]>
            : GetScalarType<T[P], AudioRecordGroupByOutputType[P]>
        }
      >
    >


  export type AudioRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    language?: boolean
    transcript?: boolean
    pronunciationScore?: boolean
    feedback?: boolean
    audioUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["audioRecord"]>

  export type AudioRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    language?: boolean
    transcript?: boolean
    pronunciationScore?: boolean
    feedback?: boolean
    audioUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["audioRecord"]>

  export type AudioRecordSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    language?: boolean
    transcript?: boolean
    pronunciationScore?: boolean
    feedback?: boolean
    audioUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["audioRecord"]>

  export type AudioRecordSelectScalar = {
    id?: boolean
    userId?: boolean
    language?: boolean
    transcript?: boolean
    pronunciationScore?: boolean
    feedback?: boolean
    audioUrl?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AudioRecordOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "language" | "transcript" | "pronunciationScore" | "feedback" | "audioUrl" | "createdAt" | "updatedAt", ExtArgs["result"]["audioRecord"]>

  export type $AudioRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AudioRecord"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      language: string
      transcript: string | null
      pronunciationScore: number | null
      feedback: string | null
      audioUrl: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["audioRecord"]>
    composites: {}
  }

  type AudioRecordGetPayload<S extends boolean | null | undefined | AudioRecordDefaultArgs> = $Result.GetResult<Prisma.$AudioRecordPayload, S>

  type AudioRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AudioRecordFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AudioRecordCountAggregateInputType | true
    }

  export interface AudioRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AudioRecord'], meta: { name: 'AudioRecord' } }
    /**
     * Find zero or one AudioRecord that matches the filter.
     * @param {AudioRecordFindUniqueArgs} args - Arguments to find a AudioRecord
     * @example
     * // Get one AudioRecord
     * const audioRecord = await prisma.audioRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AudioRecordFindUniqueArgs>(args: SelectSubset<T, AudioRecordFindUniqueArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AudioRecord that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AudioRecordFindUniqueOrThrowArgs} args - Arguments to find a AudioRecord
     * @example
     * // Get one AudioRecord
     * const audioRecord = await prisma.audioRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AudioRecordFindUniqueOrThrowArgs>(args: SelectSubset<T, AudioRecordFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AudioRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordFindFirstArgs} args - Arguments to find a AudioRecord
     * @example
     * // Get one AudioRecord
     * const audioRecord = await prisma.audioRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AudioRecordFindFirstArgs>(args?: SelectSubset<T, AudioRecordFindFirstArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AudioRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordFindFirstOrThrowArgs} args - Arguments to find a AudioRecord
     * @example
     * // Get one AudioRecord
     * const audioRecord = await prisma.audioRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AudioRecordFindFirstOrThrowArgs>(args?: SelectSubset<T, AudioRecordFindFirstOrThrowArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AudioRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AudioRecords
     * const audioRecords = await prisma.audioRecord.findMany()
     * 
     * // Get first 10 AudioRecords
     * const audioRecords = await prisma.audioRecord.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const audioRecordWithIdOnly = await prisma.audioRecord.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AudioRecordFindManyArgs>(args?: SelectSubset<T, AudioRecordFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AudioRecord.
     * @param {AudioRecordCreateArgs} args - Arguments to create a AudioRecord.
     * @example
     * // Create one AudioRecord
     * const AudioRecord = await prisma.audioRecord.create({
     *   data: {
     *     // ... data to create a AudioRecord
     *   }
     * })
     * 
     */
    create<T extends AudioRecordCreateArgs>(args: SelectSubset<T, AudioRecordCreateArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AudioRecords.
     * @param {AudioRecordCreateManyArgs} args - Arguments to create many AudioRecords.
     * @example
     * // Create many AudioRecords
     * const audioRecord = await prisma.audioRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AudioRecordCreateManyArgs>(args?: SelectSubset<T, AudioRecordCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AudioRecords and returns the data saved in the database.
     * @param {AudioRecordCreateManyAndReturnArgs} args - Arguments to create many AudioRecords.
     * @example
     * // Create many AudioRecords
     * const audioRecord = await prisma.audioRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AudioRecords and only return the `id`
     * const audioRecordWithIdOnly = await prisma.audioRecord.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AudioRecordCreateManyAndReturnArgs>(args?: SelectSubset<T, AudioRecordCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AudioRecord.
     * @param {AudioRecordDeleteArgs} args - Arguments to delete one AudioRecord.
     * @example
     * // Delete one AudioRecord
     * const AudioRecord = await prisma.audioRecord.delete({
     *   where: {
     *     // ... filter to delete one AudioRecord
     *   }
     * })
     * 
     */
    delete<T extends AudioRecordDeleteArgs>(args: SelectSubset<T, AudioRecordDeleteArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AudioRecord.
     * @param {AudioRecordUpdateArgs} args - Arguments to update one AudioRecord.
     * @example
     * // Update one AudioRecord
     * const audioRecord = await prisma.audioRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AudioRecordUpdateArgs>(args: SelectSubset<T, AudioRecordUpdateArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AudioRecords.
     * @param {AudioRecordDeleteManyArgs} args - Arguments to filter AudioRecords to delete.
     * @example
     * // Delete a few AudioRecords
     * const { count } = await prisma.audioRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AudioRecordDeleteManyArgs>(args?: SelectSubset<T, AudioRecordDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AudioRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AudioRecords
     * const audioRecord = await prisma.audioRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AudioRecordUpdateManyArgs>(args: SelectSubset<T, AudioRecordUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AudioRecords and returns the data updated in the database.
     * @param {AudioRecordUpdateManyAndReturnArgs} args - Arguments to update many AudioRecords.
     * @example
     * // Update many AudioRecords
     * const audioRecord = await prisma.audioRecord.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AudioRecords and only return the `id`
     * const audioRecordWithIdOnly = await prisma.audioRecord.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AudioRecordUpdateManyAndReturnArgs>(args: SelectSubset<T, AudioRecordUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AudioRecord.
     * @param {AudioRecordUpsertArgs} args - Arguments to update or create a AudioRecord.
     * @example
     * // Update or create a AudioRecord
     * const audioRecord = await prisma.audioRecord.upsert({
     *   create: {
     *     // ... data to create a AudioRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AudioRecord we want to update
     *   }
     * })
     */
    upsert<T extends AudioRecordUpsertArgs>(args: SelectSubset<T, AudioRecordUpsertArgs<ExtArgs>>): Prisma__AudioRecordClient<$Result.GetResult<Prisma.$AudioRecordPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AudioRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordCountArgs} args - Arguments to filter AudioRecords to count.
     * @example
     * // Count the number of AudioRecords
     * const count = await prisma.audioRecord.count({
     *   where: {
     *     // ... the filter for the AudioRecords we want to count
     *   }
     * })
    **/
    count<T extends AudioRecordCountArgs>(
      args?: Subset<T, AudioRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AudioRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AudioRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AudioRecordAggregateArgs>(args: Subset<T, AudioRecordAggregateArgs>): Prisma.PrismaPromise<GetAudioRecordAggregateType<T>>

    /**
     * Group by AudioRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AudioRecordGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AudioRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AudioRecordGroupByArgs['orderBy'] }
        : { orderBy?: AudioRecordGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AudioRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAudioRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AudioRecord model
   */
  readonly fields: AudioRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AudioRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AudioRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AudioRecord model
   */
  interface AudioRecordFieldRefs {
    readonly id: FieldRef<"AudioRecord", 'Int'>
    readonly userId: FieldRef<"AudioRecord", 'Int'>
    readonly language: FieldRef<"AudioRecord", 'String'>
    readonly transcript: FieldRef<"AudioRecord", 'String'>
    readonly pronunciationScore: FieldRef<"AudioRecord", 'Float'>
    readonly feedback: FieldRef<"AudioRecord", 'String'>
    readonly audioUrl: FieldRef<"AudioRecord", 'String'>
    readonly createdAt: FieldRef<"AudioRecord", 'DateTime'>
    readonly updatedAt: FieldRef<"AudioRecord", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AudioRecord findUnique
   */
  export type AudioRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter, which AudioRecord to fetch.
     */
    where: AudioRecordWhereUniqueInput
  }

  /**
   * AudioRecord findUniqueOrThrow
   */
  export type AudioRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter, which AudioRecord to fetch.
     */
    where: AudioRecordWhereUniqueInput
  }

  /**
   * AudioRecord findFirst
   */
  export type AudioRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter, which AudioRecord to fetch.
     */
    where?: AudioRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AudioRecords to fetch.
     */
    orderBy?: AudioRecordOrderByWithRelationInput | AudioRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AudioRecords.
     */
    cursor?: AudioRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AudioRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AudioRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AudioRecords.
     */
    distinct?: AudioRecordScalarFieldEnum | AudioRecordScalarFieldEnum[]
  }

  /**
   * AudioRecord findFirstOrThrow
   */
  export type AudioRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter, which AudioRecord to fetch.
     */
    where?: AudioRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AudioRecords to fetch.
     */
    orderBy?: AudioRecordOrderByWithRelationInput | AudioRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AudioRecords.
     */
    cursor?: AudioRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AudioRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AudioRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AudioRecords.
     */
    distinct?: AudioRecordScalarFieldEnum | AudioRecordScalarFieldEnum[]
  }

  /**
   * AudioRecord findMany
   */
  export type AudioRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter, which AudioRecords to fetch.
     */
    where?: AudioRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AudioRecords to fetch.
     */
    orderBy?: AudioRecordOrderByWithRelationInput | AudioRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AudioRecords.
     */
    cursor?: AudioRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AudioRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AudioRecords.
     */
    skip?: number
    distinct?: AudioRecordScalarFieldEnum | AudioRecordScalarFieldEnum[]
  }

  /**
   * AudioRecord create
   */
  export type AudioRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * The data needed to create a AudioRecord.
     */
    data: XOR<AudioRecordCreateInput, AudioRecordUncheckedCreateInput>
  }

  /**
   * AudioRecord createMany
   */
  export type AudioRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AudioRecords.
     */
    data: AudioRecordCreateManyInput | AudioRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AudioRecord createManyAndReturn
   */
  export type AudioRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * The data used to create many AudioRecords.
     */
    data: AudioRecordCreateManyInput | AudioRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AudioRecord update
   */
  export type AudioRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * The data needed to update a AudioRecord.
     */
    data: XOR<AudioRecordUpdateInput, AudioRecordUncheckedUpdateInput>
    /**
     * Choose, which AudioRecord to update.
     */
    where: AudioRecordWhereUniqueInput
  }

  /**
   * AudioRecord updateMany
   */
  export type AudioRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AudioRecords.
     */
    data: XOR<AudioRecordUpdateManyMutationInput, AudioRecordUncheckedUpdateManyInput>
    /**
     * Filter which AudioRecords to update
     */
    where?: AudioRecordWhereInput
    /**
     * Limit how many AudioRecords to update.
     */
    limit?: number
  }

  /**
   * AudioRecord updateManyAndReturn
   */
  export type AudioRecordUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * The data used to update AudioRecords.
     */
    data: XOR<AudioRecordUpdateManyMutationInput, AudioRecordUncheckedUpdateManyInput>
    /**
     * Filter which AudioRecords to update
     */
    where?: AudioRecordWhereInput
    /**
     * Limit how many AudioRecords to update.
     */
    limit?: number
  }

  /**
   * AudioRecord upsert
   */
  export type AudioRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * The filter to search for the AudioRecord to update in case it exists.
     */
    where: AudioRecordWhereUniqueInput
    /**
     * In case the AudioRecord found by the `where` argument doesn't exist, create a new AudioRecord with this data.
     */
    create: XOR<AudioRecordCreateInput, AudioRecordUncheckedCreateInput>
    /**
     * In case the AudioRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AudioRecordUpdateInput, AudioRecordUncheckedUpdateInput>
  }

  /**
   * AudioRecord delete
   */
  export type AudioRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
    /**
     * Filter which AudioRecord to delete.
     */
    where: AudioRecordWhereUniqueInput
  }

  /**
   * AudioRecord deleteMany
   */
  export type AudioRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AudioRecords to delete
     */
    where?: AudioRecordWhereInput
    /**
     * Limit how many AudioRecords to delete.
     */
    limit?: number
  }

  /**
   * AudioRecord without action
   */
  export type AudioRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AudioRecord
     */
    select?: AudioRecordSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AudioRecord
     */
    omit?: AudioRecordOmit<ExtArgs> | null
  }


  /**
   * Model Task
   */

  export type AggregateTask = {
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  export type TaskAvgAggregateOutputType = {
    id: number | null
  }

  export type TaskSumAggregateOutputType = {
    id: number | null
  }

  export type TaskMinAggregateOutputType = {
    id: number | null
    language: string | null
    level: string | null
    skill: string | null
    prompt: string | null
    audioUrl: string | null
    referenceText: string | null
    correctAnswer: string | null
    questionsJson: string | null
    createdAt: Date | null
  }

  export type TaskMaxAggregateOutputType = {
    id: number | null
    language: string | null
    level: string | null
    skill: string | null
    prompt: string | null
    audioUrl: string | null
    referenceText: string | null
    correctAnswer: string | null
    questionsJson: string | null
    createdAt: Date | null
  }

  export type TaskCountAggregateOutputType = {
    id: number
    language: number
    level: number
    skill: number
    prompt: number
    audioUrl: number
    referenceText: number
    answerOptions: number
    correctAnswer: number
    questionsJson: number
    createdAt: number
    _all: number
  }


  export type TaskAvgAggregateInputType = {
    id?: true
  }

  export type TaskSumAggregateInputType = {
    id?: true
  }

  export type TaskMinAggregateInputType = {
    id?: true
    language?: true
    level?: true
    skill?: true
    prompt?: true
    audioUrl?: true
    referenceText?: true
    correctAnswer?: true
    questionsJson?: true
    createdAt?: true
  }

  export type TaskMaxAggregateInputType = {
    id?: true
    language?: true
    level?: true
    skill?: true
    prompt?: true
    audioUrl?: true
    referenceText?: true
    correctAnswer?: true
    questionsJson?: true
    createdAt?: true
  }

  export type TaskCountAggregateInputType = {
    id?: true
    language?: true
    level?: true
    skill?: true
    prompt?: true
    audioUrl?: true
    referenceText?: true
    answerOptions?: true
    correctAnswer?: true
    questionsJson?: true
    createdAt?: true
    _all?: true
  }

  export type TaskAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Task to aggregate.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tasks
    **/
    _count?: true | TaskCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TaskAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TaskSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskMaxAggregateInputType
  }

  export type GetTaskAggregateType<T extends TaskAggregateArgs> = {
        [P in keyof T & keyof AggregateTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTask[P]>
      : GetScalarType<T[P], AggregateTask[P]>
  }




  export type TaskGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithAggregationInput | TaskOrderByWithAggregationInput[]
    by: TaskScalarFieldEnum[] | TaskScalarFieldEnum
    having?: TaskScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskCountAggregateInputType | true
    _avg?: TaskAvgAggregateInputType
    _sum?: TaskSumAggregateInputType
    _min?: TaskMinAggregateInputType
    _max?: TaskMaxAggregateInputType
  }

  export type TaskGroupByOutputType = {
    id: number
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl: string | null
    referenceText: string | null
    answerOptions: string[]
    correctAnswer: string | null
    questionsJson: string | null
    createdAt: Date
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  type GetTaskGroupByPayload<T extends TaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskGroupByOutputType[P]>
            : GetScalarType<T[P], TaskGroupByOutputType[P]>
        }
      >
    >


  export type TaskSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    language?: boolean
    level?: boolean
    skill?: boolean
    prompt?: boolean
    audioUrl?: boolean
    referenceText?: boolean
    answerOptions?: boolean
    correctAnswer?: boolean
    questionsJson?: boolean
    createdAt?: boolean
    listeningScores?: boolean | Task$listeningScoresArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    language?: boolean
    level?: boolean
    skill?: boolean
    prompt?: boolean
    audioUrl?: boolean
    referenceText?: boolean
    answerOptions?: boolean
    correctAnswer?: boolean
    questionsJson?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["task"]>

  export type TaskSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    language?: boolean
    level?: boolean
    skill?: boolean
    prompt?: boolean
    audioUrl?: boolean
    referenceText?: boolean
    answerOptions?: boolean
    correctAnswer?: boolean
    questionsJson?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["task"]>

  export type TaskSelectScalar = {
    id?: boolean
    language?: boolean
    level?: boolean
    skill?: boolean
    prompt?: boolean
    audioUrl?: boolean
    referenceText?: boolean
    answerOptions?: boolean
    correctAnswer?: boolean
    questionsJson?: boolean
    createdAt?: boolean
  }

  export type TaskOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "language" | "level" | "skill" | "prompt" | "audioUrl" | "referenceText" | "answerOptions" | "correctAnswer" | "questionsJson" | "createdAt", ExtArgs["result"]["task"]>
  export type TaskInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    listeningScores?: boolean | Task$listeningScoresArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TaskIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TaskIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TaskPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Task"
    objects: {
      listeningScores: Prisma.$ListeningScorePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      language: string
      level: string
      skill: string
      prompt: string
      audioUrl: string | null
      referenceText: string | null
      answerOptions: string[]
      correctAnswer: string | null
      questionsJson: string | null
      createdAt: Date
    }, ExtArgs["result"]["task"]>
    composites: {}
  }

  type TaskGetPayload<S extends boolean | null | undefined | TaskDefaultArgs> = $Result.GetResult<Prisma.$TaskPayload, S>

  type TaskCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskCountAggregateInputType | true
    }

  export interface TaskDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Task'], meta: { name: 'Task' } }
    /**
     * Find zero or one Task that matches the filter.
     * @param {TaskFindUniqueArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskFindUniqueArgs>(args: SelectSubset<T, TaskFindUniqueArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Task that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskFindUniqueOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskFindFirstArgs>(args?: SelectSubset<T, TaskFindFirstArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.task.findMany()
     * 
     * // Get first 10 Tasks
     * const tasks = await prisma.task.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskWithIdOnly = await prisma.task.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskFindManyArgs>(args?: SelectSubset<T, TaskFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Task.
     * @param {TaskCreateArgs} args - Arguments to create a Task.
     * @example
     * // Create one Task
     * const Task = await prisma.task.create({
     *   data: {
     *     // ... data to create a Task
     *   }
     * })
     * 
     */
    create<T extends TaskCreateArgs>(args: SelectSubset<T, TaskCreateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tasks.
     * @param {TaskCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskCreateManyArgs>(args?: SelectSubset<T, TaskCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {TaskCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Task.
     * @param {TaskDeleteArgs} args - Arguments to delete one Task.
     * @example
     * // Delete one Task
     * const Task = await prisma.task.delete({
     *   where: {
     *     // ... filter to delete one Task
     *   }
     * })
     * 
     */
    delete<T extends TaskDeleteArgs>(args: SelectSubset<T, TaskDeleteArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Task.
     * @param {TaskUpdateArgs} args - Arguments to update one Task.
     * @example
     * // Update one Task
     * const task = await prisma.task.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskUpdateArgs>(args: SelectSubset<T, TaskUpdateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tasks.
     * @param {TaskDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.task.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskDeleteManyArgs>(args?: SelectSubset<T, TaskDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskUpdateManyArgs>(args: SelectSubset<T, TaskUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks and returns the data updated in the database.
     * @param {TaskUpdateManyAndReturnArgs} args - Arguments to update many Tasks.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Task.
     * @param {TaskUpsertArgs} args - Arguments to update or create a Task.
     * @example
     * // Update or create a Task
     * const task = await prisma.task.upsert({
     *   create: {
     *     // ... data to create a Task
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Task we want to update
     *   }
     * })
     */
    upsert<T extends TaskUpsertArgs>(args: SelectSubset<T, TaskUpsertArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.task.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
    **/
    count<T extends TaskCountArgs>(
      args?: Subset<T, TaskCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskAggregateArgs>(args: Subset<T, TaskAggregateArgs>): Prisma.PrismaPromise<GetTaskAggregateType<T>>

    /**
     * Group by Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskGroupByArgs['orderBy'] }
        : { orderBy?: TaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Task model
   */
  readonly fields: TaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Task.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    listeningScores<T extends Task$listeningScoresArgs<ExtArgs> = {}>(args?: Subset<T, Task$listeningScoresArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Task model
   */
  interface TaskFieldRefs {
    readonly id: FieldRef<"Task", 'Int'>
    readonly language: FieldRef<"Task", 'String'>
    readonly level: FieldRef<"Task", 'String'>
    readonly skill: FieldRef<"Task", 'String'>
    readonly prompt: FieldRef<"Task", 'String'>
    readonly audioUrl: FieldRef<"Task", 'String'>
    readonly referenceText: FieldRef<"Task", 'String'>
    readonly answerOptions: FieldRef<"Task", 'String[]'>
    readonly correctAnswer: FieldRef<"Task", 'String'>
    readonly questionsJson: FieldRef<"Task", 'String'>
    readonly createdAt: FieldRef<"Task", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Task findUnique
   */
  export type TaskFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findUniqueOrThrow
   */
  export type TaskFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findFirst
   */
  export type TaskFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findFirstOrThrow
   */
  export type TaskFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findMany
   */
  export type TaskFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Tasks to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task create
   */
  export type TaskCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to create a Task.
     */
    data: XOR<TaskCreateInput, TaskUncheckedCreateInput>
  }

  /**
   * Task createMany
   */
  export type TaskCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Task createManyAndReturn
   */
  export type TaskCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Task update
   */
  export type TaskUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to update a Task.
     */
    data: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
    /**
     * Choose, which Task to update.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task updateMany
   */
  export type TaskUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
  }

  /**
   * Task updateManyAndReturn
   */
  export type TaskUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
  }

  /**
   * Task upsert
   */
  export type TaskUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The filter to search for the Task to update in case it exists.
     */
    where: TaskWhereUniqueInput
    /**
     * In case the Task found by the `where` argument doesn't exist, create a new Task with this data.
     */
    create: XOR<TaskCreateInput, TaskUncheckedCreateInput>
    /**
     * In case the Task was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
  }

  /**
   * Task delete
   */
  export type TaskDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter which Task to delete.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task deleteMany
   */
  export type TaskDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tasks to delete
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to delete.
     */
    limit?: number
  }

  /**
   * Task.listeningScores
   */
  export type Task$listeningScoresArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    where?: ListeningScoreWhereInput
    orderBy?: ListeningScoreOrderByWithRelationInput | ListeningScoreOrderByWithRelationInput[]
    cursor?: ListeningScoreWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ListeningScoreScalarFieldEnum | ListeningScoreScalarFieldEnum[]
  }

  /**
   * Task without action
   */
  export type TaskDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
  }


  /**
   * Model ListeningScore
   */

  export type AggregateListeningScore = {
    _count: ListeningScoreCountAggregateOutputType | null
    _avg: ListeningScoreAvgAggregateOutputType | null
    _sum: ListeningScoreSumAggregateOutputType | null
    _min: ListeningScoreMinAggregateOutputType | null
    _max: ListeningScoreMaxAggregateOutputType | null
  }

  export type ListeningScoreAvgAggregateOutputType = {
    id: number | null
    userId: number | null
    taskId: number | null
    score: number | null
  }

  export type ListeningScoreSumAggregateOutputType = {
    id: number | null
    userId: number | null
    taskId: number | null
    score: number | null
  }

  export type ListeningScoreMinAggregateOutputType = {
    id: number | null
    userId: number | null
    taskId: number | null
    score: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListeningScoreMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    taskId: number | null
    score: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ListeningScoreCountAggregateOutputType = {
    id: number
    userId: number
    taskId: number
    score: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ListeningScoreAvgAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    score?: true
  }

  export type ListeningScoreSumAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    score?: true
  }

  export type ListeningScoreMinAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    score?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListeningScoreMaxAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    score?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ListeningScoreCountAggregateInputType = {
    id?: true
    userId?: true
    taskId?: true
    score?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ListeningScoreAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ListeningScore to aggregate.
     */
    where?: ListeningScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ListeningScores to fetch.
     */
    orderBy?: ListeningScoreOrderByWithRelationInput | ListeningScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ListeningScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ListeningScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ListeningScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ListeningScores
    **/
    _count?: true | ListeningScoreCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ListeningScoreAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ListeningScoreSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ListeningScoreMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ListeningScoreMaxAggregateInputType
  }

  export type GetListeningScoreAggregateType<T extends ListeningScoreAggregateArgs> = {
        [P in keyof T & keyof AggregateListeningScore]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateListeningScore[P]>
      : GetScalarType<T[P], AggregateListeningScore[P]>
  }




  export type ListeningScoreGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ListeningScoreWhereInput
    orderBy?: ListeningScoreOrderByWithAggregationInput | ListeningScoreOrderByWithAggregationInput[]
    by: ListeningScoreScalarFieldEnum[] | ListeningScoreScalarFieldEnum
    having?: ListeningScoreScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ListeningScoreCountAggregateInputType | true
    _avg?: ListeningScoreAvgAggregateInputType
    _sum?: ListeningScoreSumAggregateInputType
    _min?: ListeningScoreMinAggregateInputType
    _max?: ListeningScoreMaxAggregateInputType
  }

  export type ListeningScoreGroupByOutputType = {
    id: number
    userId: number
    taskId: number
    score: number
    createdAt: Date
    updatedAt: Date
    _count: ListeningScoreCountAggregateOutputType | null
    _avg: ListeningScoreAvgAggregateOutputType | null
    _sum: ListeningScoreSumAggregateOutputType | null
    _min: ListeningScoreMinAggregateOutputType | null
    _max: ListeningScoreMaxAggregateOutputType | null
  }

  type GetListeningScoreGroupByPayload<T extends ListeningScoreGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ListeningScoreGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ListeningScoreGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ListeningScoreGroupByOutputType[P]>
            : GetScalarType<T[P], ListeningScoreGroupByOutputType[P]>
        }
      >
    >


  export type ListeningScoreSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    score?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["listeningScore"]>

  export type ListeningScoreSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    score?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["listeningScore"]>

  export type ListeningScoreSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    taskId?: boolean
    score?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["listeningScore"]>

  export type ListeningScoreSelectScalar = {
    id?: boolean
    userId?: boolean
    taskId?: boolean
    score?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ListeningScoreOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "taskId" | "score" | "createdAt" | "updatedAt", ExtArgs["result"]["listeningScore"]>
  export type ListeningScoreInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }
  export type ListeningScoreIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }
  export type ListeningScoreIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }

  export type $ListeningScorePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ListeningScore"
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      taskId: number
      score: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["listeningScore"]>
    composites: {}
  }

  type ListeningScoreGetPayload<S extends boolean | null | undefined | ListeningScoreDefaultArgs> = $Result.GetResult<Prisma.$ListeningScorePayload, S>

  type ListeningScoreCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ListeningScoreFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ListeningScoreCountAggregateInputType | true
    }

  export interface ListeningScoreDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ListeningScore'], meta: { name: 'ListeningScore' } }
    /**
     * Find zero or one ListeningScore that matches the filter.
     * @param {ListeningScoreFindUniqueArgs} args - Arguments to find a ListeningScore
     * @example
     * // Get one ListeningScore
     * const listeningScore = await prisma.listeningScore.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ListeningScoreFindUniqueArgs>(args: SelectSubset<T, ListeningScoreFindUniqueArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ListeningScore that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ListeningScoreFindUniqueOrThrowArgs} args - Arguments to find a ListeningScore
     * @example
     * // Get one ListeningScore
     * const listeningScore = await prisma.listeningScore.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ListeningScoreFindUniqueOrThrowArgs>(args: SelectSubset<T, ListeningScoreFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ListeningScore that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreFindFirstArgs} args - Arguments to find a ListeningScore
     * @example
     * // Get one ListeningScore
     * const listeningScore = await prisma.listeningScore.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ListeningScoreFindFirstArgs>(args?: SelectSubset<T, ListeningScoreFindFirstArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ListeningScore that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreFindFirstOrThrowArgs} args - Arguments to find a ListeningScore
     * @example
     * // Get one ListeningScore
     * const listeningScore = await prisma.listeningScore.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ListeningScoreFindFirstOrThrowArgs>(args?: SelectSubset<T, ListeningScoreFindFirstOrThrowArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ListeningScores that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ListeningScores
     * const listeningScores = await prisma.listeningScore.findMany()
     * 
     * // Get first 10 ListeningScores
     * const listeningScores = await prisma.listeningScore.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const listeningScoreWithIdOnly = await prisma.listeningScore.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ListeningScoreFindManyArgs>(args?: SelectSubset<T, ListeningScoreFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ListeningScore.
     * @param {ListeningScoreCreateArgs} args - Arguments to create a ListeningScore.
     * @example
     * // Create one ListeningScore
     * const ListeningScore = await prisma.listeningScore.create({
     *   data: {
     *     // ... data to create a ListeningScore
     *   }
     * })
     * 
     */
    create<T extends ListeningScoreCreateArgs>(args: SelectSubset<T, ListeningScoreCreateArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ListeningScores.
     * @param {ListeningScoreCreateManyArgs} args - Arguments to create many ListeningScores.
     * @example
     * // Create many ListeningScores
     * const listeningScore = await prisma.listeningScore.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ListeningScoreCreateManyArgs>(args?: SelectSubset<T, ListeningScoreCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ListeningScores and returns the data saved in the database.
     * @param {ListeningScoreCreateManyAndReturnArgs} args - Arguments to create many ListeningScores.
     * @example
     * // Create many ListeningScores
     * const listeningScore = await prisma.listeningScore.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ListeningScores and only return the `id`
     * const listeningScoreWithIdOnly = await prisma.listeningScore.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ListeningScoreCreateManyAndReturnArgs>(args?: SelectSubset<T, ListeningScoreCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ListeningScore.
     * @param {ListeningScoreDeleteArgs} args - Arguments to delete one ListeningScore.
     * @example
     * // Delete one ListeningScore
     * const ListeningScore = await prisma.listeningScore.delete({
     *   where: {
     *     // ... filter to delete one ListeningScore
     *   }
     * })
     * 
     */
    delete<T extends ListeningScoreDeleteArgs>(args: SelectSubset<T, ListeningScoreDeleteArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ListeningScore.
     * @param {ListeningScoreUpdateArgs} args - Arguments to update one ListeningScore.
     * @example
     * // Update one ListeningScore
     * const listeningScore = await prisma.listeningScore.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ListeningScoreUpdateArgs>(args: SelectSubset<T, ListeningScoreUpdateArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ListeningScores.
     * @param {ListeningScoreDeleteManyArgs} args - Arguments to filter ListeningScores to delete.
     * @example
     * // Delete a few ListeningScores
     * const { count } = await prisma.listeningScore.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ListeningScoreDeleteManyArgs>(args?: SelectSubset<T, ListeningScoreDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ListeningScores.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ListeningScores
     * const listeningScore = await prisma.listeningScore.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ListeningScoreUpdateManyArgs>(args: SelectSubset<T, ListeningScoreUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ListeningScores and returns the data updated in the database.
     * @param {ListeningScoreUpdateManyAndReturnArgs} args - Arguments to update many ListeningScores.
     * @example
     * // Update many ListeningScores
     * const listeningScore = await prisma.listeningScore.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ListeningScores and only return the `id`
     * const listeningScoreWithIdOnly = await prisma.listeningScore.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ListeningScoreUpdateManyAndReturnArgs>(args: SelectSubset<T, ListeningScoreUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ListeningScore.
     * @param {ListeningScoreUpsertArgs} args - Arguments to update or create a ListeningScore.
     * @example
     * // Update or create a ListeningScore
     * const listeningScore = await prisma.listeningScore.upsert({
     *   create: {
     *     // ... data to create a ListeningScore
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ListeningScore we want to update
     *   }
     * })
     */
    upsert<T extends ListeningScoreUpsertArgs>(args: SelectSubset<T, ListeningScoreUpsertArgs<ExtArgs>>): Prisma__ListeningScoreClient<$Result.GetResult<Prisma.$ListeningScorePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ListeningScores.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreCountArgs} args - Arguments to filter ListeningScores to count.
     * @example
     * // Count the number of ListeningScores
     * const count = await prisma.listeningScore.count({
     *   where: {
     *     // ... the filter for the ListeningScores we want to count
     *   }
     * })
    **/
    count<T extends ListeningScoreCountArgs>(
      args?: Subset<T, ListeningScoreCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ListeningScoreCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ListeningScore.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ListeningScoreAggregateArgs>(args: Subset<T, ListeningScoreAggregateArgs>): Prisma.PrismaPromise<GetListeningScoreAggregateType<T>>

    /**
     * Group by ListeningScore.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ListeningScoreGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ListeningScoreGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ListeningScoreGroupByArgs['orderBy'] }
        : { orderBy?: ListeningScoreGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ListeningScoreGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetListeningScoreGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ListeningScore model
   */
  readonly fields: ListeningScoreFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ListeningScore.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ListeningScoreClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TaskDefaultArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ListeningScore model
   */
  interface ListeningScoreFieldRefs {
    readonly id: FieldRef<"ListeningScore", 'Int'>
    readonly userId: FieldRef<"ListeningScore", 'Int'>
    readonly taskId: FieldRef<"ListeningScore", 'Int'>
    readonly score: FieldRef<"ListeningScore", 'Float'>
    readonly createdAt: FieldRef<"ListeningScore", 'DateTime'>
    readonly updatedAt: FieldRef<"ListeningScore", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ListeningScore findUnique
   */
  export type ListeningScoreFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter, which ListeningScore to fetch.
     */
    where: ListeningScoreWhereUniqueInput
  }

  /**
   * ListeningScore findUniqueOrThrow
   */
  export type ListeningScoreFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter, which ListeningScore to fetch.
     */
    where: ListeningScoreWhereUniqueInput
  }

  /**
   * ListeningScore findFirst
   */
  export type ListeningScoreFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter, which ListeningScore to fetch.
     */
    where?: ListeningScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ListeningScores to fetch.
     */
    orderBy?: ListeningScoreOrderByWithRelationInput | ListeningScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ListeningScores.
     */
    cursor?: ListeningScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ListeningScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ListeningScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ListeningScores.
     */
    distinct?: ListeningScoreScalarFieldEnum | ListeningScoreScalarFieldEnum[]
  }

  /**
   * ListeningScore findFirstOrThrow
   */
  export type ListeningScoreFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter, which ListeningScore to fetch.
     */
    where?: ListeningScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ListeningScores to fetch.
     */
    orderBy?: ListeningScoreOrderByWithRelationInput | ListeningScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ListeningScores.
     */
    cursor?: ListeningScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ListeningScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ListeningScores.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ListeningScores.
     */
    distinct?: ListeningScoreScalarFieldEnum | ListeningScoreScalarFieldEnum[]
  }

  /**
   * ListeningScore findMany
   */
  export type ListeningScoreFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter, which ListeningScores to fetch.
     */
    where?: ListeningScoreWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ListeningScores to fetch.
     */
    orderBy?: ListeningScoreOrderByWithRelationInput | ListeningScoreOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ListeningScores.
     */
    cursor?: ListeningScoreWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ListeningScores from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ListeningScores.
     */
    skip?: number
    distinct?: ListeningScoreScalarFieldEnum | ListeningScoreScalarFieldEnum[]
  }

  /**
   * ListeningScore create
   */
  export type ListeningScoreCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * The data needed to create a ListeningScore.
     */
    data: XOR<ListeningScoreCreateInput, ListeningScoreUncheckedCreateInput>
  }

  /**
   * ListeningScore createMany
   */
  export type ListeningScoreCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ListeningScores.
     */
    data: ListeningScoreCreateManyInput | ListeningScoreCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ListeningScore createManyAndReturn
   */
  export type ListeningScoreCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * The data used to create many ListeningScores.
     */
    data: ListeningScoreCreateManyInput | ListeningScoreCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ListeningScore update
   */
  export type ListeningScoreUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * The data needed to update a ListeningScore.
     */
    data: XOR<ListeningScoreUpdateInput, ListeningScoreUncheckedUpdateInput>
    /**
     * Choose, which ListeningScore to update.
     */
    where: ListeningScoreWhereUniqueInput
  }

  /**
   * ListeningScore updateMany
   */
  export type ListeningScoreUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ListeningScores.
     */
    data: XOR<ListeningScoreUpdateManyMutationInput, ListeningScoreUncheckedUpdateManyInput>
    /**
     * Filter which ListeningScores to update
     */
    where?: ListeningScoreWhereInput
    /**
     * Limit how many ListeningScores to update.
     */
    limit?: number
  }

  /**
   * ListeningScore updateManyAndReturn
   */
  export type ListeningScoreUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * The data used to update ListeningScores.
     */
    data: XOR<ListeningScoreUpdateManyMutationInput, ListeningScoreUncheckedUpdateManyInput>
    /**
     * Filter which ListeningScores to update
     */
    where?: ListeningScoreWhereInput
    /**
     * Limit how many ListeningScores to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ListeningScore upsert
   */
  export type ListeningScoreUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * The filter to search for the ListeningScore to update in case it exists.
     */
    where: ListeningScoreWhereUniqueInput
    /**
     * In case the ListeningScore found by the `where` argument doesn't exist, create a new ListeningScore with this data.
     */
    create: XOR<ListeningScoreCreateInput, ListeningScoreUncheckedCreateInput>
    /**
     * In case the ListeningScore was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ListeningScoreUpdateInput, ListeningScoreUncheckedUpdateInput>
  }

  /**
   * ListeningScore delete
   */
  export type ListeningScoreDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
    /**
     * Filter which ListeningScore to delete.
     */
    where: ListeningScoreWhereUniqueInput
  }

  /**
   * ListeningScore deleteMany
   */
  export type ListeningScoreDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ListeningScores to delete
     */
    where?: ListeningScoreWhereInput
    /**
     * Limit how many ListeningScores to delete.
     */
    limit?: number
  }

  /**
   * ListeningScore without action
   */
  export type ListeningScoreDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ListeningScore
     */
    select?: ListeningScoreSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ListeningScore
     */
    omit?: ListeningScoreOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ListeningScoreInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const AudioRecordScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    language: 'language',
    transcript: 'transcript',
    pronunciationScore: 'pronunciationScore',
    feedback: 'feedback',
    audioUrl: 'audioUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AudioRecordScalarFieldEnum = (typeof AudioRecordScalarFieldEnum)[keyof typeof AudioRecordScalarFieldEnum]


  export const TaskScalarFieldEnum: {
    id: 'id',
    language: 'language',
    level: 'level',
    skill: 'skill',
    prompt: 'prompt',
    audioUrl: 'audioUrl',
    referenceText: 'referenceText',
    answerOptions: 'answerOptions',
    correctAnswer: 'correctAnswer',
    questionsJson: 'questionsJson',
    createdAt: 'createdAt'
  };

  export type TaskScalarFieldEnum = (typeof TaskScalarFieldEnum)[keyof typeof TaskScalarFieldEnum]


  export const ListeningScoreScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    taskId: 'taskId',
    score: 'score',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ListeningScoreScalarFieldEnum = (typeof ListeningScoreScalarFieldEnum)[keyof typeof ListeningScoreScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    
  /**
   * Deep Input Types
   */


  export type AudioRecordWhereInput = {
    AND?: AudioRecordWhereInput | AudioRecordWhereInput[]
    OR?: AudioRecordWhereInput[]
    NOT?: AudioRecordWhereInput | AudioRecordWhereInput[]
    id?: IntFilter<"AudioRecord"> | number
    userId?: IntFilter<"AudioRecord"> | number
    language?: StringFilter<"AudioRecord"> | string
    transcript?: StringNullableFilter<"AudioRecord"> | string | null
    pronunciationScore?: FloatNullableFilter<"AudioRecord"> | number | null
    feedback?: StringNullableFilter<"AudioRecord"> | string | null
    audioUrl?: StringNullableFilter<"AudioRecord"> | string | null
    createdAt?: DateTimeFilter<"AudioRecord"> | Date | string
    updatedAt?: DateTimeFilter<"AudioRecord"> | Date | string
  }

  export type AudioRecordOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    language?: SortOrder
    transcript?: SortOrderInput | SortOrder
    pronunciationScore?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    audioUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AudioRecordWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AudioRecordWhereInput | AudioRecordWhereInput[]
    OR?: AudioRecordWhereInput[]
    NOT?: AudioRecordWhereInput | AudioRecordWhereInput[]
    userId?: IntFilter<"AudioRecord"> | number
    language?: StringFilter<"AudioRecord"> | string
    transcript?: StringNullableFilter<"AudioRecord"> | string | null
    pronunciationScore?: FloatNullableFilter<"AudioRecord"> | number | null
    feedback?: StringNullableFilter<"AudioRecord"> | string | null
    audioUrl?: StringNullableFilter<"AudioRecord"> | string | null
    createdAt?: DateTimeFilter<"AudioRecord"> | Date | string
    updatedAt?: DateTimeFilter<"AudioRecord"> | Date | string
  }, "id">

  export type AudioRecordOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    language?: SortOrder
    transcript?: SortOrderInput | SortOrder
    pronunciationScore?: SortOrderInput | SortOrder
    feedback?: SortOrderInput | SortOrder
    audioUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AudioRecordCountOrderByAggregateInput
    _avg?: AudioRecordAvgOrderByAggregateInput
    _max?: AudioRecordMaxOrderByAggregateInput
    _min?: AudioRecordMinOrderByAggregateInput
    _sum?: AudioRecordSumOrderByAggregateInput
  }

  export type AudioRecordScalarWhereWithAggregatesInput = {
    AND?: AudioRecordScalarWhereWithAggregatesInput | AudioRecordScalarWhereWithAggregatesInput[]
    OR?: AudioRecordScalarWhereWithAggregatesInput[]
    NOT?: AudioRecordScalarWhereWithAggregatesInput | AudioRecordScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AudioRecord"> | number
    userId?: IntWithAggregatesFilter<"AudioRecord"> | number
    language?: StringWithAggregatesFilter<"AudioRecord"> | string
    transcript?: StringNullableWithAggregatesFilter<"AudioRecord"> | string | null
    pronunciationScore?: FloatNullableWithAggregatesFilter<"AudioRecord"> | number | null
    feedback?: StringNullableWithAggregatesFilter<"AudioRecord"> | string | null
    audioUrl?: StringNullableWithAggregatesFilter<"AudioRecord"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AudioRecord"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AudioRecord"> | Date | string
  }

  export type TaskWhereInput = {
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    id?: IntFilter<"Task"> | number
    language?: StringFilter<"Task"> | string
    level?: StringFilter<"Task"> | string
    skill?: StringFilter<"Task"> | string
    prompt?: StringFilter<"Task"> | string
    audioUrl?: StringNullableFilter<"Task"> | string | null
    referenceText?: StringNullableFilter<"Task"> | string | null
    answerOptions?: StringNullableListFilter<"Task">
    correctAnswer?: StringNullableFilter<"Task"> | string | null
    questionsJson?: StringNullableFilter<"Task"> | string | null
    createdAt?: DateTimeFilter<"Task"> | Date | string
    listeningScores?: ListeningScoreListRelationFilter
  }

  export type TaskOrderByWithRelationInput = {
    id?: SortOrder
    language?: SortOrder
    level?: SortOrder
    skill?: SortOrder
    prompt?: SortOrder
    audioUrl?: SortOrderInput | SortOrder
    referenceText?: SortOrderInput | SortOrder
    answerOptions?: SortOrder
    correctAnswer?: SortOrderInput | SortOrder
    questionsJson?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    listeningScores?: ListeningScoreOrderByRelationAggregateInput
  }

  export type TaskWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    language?: StringFilter<"Task"> | string
    level?: StringFilter<"Task"> | string
    skill?: StringFilter<"Task"> | string
    prompt?: StringFilter<"Task"> | string
    audioUrl?: StringNullableFilter<"Task"> | string | null
    referenceText?: StringNullableFilter<"Task"> | string | null
    answerOptions?: StringNullableListFilter<"Task">
    correctAnswer?: StringNullableFilter<"Task"> | string | null
    questionsJson?: StringNullableFilter<"Task"> | string | null
    createdAt?: DateTimeFilter<"Task"> | Date | string
    listeningScores?: ListeningScoreListRelationFilter
  }, "id">

  export type TaskOrderByWithAggregationInput = {
    id?: SortOrder
    language?: SortOrder
    level?: SortOrder
    skill?: SortOrder
    prompt?: SortOrder
    audioUrl?: SortOrderInput | SortOrder
    referenceText?: SortOrderInput | SortOrder
    answerOptions?: SortOrder
    correctAnswer?: SortOrderInput | SortOrder
    questionsJson?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: TaskCountOrderByAggregateInput
    _avg?: TaskAvgOrderByAggregateInput
    _max?: TaskMaxOrderByAggregateInput
    _min?: TaskMinOrderByAggregateInput
    _sum?: TaskSumOrderByAggregateInput
  }

  export type TaskScalarWhereWithAggregatesInput = {
    AND?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    OR?: TaskScalarWhereWithAggregatesInput[]
    NOT?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Task"> | number
    language?: StringWithAggregatesFilter<"Task"> | string
    level?: StringWithAggregatesFilter<"Task"> | string
    skill?: StringWithAggregatesFilter<"Task"> | string
    prompt?: StringWithAggregatesFilter<"Task"> | string
    audioUrl?: StringNullableWithAggregatesFilter<"Task"> | string | null
    referenceText?: StringNullableWithAggregatesFilter<"Task"> | string | null
    answerOptions?: StringNullableListFilter<"Task">
    correctAnswer?: StringNullableWithAggregatesFilter<"Task"> | string | null
    questionsJson?: StringNullableWithAggregatesFilter<"Task"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
  }

  export type ListeningScoreWhereInput = {
    AND?: ListeningScoreWhereInput | ListeningScoreWhereInput[]
    OR?: ListeningScoreWhereInput[]
    NOT?: ListeningScoreWhereInput | ListeningScoreWhereInput[]
    id?: IntFilter<"ListeningScore"> | number
    userId?: IntFilter<"ListeningScore"> | number
    taskId?: IntFilter<"ListeningScore"> | number
    score?: FloatFilter<"ListeningScore"> | number
    createdAt?: DateTimeFilter<"ListeningScore"> | Date | string
    updatedAt?: DateTimeFilter<"ListeningScore"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }

  export type ListeningScoreOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    task?: TaskOrderByWithRelationInput
  }

  export type ListeningScoreWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    userId_taskId?: ListeningScoreUserIdTaskIdCompoundUniqueInput
    AND?: ListeningScoreWhereInput | ListeningScoreWhereInput[]
    OR?: ListeningScoreWhereInput[]
    NOT?: ListeningScoreWhereInput | ListeningScoreWhereInput[]
    userId?: IntFilter<"ListeningScore"> | number
    taskId?: IntFilter<"ListeningScore"> | number
    score?: FloatFilter<"ListeningScore"> | number
    createdAt?: DateTimeFilter<"ListeningScore"> | Date | string
    updatedAt?: DateTimeFilter<"ListeningScore"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }, "id" | "userId_taskId">

  export type ListeningScoreOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ListeningScoreCountOrderByAggregateInput
    _avg?: ListeningScoreAvgOrderByAggregateInput
    _max?: ListeningScoreMaxOrderByAggregateInput
    _min?: ListeningScoreMinOrderByAggregateInput
    _sum?: ListeningScoreSumOrderByAggregateInput
  }

  export type ListeningScoreScalarWhereWithAggregatesInput = {
    AND?: ListeningScoreScalarWhereWithAggregatesInput | ListeningScoreScalarWhereWithAggregatesInput[]
    OR?: ListeningScoreScalarWhereWithAggregatesInput[]
    NOT?: ListeningScoreScalarWhereWithAggregatesInput | ListeningScoreScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ListeningScore"> | number
    userId?: IntWithAggregatesFilter<"ListeningScore"> | number
    taskId?: IntWithAggregatesFilter<"ListeningScore"> | number
    score?: FloatWithAggregatesFilter<"ListeningScore"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ListeningScore"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ListeningScore"> | Date | string
  }

  export type AudioRecordCreateInput = {
    userId: number
    language: string
    transcript?: string | null
    pronunciationScore?: number | null
    feedback?: string | null
    audioUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AudioRecordUncheckedCreateInput = {
    id?: number
    userId: number
    language: string
    transcript?: string | null
    pronunciationScore?: number | null
    feedback?: string | null
    audioUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AudioRecordUpdateInput = {
    userId?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    pronunciationScore?: NullableFloatFieldUpdateOperationsInput | number | null
    feedback?: NullableStringFieldUpdateOperationsInput | string | null
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AudioRecordUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    pronunciationScore?: NullableFloatFieldUpdateOperationsInput | number | null
    feedback?: NullableStringFieldUpdateOperationsInput | string | null
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AudioRecordCreateManyInput = {
    id?: number
    userId: number
    language: string
    transcript?: string | null
    pronunciationScore?: number | null
    feedback?: string | null
    audioUrl?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AudioRecordUpdateManyMutationInput = {
    userId?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    pronunciationScore?: NullableFloatFieldUpdateOperationsInput | number | null
    feedback?: NullableStringFieldUpdateOperationsInput | string | null
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AudioRecordUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    transcript?: NullableStringFieldUpdateOperationsInput | string | null
    pronunciationScore?: NullableFloatFieldUpdateOperationsInput | number | null
    feedback?: NullableStringFieldUpdateOperationsInput | string | null
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateInput = {
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl?: string | null
    referenceText?: string | null
    answerOptions?: TaskCreateanswerOptionsInput | string[]
    correctAnswer?: string | null
    questionsJson?: string | null
    createdAt?: Date | string
    listeningScores?: ListeningScoreCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateInput = {
    id?: number
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl?: string | null
    referenceText?: string | null
    answerOptions?: TaskCreateanswerOptionsInput | string[]
    correctAnswer?: string | null
    questionsJson?: string | null
    createdAt?: Date | string
    listeningScores?: ListeningScoreUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskUpdateInput = {
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listeningScores?: ListeningScoreUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    listeningScores?: ListeningScoreUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type TaskCreateManyInput = {
    id?: number
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl?: string | null
    referenceText?: string | null
    answerOptions?: TaskCreateanswerOptionsInput | string[]
    correctAnswer?: string | null
    questionsJson?: string | null
    createdAt?: Date | string
  }

  export type TaskUpdateManyMutationInput = {
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreCreateInput = {
    userId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
    task: TaskCreateNestedOneWithoutListeningScoresInput
  }

  export type ListeningScoreUncheckedCreateInput = {
    id?: number
    userId: number
    taskId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListeningScoreUpdateInput = {
    userId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutListeningScoresNestedInput
  }

  export type ListeningScoreUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    taskId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreCreateManyInput = {
    id?: number
    userId: number
    taskId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListeningScoreUpdateManyMutationInput = {
    userId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    taskId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AudioRecordCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    language?: SortOrder
    transcript?: SortOrder
    pronunciationScore?: SortOrder
    feedback?: SortOrder
    audioUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AudioRecordAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    pronunciationScore?: SortOrder
  }

  export type AudioRecordMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    language?: SortOrder
    transcript?: SortOrder
    pronunciationScore?: SortOrder
    feedback?: SortOrder
    audioUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AudioRecordMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    language?: SortOrder
    transcript?: SortOrder
    pronunciationScore?: SortOrder
    feedback?: SortOrder
    audioUrl?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AudioRecordSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    pronunciationScore?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type ListeningScoreListRelationFilter = {
    every?: ListeningScoreWhereInput
    some?: ListeningScoreWhereInput
    none?: ListeningScoreWhereInput
  }

  export type ListeningScoreOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskCountOrderByAggregateInput = {
    id?: SortOrder
    language?: SortOrder
    level?: SortOrder
    skill?: SortOrder
    prompt?: SortOrder
    audioUrl?: SortOrder
    referenceText?: SortOrder
    answerOptions?: SortOrder
    correctAnswer?: SortOrder
    questionsJson?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type TaskMaxOrderByAggregateInput = {
    id?: SortOrder
    language?: SortOrder
    level?: SortOrder
    skill?: SortOrder
    prompt?: SortOrder
    audioUrl?: SortOrder
    referenceText?: SortOrder
    correctAnswer?: SortOrder
    questionsJson?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskMinOrderByAggregateInput = {
    id?: SortOrder
    language?: SortOrder
    level?: SortOrder
    skill?: SortOrder
    prompt?: SortOrder
    audioUrl?: SortOrder
    referenceText?: SortOrder
    correctAnswer?: SortOrder
    questionsJson?: SortOrder
    createdAt?: SortOrder
  }

  export type TaskSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type TaskScalarRelationFilter = {
    is?: TaskWhereInput
    isNot?: TaskWhereInput
  }

  export type ListeningScoreUserIdTaskIdCompoundUniqueInput = {
    userId: number
    taskId: number
  }

  export type ListeningScoreCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListeningScoreAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
  }

  export type ListeningScoreMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListeningScoreMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ListeningScoreSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    taskId?: SortOrder
    score?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type TaskCreateanswerOptionsInput = {
    set: string[]
  }

  export type ListeningScoreCreateNestedManyWithoutTaskInput = {
    create?: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput> | ListeningScoreCreateWithoutTaskInput[] | ListeningScoreUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: ListeningScoreCreateOrConnectWithoutTaskInput | ListeningScoreCreateOrConnectWithoutTaskInput[]
    createMany?: ListeningScoreCreateManyTaskInputEnvelope
    connect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
  }

  export type ListeningScoreUncheckedCreateNestedManyWithoutTaskInput = {
    create?: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput> | ListeningScoreCreateWithoutTaskInput[] | ListeningScoreUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: ListeningScoreCreateOrConnectWithoutTaskInput | ListeningScoreCreateOrConnectWithoutTaskInput[]
    createMany?: ListeningScoreCreateManyTaskInputEnvelope
    connect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
  }

  export type TaskUpdateanswerOptionsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type ListeningScoreUpdateManyWithoutTaskNestedInput = {
    create?: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput> | ListeningScoreCreateWithoutTaskInput[] | ListeningScoreUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: ListeningScoreCreateOrConnectWithoutTaskInput | ListeningScoreCreateOrConnectWithoutTaskInput[]
    upsert?: ListeningScoreUpsertWithWhereUniqueWithoutTaskInput | ListeningScoreUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: ListeningScoreCreateManyTaskInputEnvelope
    set?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    disconnect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    delete?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    connect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    update?: ListeningScoreUpdateWithWhereUniqueWithoutTaskInput | ListeningScoreUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: ListeningScoreUpdateManyWithWhereWithoutTaskInput | ListeningScoreUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: ListeningScoreScalarWhereInput | ListeningScoreScalarWhereInput[]
  }

  export type ListeningScoreUncheckedUpdateManyWithoutTaskNestedInput = {
    create?: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput> | ListeningScoreCreateWithoutTaskInput[] | ListeningScoreUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: ListeningScoreCreateOrConnectWithoutTaskInput | ListeningScoreCreateOrConnectWithoutTaskInput[]
    upsert?: ListeningScoreUpsertWithWhereUniqueWithoutTaskInput | ListeningScoreUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: ListeningScoreCreateManyTaskInputEnvelope
    set?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    disconnect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    delete?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    connect?: ListeningScoreWhereUniqueInput | ListeningScoreWhereUniqueInput[]
    update?: ListeningScoreUpdateWithWhereUniqueWithoutTaskInput | ListeningScoreUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: ListeningScoreUpdateManyWithWhereWithoutTaskInput | ListeningScoreUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: ListeningScoreScalarWhereInput | ListeningScoreScalarWhereInput[]
  }

  export type TaskCreateNestedOneWithoutListeningScoresInput = {
    create?: XOR<TaskCreateWithoutListeningScoresInput, TaskUncheckedCreateWithoutListeningScoresInput>
    connectOrCreate?: TaskCreateOrConnectWithoutListeningScoresInput
    connect?: TaskWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type TaskUpdateOneRequiredWithoutListeningScoresNestedInput = {
    create?: XOR<TaskCreateWithoutListeningScoresInput, TaskUncheckedCreateWithoutListeningScoresInput>
    connectOrCreate?: TaskCreateOrConnectWithoutListeningScoresInput
    upsert?: TaskUpsertWithoutListeningScoresInput
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutListeningScoresInput, TaskUpdateWithoutListeningScoresInput>, TaskUncheckedUpdateWithoutListeningScoresInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type ListeningScoreCreateWithoutTaskInput = {
    userId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListeningScoreUncheckedCreateWithoutTaskInput = {
    id?: number
    userId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListeningScoreCreateOrConnectWithoutTaskInput = {
    where: ListeningScoreWhereUniqueInput
    create: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput>
  }

  export type ListeningScoreCreateManyTaskInputEnvelope = {
    data: ListeningScoreCreateManyTaskInput | ListeningScoreCreateManyTaskInput[]
    skipDuplicates?: boolean
  }

  export type ListeningScoreUpsertWithWhereUniqueWithoutTaskInput = {
    where: ListeningScoreWhereUniqueInput
    update: XOR<ListeningScoreUpdateWithoutTaskInput, ListeningScoreUncheckedUpdateWithoutTaskInput>
    create: XOR<ListeningScoreCreateWithoutTaskInput, ListeningScoreUncheckedCreateWithoutTaskInput>
  }

  export type ListeningScoreUpdateWithWhereUniqueWithoutTaskInput = {
    where: ListeningScoreWhereUniqueInput
    data: XOR<ListeningScoreUpdateWithoutTaskInput, ListeningScoreUncheckedUpdateWithoutTaskInput>
  }

  export type ListeningScoreUpdateManyWithWhereWithoutTaskInput = {
    where: ListeningScoreScalarWhereInput
    data: XOR<ListeningScoreUpdateManyMutationInput, ListeningScoreUncheckedUpdateManyWithoutTaskInput>
  }

  export type ListeningScoreScalarWhereInput = {
    AND?: ListeningScoreScalarWhereInput | ListeningScoreScalarWhereInput[]
    OR?: ListeningScoreScalarWhereInput[]
    NOT?: ListeningScoreScalarWhereInput | ListeningScoreScalarWhereInput[]
    id?: IntFilter<"ListeningScore"> | number
    userId?: IntFilter<"ListeningScore"> | number
    taskId?: IntFilter<"ListeningScore"> | number
    score?: FloatFilter<"ListeningScore"> | number
    createdAt?: DateTimeFilter<"ListeningScore"> | Date | string
    updatedAt?: DateTimeFilter<"ListeningScore"> | Date | string
  }

  export type TaskCreateWithoutListeningScoresInput = {
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl?: string | null
    referenceText?: string | null
    answerOptions?: TaskCreateanswerOptionsInput | string[]
    correctAnswer?: string | null
    questionsJson?: string | null
    createdAt?: Date | string
  }

  export type TaskUncheckedCreateWithoutListeningScoresInput = {
    id?: number
    language: string
    level: string
    skill: string
    prompt: string
    audioUrl?: string | null
    referenceText?: string | null
    answerOptions?: TaskCreateanswerOptionsInput | string[]
    correctAnswer?: string | null
    questionsJson?: string | null
    createdAt?: Date | string
  }

  export type TaskCreateOrConnectWithoutListeningScoresInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutListeningScoresInput, TaskUncheckedCreateWithoutListeningScoresInput>
  }

  export type TaskUpsertWithoutListeningScoresInput = {
    update: XOR<TaskUpdateWithoutListeningScoresInput, TaskUncheckedUpdateWithoutListeningScoresInput>
    create: XOR<TaskCreateWithoutListeningScoresInput, TaskUncheckedCreateWithoutListeningScoresInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutListeningScoresInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutListeningScoresInput, TaskUncheckedUpdateWithoutListeningScoresInput>
  }

  export type TaskUpdateWithoutListeningScoresInput = {
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateWithoutListeningScoresInput = {
    id?: IntFieldUpdateOperationsInput | number
    language?: StringFieldUpdateOperationsInput | string
    level?: StringFieldUpdateOperationsInput | string
    skill?: StringFieldUpdateOperationsInput | string
    prompt?: StringFieldUpdateOperationsInput | string
    audioUrl?: NullableStringFieldUpdateOperationsInput | string | null
    referenceText?: NullableStringFieldUpdateOperationsInput | string | null
    answerOptions?: TaskUpdateanswerOptionsInput | string[]
    correctAnswer?: NullableStringFieldUpdateOperationsInput | string | null
    questionsJson?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreCreateManyTaskInput = {
    id?: number
    userId: number
    score: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ListeningScoreUpdateWithoutTaskInput = {
    userId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreUncheckedUpdateWithoutTaskInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ListeningScoreUncheckedUpdateManyWithoutTaskInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    score?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}