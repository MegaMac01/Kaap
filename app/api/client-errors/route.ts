import { NextResponse } from "next/server";

/**
 * First-party error sink: the client error boundary POSTs here so crashes show
 * up in the host's server logs (e.g. Vercel → Logs) instead of vanishing in
 * users' consoles. Swap for a real error service (Sentry etc.) when one exists.
 */

const MAX_FIELD = 2000;

function clip(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_FIELD) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error("[kaap] client error", {
      message: clip(body.message),
      digest: clip(body.digest),
      url: clip(body.url),
      stack: clip(body.stack),
    });
  } catch {
    // Malformed report; nothing useful to log.
  }
  return new NextResponse(null, { status: 204 });
}
