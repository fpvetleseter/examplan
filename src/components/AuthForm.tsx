"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  CONFIRMATION_REQUIRED_MESSAGE,
  loginErrorMessage,
  NETWORK_MESSAGE,
  signupErrorMessage,
} from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 6;
const SLOW_MS = 8000;

const slowMessage = {
  signup:
    "Creating your account is taking longer than usual. You can try again: if the account was already created, you'll be told to log in instead, so no duplicate is made.",
  login: "Logging in is taking longer than usual. Check your connection and try again.",
} as const;

const copy = {
  signup: {
    submit: "Create account",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
    autocomplete: "new-password",
  },
  login: {
    submit: "Log in",
    pending: "Logging in…",
    switchText: "New to ExamPlan?",
    switchLink: "Sign up",
    switchHref: "/signup",
    autocomplete: "current-password",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest attempt may update the form; a slow earlier one can still finish and navigate.
  const attempt = useRef(0);
  // Synchronous guard: a double click can submit twice before the disabled state renders.
  const inFlight = useRef(false);
  const t = copy[mode];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const trimmed = email.trim();
    if (!EMAIL.test(trimmed)) {
      setError("Enter a valid email address, like name@student.ie.edu.");
      return;
    }
    if (mode === "signup" && password.length < PASSWORD_MIN) {
      setError(`Your password needs at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (mode === "login" && password.length === 0) {
      setError("Enter your password.");
      return;
    }

    const current = ++attempt.current;
    inFlight.current = true;
    setPending(true);
    setError(null);
    const slow = window.setTimeout(() => {
      if (attempt.current !== current) return;
      attempt.current++;
      inFlight.current = false;
      setError(slowMessage[mode]);
      setPending(false);
    }, SLOW_MS);
    try {
      // Called from the browser so Supabase rate limits apply to the real user's IP.
      const supabase = createClient();
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email: trimmed, password })
          : await supabase.auth.signInWithPassword({ email: trimmed, password });
      window.clearTimeout(slow);
      if (!error && data.session) {
        // A real session, even from a slow attempt, is a successful sign-in.
        // Full navigation so the server re-renders the header and /app with the new session cookies.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/app");
        return;
      }
      if (attempt.current !== current) return;
      inFlight.current = false;
      if (error) setError(mode === "signup" ? signupErrorMessage(error) : loginErrorMessage(error));
      else setError(mode === "signup" ? CONFIRMATION_REQUIRED_MESSAGE : loginErrorMessage(null));
      setPending(false);
    } catch {
      window.clearTimeout(slow);
      if (attempt.current !== current) return;
      inFlight.current = false;
      setError(NETWORK_MESSAGE);
      setPending(false);
    }
  }

  const errorId = `${id}-error`;
  const field =
    "mt-1 block min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 aria-invalid:border-red-600";

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor={`${id}-email`} className="block text-sm font-medium text-stone-900">
          Email
        </label>
        <input
          id={`${id}-email`}
          data-testid={`${mode}-email`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className="block text-sm font-medium text-stone-900">
          Password
        </label>
        <input
          id={`${id}-password`}
          data-testid={`${mode}-password`}
          type="password"
          name="password"
          autoComplete={t.autocomplete}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={mode === "signup" ? `${id}-password-hint` : undefined}
          className={field}
        />
        {mode === "signup" && (
          <p id={`${id}-password-hint`} className="mt-1 text-sm text-stone-600">
            At least {PASSWORD_MIN} characters. A longer passphrase is safer.
          </p>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-testid={`${mode}-submit`}
        disabled={pending}
        aria-busy={pending}
        className="min-h-12 w-full rounded-lg bg-emerald-800 px-4 text-base font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        {pending ? t.pending : t.submit}
      </button>
      <p className="text-sm text-stone-600">
        {t.switchText}{" "}
        <Link href={t.switchHref} className="font-medium text-stone-900 underline underline-offset-4">
          {t.switchLink}
        </Link>
      </p>
    </form>
  );
}
