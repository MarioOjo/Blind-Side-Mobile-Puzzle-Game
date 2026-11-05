// Thin wrapper around the native Google Sign-In module. The module only exists in EAS
// builds (not Expo Go), so it is loaded defensively and the UI hides Google when absent.
let nativeModule = null;
try {
  nativeModule = require('@react-native-google-signin/google-signin');
} catch {
  nativeModule = null;
}

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleSignInAvailable = Boolean(nativeModule && webClientId);

let isConfigured = false;

function getGoogleSignin() {
  if (!isGoogleSignInAvailable) {
    throw Object.assign(new Error('Google Sign-In is unavailable in this build.'), {
      code: 'auth/google-not-configured',
    });
  }
  if (!isConfigured) {
    // The web client ID makes Google issue an ID token that Firebase Auth accepts.
    nativeModule.GoogleSignin.configure({ webClientId });
    isConfigured = true;
  }
  return nativeModule.GoogleSignin;
}

// Maps native error codes onto auth-style codes that getAuthErrorMessage understands.
function toAuthError(error) {
  const { statusCodes } = nativeModule;
  const codes = {
    [statusCodes.PLAY_SERVICES_NOT_AVAILABLE]: 'auth/google-play-services',
    [statusCodes.IN_PROGRESS]: 'auth/google-in-progress',
    // Android reports a missing or mismatched SHA-1 / client ID as DEVELOPER_ERROR (10).
    DEVELOPER_ERROR: 'auth/google-not-configured',
    10: 'auth/google-not-configured',
  };
  const code = codes[error?.code];
  return code ? Object.assign(new Error(error.message), { code }) : error;
}

// Opens the Google account picker and returns an ID token, or null if the player closed it.
export async function requestGoogleIdToken() {
  const GoogleSignin = getGoogleSignin();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return null;
    return response.data.idToken;
  } catch (error) {
    if (error?.code === nativeModule.statusCodes.SIGN_IN_CANCELLED) return null;
    throw toAuthError(error);
  }
}

// Clears the cached Google account so the next sign-in shows the account picker again.
export async function signOutOfGoogle() {
  if (!isGoogleSignInAvailable) return;
  try {
    await getGoogleSignin().signOut();
  } catch (error) {
    console.warn('Unable to sign out of Google.', error);
  }
}
