"use client";

import { useState, useTransition } from "react";
import { sendTestEmail } from "@/app/admin/emails/actions";
import { Btn, useToast } from "./ui";

type Mail = { id: "client" | "owner"; label: string; subject: string; html: string };

/** The real email HTML in a sandboxed frame, at computer or phone width, plus a test send. */
export function EmailPreview({ emails }: { emails: Mail[] }) {
  const [which, setWhich] = useState<Mail["id"]>("client");
  const [phone, setPhone] = useState(false);
  const [busy, start] = useTransition();
  const toast = useToast();
  const mail = emails.find((m) => m.id === which)!;
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        {emails.map((m) => (
          <Btn key={m.id} size="sm" variant={m.id === which ? "primary" : "secondary"} onClick={() => setWhich(m.id)} aria-pressed={m.id === which}>
            {m.label}
          </Btn>
        ))}
        <span className="mx-2 h-6 w-px bg-line" aria-hidden />
        <Btn size="sm" variant={!phone ? "primary" : "secondary"} onClick={() => setPhone(false)} aria-pressed={!phone}>
          Computer
        </Btn>
        <Btn size="sm" variant={phone ? "primary" : "secondary"} onClick={() => setPhone(true)} aria-pressed={phone}>
          Phone
        </Btn>
        <Btn
          size="sm"
          variant="clay"
          className="ml-auto"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await sendTestEmail(which);
              toast(r.message, r.ok ? undefined : "error");
            })
          }
          data-testid="send-test-email"
        >
          {busy ? "Sending…" : "Send me a test"}
        </Btn>
      </div>
      <p className="mt-4 text-sm">
        <span className="text-muted">Subject:</span> <strong data-testid="email-subject">{mail.subject}</strong>
      </p>
      <div className="mt-3 rounded-2xl border border-line bg-parchment p-3 sm:p-6">
        <iframe
          key={`${which}-${phone}`}
          title={`${mail.label} preview`}
          srcDoc={mail.html}
          // Same-origin (scripts stay blocked) only so the frame can grow to the email's full height.
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={(e) => {
            const f = e.currentTarget;
            const fit = () => {
              const h = f.contentDocument?.documentElement.scrollHeight;
              if (h) f.style.height = `${h + 8}px`;
            };
            fit();
            window.setTimeout(fit, 600); // again once the web fonts are in
          }}
          className="mx-auto block h-[1400px] w-full rounded-xl bg-[#F6F2EA] transition-[max-width]"
          style={{ maxWidth: phone ? 390 : 680 }}
          data-testid="email-frame"
        />
      </div>
    </section>
  );
}
