"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Actor = "client" | "server" | "chain";

interface Frame {
  actor: Actor;
  label: string;
  detail: string;
  code?: string;
  tone?: "neutral" | "pay" | "ok";
}

const FRAMES: Frame[] = [
  { actor: "client", label: "GET /api/premium", detail: "no payment yet", code: "—" },
  {
    actor: "server",
    label: "402 Payment Required",
    detail: "accepts: 0.01 USDC to seller, via escrow gateway",
    code: "402",
    tone: "pay",
  },
  {
    actor: "client",
    label: "sign voucher",
    detail: "EIP-712 (buyer, seller, amount, resource, nonce)",
    code: "sig",
  },
  {
    actor: "client",
    label: "GET /api/premium",
    detail: "X-PAYMENT: eyJ2b3VjaGVy…",
    code: "↻",
    tone: "pay",
  },
  {
    actor: "chain",
    label: "redeem(voucher, sig)",
    detail: "facilitator settles on Arc, USDC buyer → seller",
    code: "tx",
  },
  {
    actor: "server",
    label: "200 OK",
    detail: "X-PAYMENT-RESPONSE: { txHash: 0x9f3a… }",
    code: "200",
    tone: "ok",
  },
];

const ACTOR_META: Record<Actor, { name: string; col: number }> = {
  client: { name: "Client", col: 0 },
  server: { name: "Server", col: 2 },
  chain: { name: "Arc", col: 1 },
};

export function ProtocolFlow() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(reduced ? FRAMES.length - 1 : -1);

  useEffect(() => {
    if (reduced) {
      setActive(FRAMES.length - 1);
      return;
    }
    let i = -1;
    const tick = () => {
      i = (i + 1) % (FRAMES.length + 2); // +2 = a beat of hold before looping
      setActive(i >= FRAMES.length ? FRAMES.length - 1 : i);
    };
    tick();
    const id = setInterval(tick, 1100);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_0_oklch(1_0_0/0.6)_inset,0_18px_50px_-28px_oklch(0.5_0.16_250/0.45)] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-muted)]">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-[var(--color-ok)]" />
          x402 handshake
        </div>
        <div className="flex gap-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {(["client", "chain", "server"] as Actor[]).map((a) => (
            <span key={a}>{ACTOR_META[a].name}</span>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-1.5">
        {FRAMES.map((f, i) => (
          <FrameRow key={i} frame={f} state={frameState(i, active)} />
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-muted)]">
        <span className="font-mono">1 signature, 1 on-chain redeem</span>
        <span className="font-mono">settles in USDC</span>
      </div>
    </div>
  );
}

function frameState(i: number, active: number): "idle" | "active" | "done" {
  if (i === active) return "active";
  if (i < active) return "done";
  return "idle";
}

function FrameRow({ frame, state }: { frame: Frame; state: "idle" | "active" | "done" }) {
  const col = ACTOR_META[frame.actor].col;
  const toneCode =
    frame.tone === "ok"
      ? "text-[var(--color-ok)]"
      : frame.tone === "pay"
        ? "text-[var(--color-accent)]"
        : "text-[var(--color-muted)]";

  return (
    <li
      className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-lg px-2.5 py-2 transition-[background-color,opacity,transform] duration-500"
      style={{
        backgroundColor:
          state === "active" ? "var(--color-surface-2)" : "transparent",
        opacity: state === "idle" ? 0.4 : 1,
        transform: state === "active" ? "translateX(2px)" : "none",
        transitionTimingFunction: "var(--ease-out-expo)",
      }}
    >
      <div className="flex justify-center">
        <span
          className="grid h-3 w-full max-w-[56px] grid-cols-3 items-center"
          aria-hidden
        >
          {[0, 1, 2].map((c) => (
            <span key={c} className="flex justify-center">
              <span
                className="h-2 w-2 rounded-full transition-all duration-500"
                style={{
                  background:
                    c === col
                      ? state === "idle"
                        ? "var(--color-border)"
                        : "var(--color-accent)"
                      : "var(--color-border)",
                  transform: c === col && state === "active" ? "scale(1.5)" : "scale(1)",
                }}
              />
            </span>
          ))}
        </span>
      </div>

      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-[13px] font-semibold text-[var(--color-ink)]">
            {frame.label}
          </div>
          <div className="truncate text-[12px] text-[var(--color-muted)]">
            {frame.detail}
          </div>
        </div>
        <span className={`shrink-0 font-mono text-[12px] font-bold ${toneCode}`}>
          {frame.code}
        </span>
      </div>
    </li>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  const ref = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    ref.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(ref.current!.matches);
    on();
    ref.current.addEventListener("change", on);
    return () => ref.current?.removeEventListener("change", on);
  }, []);
  return useMemo(() => reduced, [reduced]);
}
