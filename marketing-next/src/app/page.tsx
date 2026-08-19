"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CaretDown, ArrowUpRight } from "@phosphor-icons/react";
import InteractiveErpDemo from "@/components/InteractiveErpDemo";
import BookDemoSection from "@/components/BookDemoSection";
import { HOW_IT_WORKS_ART } from "@/components/HowItWorksArt";
import {
  btnPrimary,
  clayCardBase,
  clayCardShadow,
  clayGradients,
  clayStepLabel,
  cn,
  heroDemoWrap,
  howSection,
  siteShell,
} from "@/lib/tw";

const PROCESS = [
  {
    step: "01",
    title: "Set up your workspace",
    desc: "Register, onboard, and launch your store ERP.",
    tone: "clay-blue",
  },
  {
    step: "02",
    title: "Manage inventory",
    desc: "Track every brand, SKU, and pack size in real time.",
    tone: "clay-peach",
  },
  {
    step: "03",
    title: "Invoice and collect",
    desc: "Bill at the counter, export PDFs, record partial pay.",
    tone: "clay-mint",
  },
  {
    step: "04",
    title: "Review business performance",
    desc: "See dues, memos, expenses, and sales in one view.",
    tone: "clay-lilac",
  },
] as const;

const ROTATING_WORDS = ["DASHBOARD", "INVENTORY", "BILLING", "ACCOUNTS", "ANALYTICS"] as const;

const TYPE_MS = 85;
const DELETE_MS = 45;
const PAUSE_MS = 1800;

function HeroHeadline() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = ROTATING_WORDS[wordIndex];

    if (reducedMotion) {
      setDisplayed(target);
      const id = window.setInterval(() => {
        setWordIndex((i) => {
          const next = (i + 1) % ROTATING_WORDS.length;
          setDisplayed(ROTATING_WORDS[next]);
          return next;
        });
      }, 3000);
      return () => window.clearInterval(id);
    }

    let timeout: number;

    if (!isDeleting && displayed.length < target.length) {
      timeout = window.setTimeout(() => {
        setDisplayed(target.slice(0, displayed.length + 1));
      }, TYPE_MS);
    } else if (!isDeleting && displayed === target) {
      timeout = window.setTimeout(() => setIsDeleting(true), PAUSE_MS);
    } else if (isDeleting && displayed.length > 0) {
      timeout = window.setTimeout(() => {
        setDisplayed((prev) => prev.slice(0, -1));
      }, DELETE_MS);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }

    return () => window.clearTimeout(timeout);
  }, [displayed, isDeleting, wordIndex]);

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-[1.35rem] font-bold uppercase leading-snug tracking-[0.06em] text-brand-text sm:text-[2rem] lg:text-[2.35rem]">
        RUN YOUR PAINT STORE
        <br />
        FROM ONE{" "}
        <span className="inline-grid align-baseline" aria-live="polite">
          <span className="invisible col-start-1 row-start-1 whitespace-nowrap leading-snug" aria-hidden>
            INVENTORY
          </span>
          <span className="col-start-1 row-start-1 whitespace-nowrap leading-snug text-brand-primary">
            {displayed}
            <span className="ml-px inline-block animate-pulse font-light opacity-70">|</span>
          </span>
        </span>
      </h1>
    </div>
  );
}

