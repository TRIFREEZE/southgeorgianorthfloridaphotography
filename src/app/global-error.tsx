"use client";

/** Last-resort boundary (root layout failed). Keeps its own minimal markup and styles. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-US">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F6F2EA", color: "#252723", padding: "4rem 1.25rem", maxWidth: "40rem", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Something went wrong.</h1>
        <p>Please try again. If it keeps happening, come back in a little while.</p>
        <button type="button" onClick={() => retry()} style={{ minHeight: 48, padding: "0 1.5rem", borderRadius: 999, border: 0, background: "#252723", color: "#FFFCF7", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
