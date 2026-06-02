"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  ArrowUpRight,
  ChartLineUp,
  Cube,
  CurrencyInr,
  Database,
  ShieldCheck,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

const features = [
  {
    icon: Cube,
    title: "Inventory by size",
    desc: "Track stock and pricing by pack size from 50ml to 20L.",
  },
  {
    icon: CurrencyInr,
    title: "Fast billing + collections",
    desc: "Generate invoices quickly with due tracking and payment history.",
  },
  {
    icon: UsersThree,
    title: "Accounts done right",
    desc: "Customer ledger, cash memos, and balance workflows in one place.",
  },
  {
    icon: ChartLineUp,
    title: "Operational analytics",
    desc: "Sales, dues, expenses, and top products with decision-ready insights.",
  },
  {
    icon: ShieldCheck,
    title: "Superadmin controls",
    desc: "Approve tenant registrations with secure role-based access.",
  },
  {
    icon: Database,
    title: "API-first architecture",
    desc: "Built for SaaS scale with clean backend modules and pagination APIs.",
  },
];

const stats = [
  { label: "Invoice velocity uplift", value: "4.3x" },
  { label: "Stock mismatch reduction", value: "67%" },
  { label: "Time to onboard", value: "< 1 day" },
];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mouseGlowRef = useRef<HTMLDivElement>(null);
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173";
  const startPilotHref = `${appBaseUrl.replace(/\/$/, "")}/signup`;

  useEffect(() => {
    let cleanupMouse = () => {};

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-glow",
        { opacity: 0.35, y: -20 },
        { opacity: 0.8, y: 30, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );

      gsap.to(".hero-orb-a", {
        x: 80,
        y: -25,
        scale: 1.12,
        duration: 7.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      gsap.to(".hero-orb-b", {
        x: -95,
        y: 30,
        scale: 0.92,
        duration: 9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      gsap.to(".parallax-card", {
        y: -8,
        duration: 2.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.12,
      });

      if (mouseGlowRef.current) {
        const xTo = gsap.quickTo(mouseGlowRef.current, "x", {
          duration: 0.9,
          ease: "power3.out",
        });
        const yTo = gsap.quickTo(mouseGlowRef.current, "y", {
          duration: 0.9,
          ease: "power3.out",
        });

        const onMouseMove = (e: MouseEvent) => {
          const x = e.clientX - window.innerWidth / 2;
          const y = e.clientY - window.innerHeight / 2;
          xTo(x * 0.18);
          yTo(y * 0.18);
        };

        window.addEventListener("mousemove", onMouseMove);
        cleanupMouse = () => window.removeEventListener("mousemove", onMouseMove);
      }
    }, rootRef);

    return () => {
      cleanupMouse();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="site-bg text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_2px_rgba(45,212,191,.7)]" />
          paintsaas
          </div>
          <span className="mt-1 text-[11px] text-slate-400">A product of AsthetCSS</span>
        </div>
        <a
          href="#contact"
          className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10"
        >
          Book Demo
        </a>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-10 lg:pb-28">
          <div className="hero-glow pointer-events-none absolute inset-x-0 top-10 mx-auto h-72 max-w-3xl rounded-full bg-[radial-gradient(circle,rgba(56,189,248,.42),transparent_68%)] blur-2xl" />
          <div className="hero-orb hero-orb-a pointer-events-none absolute -left-20 top-6 h-80 w-80 rounded-full bg-cyan-400/25 blur-[90px]" />
          <div className="hero-orb hero-orb-b pointer-events-none absolute right-0 top-18 h-64 w-64 rounded-full bg-indigo-400/20 blur-[85px]" />
          <div
            ref={mouseGlowRef}
            className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/12 blur-[120px]"
          />
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="tagline-chip mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs tracking-[0.2em] text-cyan-100"
          >
            <span className="tagline-dot">
              <Sparkle size={14} weight="duotone" />
            </span>
            MODERN RETAIL OPERATING SYSTEM
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="max-w-5xl text-4xl font-semibold leading-[1.03] tracking-[-0.03em] text-slate-50 sm:text-6xl lg:text-7xl"
          >
            paintsaas is a premium workspace for inventory, billing, accounts, and growth analytics.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg"
          >
            Built by AsthetCSS for high-volume paint retailers and platform operators who want accuracy, speed, and control from one minimal dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <a
              href={startPilotHref}
              className="start-pilot-btn inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            >
              <span className="start-pilot-shine" />
              Start pilot
              <span className="start-pilot-icon">
                <ArrowUpRight size={15} weight="bold" />
              </span>
            </a>
            <a
              href="#features"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Explore features
            </a>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {stats.map((s, i) => (
              <motion.article
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.55 }}
                className="parallax-card rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wider text-slate-300/90">{s.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{s.value}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="feature-showcase">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="feature-showcase-intro"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/90">Core Modules</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Designed to feel effortless for users, but powerful for operations.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">
                A modular system where every feature feels connected: inventory to billing, billing to accounts, and accounts to growth decisions.
              </p>
            </motion.div>

            <div className="feature-rail">
              {features.map((f, i) => (
                <motion.article
                  key={f.title}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false, amount: 0.22 }}
                  transition={{ duration: 0.52, delay: i * 0.06 }}
                  whileHover={{ x: 8, scale: 1.01 }}
                  style={{ ["--i" as string]: i } as CSSProperties}
                  className="feature-rail-item"
                >
                  <div className="feature-rail-index">{String(i + 1).padStart(2, "0")}</div>
                  <div className="feature-rail-body">
                    <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <f.icon size={18} className="text-cyan-200" weight="duotone" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.desc}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-28 lg:px-10">
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/20 via-indigo-400/10 to-slate-900 p-8 sm:p-12"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Platform Impact</p>
            <p className="mt-4 max-w-4xl text-2xl leading-snug tracking-tight text-slate-100 sm:text-4xl">
              Replace disconnected tools with one elegant command center for daily execution and strategic visibility.
            </p>
            <div id="contact" className="mt-8 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                href="mailto:hello@asthetcss.com"
              >
                hello@asthetcss.com
              </a>
              <a
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                href="#"
              >
                Get product deck
              </a>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

