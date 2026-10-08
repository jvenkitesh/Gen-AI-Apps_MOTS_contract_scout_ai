"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setIsSubmitting(false);
    const body = await res.json().catch(() => null);
    setError(body?.message ?? "Something went wrong. Please try again.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-grey-25 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8">
        <h1 className="text-h5 text-grey-900">Log in</h1>

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
              autoComplete="current-password"
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between text-body-sm">
          <Link href="/reset-password" className="text-blue-500 hover:underline">
            Forgot password?
          </Link>
          <Link href="/signup" className="text-blue-500 hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </main>
  );
}
