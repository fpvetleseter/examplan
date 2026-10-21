import Link from "next/link";
import { Suspense } from "react";
import { Backdrop } from "@/components/Backdrop";
import { getVerifiedUser } from "@/lib/supabase/auth";

const primary = "btn btn-primary min-h-12 px-6 text-base";

function SignupCta() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Link href="/signup" className={primary}>
        Sign up free
      </Link>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="link font-medium">
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

const steps = [
  ["Save an exam", "Just the name is enough. We start you with a date in 14 days and 30 minutes a day."],
  ["Add date and syllabus", "Set the date and daily minutes, then paste or upload your syllabus (or list topics) and pick the sessions the exam covers."],
  ["Build a study plan", "Get a day-by-day plan with practice in your exam's format and a light final review. Rebuild it whenever things change."],
];

export default function Home() {
  return (
    <>
      <Backdrop eager />
      <main className="mx-auto w-full max-w-3xl px-4 pt-14 pb-16 sm:pt-24">
        <h1 className="max-w-2xl text-[2.5rem] leading-[1.08] text-ink sm:text-6xl">Turn your exam dates into a daily study plan.</h1>

        <div className="glass mt-8 max-w-2xl p-6 sm:p-8">
          <p className="text-lg leading-relaxed text-ink">
            Built for law and international relations students. Add your exams and your course syllabus, and ExamPlan shows you
            what to study each day until the exam.
          </p>
          <div className="mt-6">
            <Suspense fallback={<SignupCta />}>
              <HeroAction />
            </Suspense>
          </div>
        </div>

        <section aria-labelledby="how" className="mt-20">
          <h2 id="how" className="text-3xl text-ink">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map(([title, body], i) => (
              <li key={title} className="glass p-5">
                <p className="font-display text-3xl leading-none text-accent" aria-hidden>
                  {i + 1}
                </p>
                <p className="mt-3 font-semibold text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="example" className="mt-20">
          <h2 id="example" className="text-3xl text-ink">
            What a plan looks like <span className="font-serif text-base text-muted">(example, not real data)</span>
          </h2>
          <div className="glass mt-6 p-5 sm:p-6">
            <p className="font-semibold text-ink">Example: Criminal Law midterm · 45 min/day</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>
                <span className="font-semibold text-ink">Mon:</span> Learn: Mens rea. Write a one-page summary in your own words.
              </li>
              <li>
                <span className="font-semibold text-ink">Tue:</span> Practise: Mens rea. Answer questions from memory, then fix gaps.
              </li>
              <li>
                <span className="font-semibold text-ink">Wed:</span> Learn: Actus reus. Write a one-page summary in your own words.
              </li>
              <li>
                <span className="font-semibold text-ink">Day before:</span> Final review across all topics.
              </li>
            </ul>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            Plans are a simple, transparent schedule built only from what you enter or paste. ExamPlan doesn&apos;t know what your professor
            will ask, and it won&apos;t pretend to.
          </p>
        </section>
      </main>
      <footer className="mt-auto border-t border-[var(--glass-border)] bg-[oklch(0.12_0.02_142/0.7)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted">
          <span className="font-display text-base text-ink">ExamPlan</span>
          <span>Daily study plans for IE law and IR students.</span>
        </div>
      </footer>
    </>
  );
}
