"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    // Always show the same success message, whether or not the account
    // exists -- never leak account existence via this flow.
    setIsSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center">
          <h1 className="text-h5 text-grey-900">Check your email</h1>
          <p className="mt-2 text-body-sm text-grey-500">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a
            password reset link.
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
        <h1 className="text-h5 text-grey-900">Reset password</h1>
        <p className="mt-2 text-body-sm text-grey-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </div>

        <p className="mt-6 text-center text-body-sm text-grey-500">
          <Link href="/login" className="text-blue-500 hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </main>
  );
}
