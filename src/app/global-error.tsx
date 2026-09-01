"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-16 text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-zinc-500">{error.message}</p>
        <button onClick={() => reset()} className="rounded bg-black px-4 py-2 text-white">
          Try again
        </button>
      </body>
    </html>
  );
}
