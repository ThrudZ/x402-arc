import { ProtocolFlow } from "@/components/ProtocolFlow";
import { LiveDemo } from "@/components/LiveDemo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="bloom pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />
      <div className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Header />
        <Hero />
        <HowItWorks />
        <section id="demo" className="scroll-mt-20 py-6 sm:py-10">
          <LiveDemo />
        </section>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between py-5">
      <div className="flex items-center gap-2.5">
        <Mark />
        <span className="text-[15px] font-bold tracking-tight">x402 on Arc</span>
      </div>
      <nav className="flex items-center gap-2">
        <a
          href="https://www.x402.org"
          target="_blank"
          rel="noreferrer"
          className="link-sweep hidden px-1 py-1 text-[14px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] sm:inline"
        >
          x402 spec
        </a>
        <a
          href="#demo"
          className="btn-anim mr-1 hidden rounded-md px-3 py-2 text-[14px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] sm:inline-block"
        >
          Live demo
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        <div
          className="rise inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[12px] font-semibold text-[var(--color-muted)]"
          style={{ animationDelay: "40ms" }}
        >
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          x402 payment gateway, escrow scheme
        </div>

        <h1
          className="rise mt-5 text-balance text-[clamp(2.4rem,6vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.03em]"
          style={{ animationDelay: "90ms" }}
        >
          Charge per request. Settle in USDC on Arc.
        </h1>

        <p
          className="rise mt-5 max-w-[54ch] text-[16px] leading-relaxed text-[var(--color-muted)] sm:text-[17px]"
          style={{ animationDelay: "150ms" }}
        >
          A buyer deposits USDC once, then signs an off-chain voucher for every
          call. The facilitator redeems it on Arc, where USDC is the native asset,
          so there is no separate gas token, no wrapping, no bridge.
        </p>

        <div
          className="rise mt-8 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "210ms" }}
        >
          <a
            href="#demo"
            className="btn-anim rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-[15px] font-semibold text-[var(--color-accent-ink)] shadow-[0_10px_30px_-12px_oklch(0.5_0.16_250/0.7)] hover:bg-[var(--color-accent-strong)]"
          >
            Try the handshake
          </a>
          <a
            href="#how"
            className="btn-anim rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-[15px] font-semibold hover:border-[var(--color-accent)]"
          >
            How it works
          </a>
        </div>

        <dl
          className="fade mt-10 flex flex-wrap gap-x-10 gap-y-4"
          style={{ animationDelay: "320ms" }}
        >
          <Stat term="Payment unit" value="USDC, 6 decimals" />
          <Stat term="On-chain cost" value="1 redeem per call" />
          <Stat term="Signing" value="EIP-712 voucher" />
        </dl>
      </div>

      <div className="rise" style={{ animationDelay: "180ms" }}>
        <ProtocolFlow />
      </div>
    </section>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {term}
      </dt>
      <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      k: "Deposit",
      t: "Prefund the escrow",
      d: "The buyer deposits USDC into the gateway contract once. Signing a voucher afterward is free and instant.",
    },
    {
      k: "Sign",
      t: "One voucher per request",
      d: "Each call is authorized by an EIP-712 voucher over buyer, seller, amount, resource and nonce. No transaction to sign per request.",
    },
    {
      k: "Redeem",
      t: "Settle on Arc",
      d: "The facilitator verifies the signature and escrow balance, then redeems on-chain, moving USDC to the seller.",
    },
    {
      k: "Refund",
      t: "Time-locked withdrawal",
      d: "Unused balance is withdrawable after a cooldown, so in-flight vouchers cannot be rugged by an instant withdraw.",
    },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-t border-[var(--color-border)] py-14 sm:py-20">
      <div className="max-w-[46ch]">
        <h2 className="text-[clamp(1.7rem,3.4vw,2.4rem)] font-extrabold tracking-[-0.02em]">
          Why escrow, not a transfer per call
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-muted)]">
          High-frequency API consumption cannot pay a transaction fee on every
          request. Escrow moves the chain interaction off the hot path and gives
          the buyer a refund route and the operator a place for fees or disputes.
        </p>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <article key={s.k} className="bg-[var(--color-surface)] p-6">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[13px] font-bold text-[var(--color-accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                {s.k}
              </span>
            </div>
            <h3 className="mt-3 text-[16px] font-bold tracking-tight">{s.t}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              {s.d}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)] py-8 text-[13px] text-[var(--color-muted)] sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Mark />
        <span className="font-semibold text-[var(--color-ink)]">x402 on Arc</span>
        <span>escrow payment gateway</span>
      </div>
      <span className="font-mono">USDC-native settlement, Arc L1</span>
    </footer>
  );
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="var(--color-accent)" strokeWidth="1.6" />
      <path d="M7 15.5 12 8l5 7.5" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15.5" r="1.4" fill="var(--color-accent-strong)" />
    </svg>
  );
}
