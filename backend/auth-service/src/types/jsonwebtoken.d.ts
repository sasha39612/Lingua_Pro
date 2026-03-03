// Shim to satisfy TypeScript when @types/jsonwebtoken isn't installed
// Install `@types/jsonwebtoken` or add proper dependency in package.json later.

declare module 'jsonwebtoken' {
  import { VerifyOptions, SignOptions } from 'jsonwebtoken';
  interface JwtPayload {
    [key: string]: any;
  }
  function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
  function verify(token: string, secretOrPublicKey: string, options?: VerifyOptions): object | string;
  function decode(token: string, options?: { complete: boolean }): null | { [key: string]: any };
  export { JwtPayload, VerifyOptions, SignOptions };
  export { sign, verify, decode };
  const jsonwebtoken: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };
  export default jsonwebtoken;
}
