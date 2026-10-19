type AuthErrorLike = { status?: number; code?: string; message?: string; name?: string } | null | undefined;

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a minute and try again.";
export const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

function isRateLimit(error: NonNullable<AuthErrorLike>) {
  return error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit";
}

function isNetwork(error: NonNullable<AuthErrorLike>) {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export function loginErrorMessage(error: AuthErrorLike): string {
  if (!error) return "Something went wrong. Please try again.";
  if (isRateLimit(error)) return RATE_LIMIT_MESSAGE;
  if (isNetwork(error)) return NETWORK_MESSAGE;
  // Neutral wording: never reveal whether an account exists.
  return "That email and password combination didn't work. Check both and try again.";
}

export function signupErrorMessage(error: AuthErrorLike): string {
  if (!error) return "Something went wrong. Please try again.";
  if (isRateLimit(error)) return RATE_LIMIT_MESSAGE;
  if (isNetwork(error)) return NETWORK_MESSAGE;
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Log in instead.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
    case "email_address_invalid":
    case "validation_failed":
      return "Enter a valid email address.";
    case "signup_disabled":
      return "Sign-ups are currently turned off. Please try again later.";
  }
  if (error.status === 422 || error.status === 400) return "Check your email and password and try again.";
  return "We couldn't create your account. Please try again.";
}

export const CONFIRMATION_REQUIRED_MESSAGE =
  "Your account was created, but this app's Supabase project still requires email confirmation, so you weren't signed in. The app owner needs to turn off “Confirm email” in Supabase Auth settings.";
