export type AuthErrorCode = 'unauthorized' | 'forbidden';

export type AuthErrorResponse = {
  ok: false;
  error: AuthErrorCode;
  message: string;
};