const FAQS = [
  {
    q: "What is paintsaas?",
    a: "paintsaas is a paint shop ERP built for retailers with inventory by size, billing, accounts, cash memos, returns, painters, expenses, and analytics in one workspace.",
  },
  {
    q: "Can I try it before going live?",
    a: "Yes. Start a pilot from this site to register your shop. A platform admin approves your workspace, then you can sign in at the app subdomain.",
  },
  {
    q: "How do cash memos work?",
    a: "Cash memos record money received from a customer as advance credit for future buying. They generate a PDF token, separate from invoice partial payments shown on the bill.",
  },
  {
    q: "Does billing support partial payment?",
    a: "Yes. When a customer pays part of an invoice, the bill PDF shows Total, Received, and Balance due. No cash memo is created from billing for partial pay.",
  },
  {
    q: "Is my data multitenant and secure?",
    a: "Each shop is isolated by tenant. All API routes are scoped to your shop so inventory, bills, and customer ledgers never mix across stores.",
  },
  {
    q: "Who built paintsaas?",
    a: "paintsaas is a product of AsthetCSS, designed for high-volume paint retailers who want accuracy, speed, and control from one dashboard.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-shadow",
        open
          ? "border-brand-primary/25 shadow-[0_8px_24px_rgba(19,88,250,0.08)]"
          : "border-brand-border hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-base font-semibold leading-snug text-brand-text sm:text-lg">{q}</span>
        <CaretDown
          size={20}
          className={cn("shrink-0 text-brand-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-5 text-base leading-relaxed text-brand-muted sm:px-6 sm:pb-6 sm:text-[17px]">{a}</p>
      </motion.div>
    </article>
  );
}

export default function Home() {
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : "https://app.paintappstore.in");
  const startPilotHref = `${appBaseUrl.replace(/\/$/, "")}/signup`;

  return (
    <div className={siteShell}>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between bg-white px-5 py-5 lg:px-8">
        <div className="flex flex-col gap-1">
          <img src="/logo.png" alt="paintsaas" className="h-11 w-auto rounded-md object-contain object-left" />
          <span className="text-[11px] text-brand-muted">A product of AsthetCSS</span>
        </div>
        <nav className="hidden items-center gap-6 text-[13px] font-medium text-brand-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-brand-primary">
            How it works
          </a>
          <a href="#book-a-demo" className="transition-colors hover:text-brand-primary">
            Book a demo
          </a>
          <a href="#faq" className="transition-colors hover:text-brand-primary">
            FAQ
          </a>
        </nav>
        <a href={startPilotHref} className={cn(btnPrimary, "px-4 py-2.5 text-[13px]")}>
          Start pilot
          <ArrowUpRight size={14} weight="bold" />
        </a>
      </header>

      <main className="bg-white">
        <section className="mx-auto flex max-w-7xl flex-col items-center bg-white px-5 pb-12 pt-2 lg:px-8 lg:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroHeadline />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={heroDemoWrap}
          >
            <InteractiveErpDemo />
          </motion.div>
        </section>

        <section id="how-it-works" className={howSection}>
          <div className="relative z-[1] mx-auto w-full max-w-7xl px-5 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-3xl text-center"
            >
              <p className="text-4xl font-bold uppercase tracking-wide text-brand-primary sm:text-5xl">
                How it works
              </p>
              <h2 className="mt-3 text-balance text-xl font-bold leading-snug text-brand-text sm:text-2xl">
                One smooth loop from first stock entry to daily store insight
              </h2>
              <p className="mt-3 text-[0.8125rem] font-medium leading-relaxed text-brand-muted">
                paintsaas connects every counter action to your ledger, so billing, dues, and reports
                never drift out of sync.
              </p>
            </motion.div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:mt-14 lg:grid-cols-4 lg:gap-5">
              {PROCESS.map((p, i) => {
                const Art = HOW_IT_WORKS_ART[i];
                return (
                  <motion.article
                    key={p.step}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.1, duration: 0.55 }}
                    className={cn(clayCardBase, clayCardShadow, clayGradients[p.tone])}
                  >
                    <div className="relative z-[1] overflow-hidden rounded-lg">
                      <Art className="h-auto w-full" />
                    </div>
                    <div className="relative z-[1] mt-4 flex items-center justify-between gap-3">
                      <span className={clayStepLabel}>{p.step}</span>
                    </div>
                    <h3 className="relative z-[1] mt-3 text-[0.9375rem] font-semibold leading-snug text-brand-text">
                      {p.title}
                    </h3>
                    <p className="relative z-[1] mt-1.5 text-xs font-medium leading-relaxed text-brand-muted">
                      {p.desc}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <BookDemoSection />

        <section id="faq" className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-5 lg:px-8">
            <div className="text-center">
              <p className="text-4xl font-bold uppercase tracking-wide text-brand-primary sm:text-5xl">FAQ</p>
              <h2 className="mt-3 text-balance text-xl font-bold leading-snug text-brand-text sm:text-2xl">
                Common questions
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <img src="/logo.png" alt="paintsaas" className="h-10 w-auto rounded-md" />
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-brand-muted">
                Premium paint shop ERP for inventory, billing, accounts, and growth analytics.
              </p>
              <p className="mt-2 text-[12px] text-[#94a3b8]">A product of AsthetCSS</p>
            </div>
            <div className="flex flex-wrap gap-10 text-[13px]">
              <div>
                <p className="font-semibold text-brand-text">Product</p>
                <ul className="mt-3 space-y-2 text-brand-muted">
                  <li>
                    <a href="#how-it-works" className="hover:text-brand-primary">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#book-a-demo" className="hover:text-brand-primary">
                      Book a demo
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-brand-primary">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href={startPilotHref} className="hover:text-brand-primary">
                      Start pilot
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-brand-text">Contact</p>
                <ul className="mt-3 space-y-2 text-brand-muted">
                  <li>
                    <a href="mailto:hello@asthetcss.com" className="hover:text-brand-primary">
                      hello@asthetcss.com
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://app.paintappstore.in"
                      className="hover:text-brand-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      app.paintappstore.in
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-brand-border pt-6 text-center text-[12px] text-[#94a3b8]">
            © {new Date().getFullYear()} paintsaas, AsthetCSS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
