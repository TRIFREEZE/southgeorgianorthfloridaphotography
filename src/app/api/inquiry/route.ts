import { NextResponse, type NextRequest } from "next/server";
import { handleInquiry } from "@/lib/inquiry/service";
import { clientIp, escapeHtml, isSameOrigin } from "@/lib/security";

const MAX_BODY_BYTES = 32_000;

function formToObject(fd: FormData) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (k === "addOns" || k === "inspirationIds") {
      const list = (o[k] as string[] | undefined) ?? [];
      list.push(v);
      o[k] = list;
    } else {
      o[k] = v;
    }
  }
  return o;
}

function htmlPage(title: string, body: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#F6F2EA;color:#252723;max-width:40rem;margin:0 auto;padding:3rem 1.25rem;line-height:1.6}a{color:#8E5A46}h1{font-family:Georgia,serif;font-weight:400}</style></head>
<body><h1>${escapeHtml(title)}</h1>${body}<p><a href="javascript:history.back()">Go back to the form</a> (your answers should still be there).</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");

  if (!isSameOrigin(req.headers, req.nextUrl.host)) {
    return NextResponse.json({ ok: false, message: "Cross-site submissions aren't accepted." }, { status: 403 });
  }
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "That message is too large." }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = wantsJson ? await req.json() : formToObject(await req.formData());
  } catch {
    return NextResponse.json({ ok: false, message: "We couldn't read that submission." }, { status: 400 });
  }

  const result = await handleInquiry(raw, { ip: clientIp(req.headers), userAgent: req.headers.get("user-agent") });

  if (wantsJson) {
    if (result.ok) return NextResponse.json({ ok: true, ref: result.ref }, { headers: { "cache-control": "no-store" } });
    return NextResponse.json({ ok: false, message: result.message, fields: result.fields }, { status: result.status, headers: { "cache-control": "no-store" } });
  }

  // No-JavaScript fallback: redirect on success, readable HTML on error.
  if (result.ok) return NextResponse.redirect(new URL(`/book/thanks?ref=${encodeURIComponent(result.ref)}`, req.url), 303);
  const list = result.fields
    ? `<ul>${Object.values(result.fields)
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul>`
    : "";
  return htmlPage("We couldn't send that yet", `<p>${escapeHtml(result.message)}</p>${list}`, result.status);
}

export function GET() {
  return NextResponse.json({ ok: false, message: "Use POST." }, { status: 405, headers: { allow: "POST" } });
}
