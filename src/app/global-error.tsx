"use client";

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on the
 * app's fonts, shell, or CSS being present. Everything here is inline.
 */
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
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          backgroundColor: "#FAF9F6",
          color: "#16181D",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#0F5F52" }}>Cubitora</p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem", lineHeight: 1.2 }}>
            The app failed to load
          </h1>
          <p style={{ color: "#5B6270", lineHeight: 1.6 }}>
            Your saved projects live in this browser and have not been lost. Reloading usually
            fixes it.
          </p>
          {error.digest ? (
            <p style={{ color: "#626A78", fontSize: "0.8125rem", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.7rem 1.2rem",
              borderRadius: "0.625rem",
              border: "none",
              background: "#0F5F52",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
