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
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ fontSize: "0.875rem", color: "#475569", maxWidth: "28rem", textAlign: "center" }}>
          ContentForge hit an unexpected error{error?.digest ? ` (ref ${error.digest})` : ""}.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.375rem",
            background: "#2563eb",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
