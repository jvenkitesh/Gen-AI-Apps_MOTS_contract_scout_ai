import { UploadForm } from "@/components/contracts/UploadForm";

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-10">
      <h1 className="text-h5 text-grey-900">Review a contract</h1>
      <p className="mt-2 text-body-sm text-grey-500">
        Upload an NDA or MSA (PDF, up to 20 pages) to get started.
      </p>
      <div className="mt-6 rounded-lg bg-white p-6">
        <UploadForm />
      </div>
    </main>
  );
}
