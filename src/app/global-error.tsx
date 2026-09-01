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
      <body
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-16 text-center"
        style={{ background: "#f3e8ce", color: "#2a2118" }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ fontSize: "0.875rem", color: "#5c4e3c" }}>{error.message}</p>
        <button
          onClick={() => reset()}
          style={{
            borderRadius: "9999px",
            background: "#1b3b4b",
            color: "#f3e8ce",
            padding: "0.5rem 1rem",
            border: "none",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
