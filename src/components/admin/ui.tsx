"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* Small, consistent building blocks for the dashboard. */

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "clay"; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-ink text-gallery hover:bg-ink-soft",
    clay: "bg-clay-deep text-gallery hover:bg-clay",
    secondary: "border border-ink/25 bg-parchment hover:border-ink/60",
    ghost: "hover:bg-sand/50",
    danger: "bg-[#8f3226] text-gallery hover:bg-[#7a2a20]",
  }[variant];
  const s = size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-5";
  return <button type="button" {...props} className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "new" | "changed" | "danger" | "ok" | "muted"; children: React.ReactNode }) {
  const t = {
    neutral: "bg-sand/70 text-ink",
    new: "bg-[#2f5d50] text-gallery",
    changed: "bg-clay-deep text-gallery",
    danger: "bg-[#8f3226] text-gallery",
    ok: "bg-moss-deep text-gallery",
    muted: "bg-ink/70 text-gallery",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${t}`}>{children}</span>;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-semibold ${className}`}>
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

/** Accessible modal built on <dialog>. */
export function Modal({ open, onClose, title, children, wide = false, labelledBy }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const id = labelledBy ?? `m-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      // Only react to this dialog's own events, not a nested dialog's (React propagates them through the tree).
      onClose={(e) => e.target === e.currentTarget && onClose()}
      onCancel={(e) => e.stopPropagation()}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl bg-parchment p-0 text-ink shadow-2xl backdrop:bg-ink/50 ${wide ? "max-w-5xl" : "max-w-lg"}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={id} className="font-display text-[1.4rem] leading-tight">
              {title}
            </h2>
            <Btn variant="secondary" size="sm" onClick={onClose}>
              Close
            </Btn>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Confirmation with an optional "type to confirm" safeguard. */
export function useConfirm() {
  const [state, setState] = useState<null | { title: string; body: React.ReactNode; action: string; danger?: boolean; typeToConfirm?: string; resolve: (ok: boolean) => void }>(null);
  const [typed, setTyped] = useState("");
  const ask = useCallback(
    (o: { title: string; body: React.ReactNode; action: string; danger?: boolean; typeToConfirm?: string }) =>
      new Promise<boolean>((resolve) => {
        setTyped("");
        setState({ ...o, resolve });
      }),
    [],
  );
  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };
  const ui = (
    <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title ?? "Confirm"}>
      {state && (
        <div className="space-y-4">
          <div className="text-ink-soft">{state.body}</div>
          {state.typeToConfirm && (
            <Field label={`Type “${state.typeToConfirm}” to confirm`}>
              <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </Field>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="secondary" onClick={() => close(false)}>
              Cancel
            </Btn>
            <Btn variant={state.danger ? "danger" : "primary"} disabled={Boolean(state.typeToConfirm) && typed.trim() !== state.typeToConfirm} onClick={() => close(true)} data-testid="confirm-ok">
              {state.action}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
  return { ask, ui };
}

/* ------------------------------------------------------------------ toasts */

type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 9000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <p
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${t.tone === "error" ? "bg-[#8f3226] text-gallery" : "bg-ink text-gallery"}`}
          >
            {t.text}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const dollars = (cents: number | null | undefined) => (cents == null ? "" : String(cents / 100));
export const toCents = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
