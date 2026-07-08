"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { wrapFetchWithPayment } from "x402-arc";
import { arcParams, erc20Abi, gatewayAbi } from "@/lib/client-config";

type Status = { kind: "idle" | "busy" | "ok" | "err"; msg?: string };

export function LiveDemo() {
  const { isConnected, address } = useAccount();
  const { data: wallet } = useWalletClient();
  const publicClient = usePublicClient();

  const [depositAmount, setDepositAmount] = useState("1.00");
  const [escrow, setEscrow] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<Status>({ kind: "idle" });
  const [call, setCall] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<string | null>(null);

  async function refreshEscrow() {
    if (!publicClient || !address) return;
    const bal = await publicClient.readContract({
      address: arcParams.gateway,
      abi: gatewayAbi,
      functionName: "deposits",
      args: [address],
    });
    setEscrow(formatUnits(bal, 6));
  }

  async function fundEscrow() {
    if (!wallet || !address || !publicClient) return;
    setDeposit({ kind: "busy", msg: "Approving, then depositing…" });
    try {
      const amount = parseUnits(depositAmount, 6);
      const approveHash = await wallet.writeContract({
        address: arcParams.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [arcParams.gateway, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      const depHash = await wallet.writeContract({
        address: arcParams.gateway,
        abi: gatewayAbi,
        functionName: "deposit",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: depHash });
      setDeposit({ kind: "ok", msg: `Deposited ${depositAmount} USDC into escrow` });
      await refreshEscrow();
    } catch (e) {
      setDeposit({ kind: "err", msg: friendly(e) });
    }
  }

  async function callPaidApi() {
    if (!wallet || !address) return;
    setCall({ kind: "busy", msg: "Signing voucher, calling API…" });
    setResult(null);
    try {
      const paidFetch = wrapFetchWithPayment(fetch, { wallet, account: address });
      const res = await paidFetch("/api/premium");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setResult(JSON.stringify(body, null, 2));
      setCall({ kind: "ok", msg: "Settled on Arc" });
      await refreshEscrow();
    } catch (e) {
      setCall({ kind: "err", msg: friendly(e) });
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">Run the real handshake</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[var(--color-muted)]">
            Live gateway on {arcParams.name}
            <a
              href={
                arcParams.explorerUrl
                  ? `${arcParams.explorerUrl.replace(/\/$/, "")}/address/${arcParams.gateway}`
                  : undefined
              }
              target="_blank"
              rel="noreferrer"
              className="link-sweep font-mono text-[13px] font-semibold text-[var(--color-ink)]"
            >
              {arcParams.gateway}
            </a>
          </p>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </div>

      {!isConnected ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-8 text-center text-[14px] text-[var(--color-muted)]">
          Connect a wallet on Arc to fund escrow and call the paid endpoint.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <StepHead n={1} title="Fund escrow" />
            <p className="mb-3 text-[13px] text-[var(--color-muted)]">
              Balance:{" "}
              <span className="font-mono font-semibold text-[var(--color-ink)]">
                {escrow ?? "—"} USDC
              </span>
            </p>
            <div className="flex gap-2">
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
                aria-label="Deposit amount in USDC"
                className="w-28 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[14px] outline-none focus:border-[var(--color-accent)]"
              />
              <Button onClick={fundEscrow} disabled={deposit.kind === "busy"} variant="soft">
                Deposit
              </Button>
            </div>
            <StatusLine s={deposit} />
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <StepHead n={2} title="Call paid API" />
            <p className="mb-3 text-[13px] text-[var(--color-muted)]">
              Costs <span className="font-mono font-semibold text-[var(--color-ink)]">0.01 USDC</span>.
              First call returns 402, SDK retries with the signed voucher.
            </p>
            <Button onClick={callPaidApi} disabled={call.kind === "busy"}>
              GET /api/premium
            </Button>
            <StatusLine s={call} />
          </section>

          {result && (
            <pre className="fade sm:col-span-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-4 font-mono text-[12px] leading-relaxed text-[var(--color-canvas)]">
              {result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied/i.test(m)) return "Signature rejected in wallet.";
  return m.length > 160 ? m.slice(0, 157) + "…" : m;
}

function StepHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--color-accent)] font-mono text-[11px] font-bold text-[var(--color-accent-ink)]">
        {n}
      </span>
      <h4 className="text-[15px] font-bold tracking-tight">{title}</h4>
    </div>
  );
}

function Button({
  variant = "solid",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "soft" }) {
  const styles =
    variant === "solid"
      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]"
      : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-accent)]";
  return (
    <button
      {...props}
      className={`btn-anim rounded-md px-3.5 py-2 text-[14px] font-semibold disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

function StatusLine({ s }: { s: Status }) {
  if (s.kind === "idle") return null;
  const color =
    s.kind === "err" ? "var(--color-warn)" : s.kind === "ok" ? "var(--color-ok)" : "var(--color-muted)";
  return (
    <p className="mt-3 flex items-center gap-2 text-[13px]" style={{ color }}>
      {s.kind === "busy" && <Spinner />}
      {s.msg}
    </p>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
