import Link from "next/link";
import { Suspense } from "react";
import { getVerifiedUser } from "@/lib/supabase/auth";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-800 px-5 text-base font-semibold text-white hover:bg-emerald-900";

function SignupCta() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Link href="/signup" className={primary}>
        Sign up free
      </Link>
      <p className="text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-stone-900 underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}

async function HeroAction() {
  const user = await getVerifiedUser();
  if (!user) return <SignupCta />;
  return (
    <Link href="/app" className={primary}>
      Open my exams
    </Link>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">For IE law and international relations students</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
        Turn each exam into a daily study plan you can actually finish.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-stone-700">
        Midterms, unread IR readings and a part-time job? Save your exams, set the date, your daily study time and topics, and
        ExamPlan lays out what to study each day until the exam. No uploads, no onboarding, no AI key.
      </p>
      <div className="mt-8">
        <Suspense fallback={<SignupCta />}>
          <HeroAction />
        </Suspense>
      </div>

      <section aria-labelledby="how" className="mt-14">
        <h2 id="how" className="text-xl font-semibold text-stone-900">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Save an exam", "Just the name is enough. We start you with a date in 14 days and 30 minutes a day."],
            ["Set date and topics", "Change the date and daily minutes, and list your topics one per line."],
            ["Build a study plan", "Get a day-by-day template with a final review day. Rebuild it whenever things change."],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-emerald-800">Step {i + 1}</p>
              <p className="mt-1 font-semibold text-stone-900">{title}</p>
              <p className="mt-1 text-sm text-stone-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="example" className="mt-12">
        <h2 id="example" className="text-xl font-semibold text-stone-900">
          What a plan looks like <span className="text-sm font-normal text-stone-500">(example, not real data)</span>
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-4">
          <p className="font-semibold text-stone-900">Example: Criminal Law midterm · 45 min/day</p>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li>
              <span className="font-medium text-stone-900">Mon:</span> Learn: Mens rea. Write a one-page summary in your own words.
            </li>
            <li>
              <span className="font-medium text-stone-900">Tue:</span> Practise: Mens rea. Answer questions from memory, then fix gaps.
            </li>
            <li>
              <span className="font-medium text-stone-900">Wed:</span> Learn: Actus reus. Write a one-page summary in your own words.
            </li>
            <li>
              <span className="font-medium text-stone-900">Day before:</span> Final review across all topics.
            </li>
          </ul>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Plans are a simple, transparent template built from what you enter. ExamPlan doesn&apos;t know your professor or readings, and it
          won&apos;t pretend to.
        </p>
      </section>
    </main>
  );
}
