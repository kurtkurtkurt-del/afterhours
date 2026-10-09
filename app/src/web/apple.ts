// Web stand-in for expo-apple-authentication: never available, so the native button stays hidden.
export const AppleAuthenticationScope = { FULL_NAME: 0, EMAIL: 1 };
export const AppleAuthenticationButtonType = {};
export const AppleAuthenticationButtonStyle = {};
export type AppleAuthenticationCredential = { identityToken: string | null; authorizationCode: string | null; fullName: null };

export async function isAvailableAsync() {
  return false;
}

export async function signInAsync(): Promise<AppleAuthenticationCredential> {
  throw new Error('Sign in with Apple is not available in the browser.');
}

export function AppleAuthenticationButton() {
  return null;
}
