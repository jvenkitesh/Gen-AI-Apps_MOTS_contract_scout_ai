"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setIsSubmitting(false);

    if (res.ok) {
      setSubmitted(true);
      return;
    }

    const body = await res.json().catch(() => null);
    setError(body?.message ?? "Something went wrong. Please try again.");
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center">
          <h1 className="text-h5 text-grey-900">Check your email</h1>
          <p className="mt-2 text-body-sm text-grey-500">
            We sent a verification link to <strong>{email}</strong>. Click it to
            activate your account, then log in.
          </p>
          <Link href="/login" className="mt-4 inline-block text-body-sm text-blue-500 hover:underline">
            Back to log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8">
        <h1 className="text-h5 text-grey-900">Sign up</h1>
        <p className="mt-2 text-body-sm text-grey-500">Start free -- 5 contracts, 14 days.</p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-body-sm font-medium text-grey-900">
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-body-sm font-medium text-grey-900">
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-body-sm text-grey-400">At least 8 characters.</p>
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </div>

        <p className="mt-6 text-center text-body-sm text-grey-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
