export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-white px-4 py-24 text-center sm:px-28">
      <span className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-0.5 text-body-sm font-medium text-blue-700">
        Powered by OpenAI GPT-4o
      </span>

      <h1 className="text-h2 text-grey-900 sm:text-h1">
        Know what you&apos;re signing.
        <br />
        In minutes, not hours.
      </h1>

      <p className="max-w-xl text-body-lg text-grey-500">
        MOTS_contract_scout.ai reads your NDAs and MSAs, extracts the terms that matter,
        shows you exactly where each one lives in the document, and answers
        your follow-up questions -- grounded in your contract, never a guess.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href="/signup"
          className="rounded-md bg-blue-500 px-8 py-3 text-body-lg font-medium text-white transition hover:bg-blue-600"
        >
          Start free -- 5 contracts, 14 days
        </a>
        <a
          href="/login"
          className="rounded-md border border-grey-200 px-8 py-3 text-body-lg font-medium text-grey-900 transition hover:bg-grey-50"
        >
          Log in
        </a>
      </div>

      <p className="text-body-sm text-grey-400">
        Not legal advice. Every answer is cited to a page in your document.
      </p>
    </main>
  );
}
