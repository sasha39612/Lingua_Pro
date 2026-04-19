export const ErrorType = {
  TIMEOUT:                    'timeout',
  QUOTA:                      'quota',
  NETWORK:                    'network',
  PARSE_ERROR:                'parse_error',
  AZURE_UNSUPPORTED_LANGUAGE: 'azure_unsupported_language',
  UNKNOWN:                    'unknown',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export function classifyError(err: unknown): ErrorType {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout'))     return ErrorType.TIMEOUT;
    if (msg.includes('quota'))       return ErrorType.QUOTA;
    if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (msg.includes('unsupported')) return ErrorType.AZURE_UNSUPPORTED_LANGUAGE;
    if (err.name === 'SyntaxError')  return ErrorType.PARSE_ERROR;
  }
  return ErrorType.UNKNOWN;
}
