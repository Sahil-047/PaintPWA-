"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { BookDemoProcessArt } from "@/components/BookDemoProcessArt";
import { btnPrimary, cn } from "@/lib/tw";

const field =
  "h-11 w-full rounded-lg border border-brand-border bg-white px-3.5 text-sm text-brand-text placeholder:text-brand-muted/70 transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

export default function BookDemoSection() {
  const [form, setForm] = useState({
    name: "",
    shop: "",
    email: "",
    phone: "",
    message: "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("Book a paintsaas demo");
    const body = encodeURIComponent(
      `Name: ${form.name}\nShop: ${form.shop}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message || "I would like to schedule a demo."}`
    );
    window.location.href = `mailto:hello@asthetcss.com?subject=${subject}&body=${body}`;
  }

  return (
    <section id="book-a-demo" className="relative overflow-hidden bg-white py-16 lg:py-24">
      <div className="relative mx-auto max-w-4xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-4xl font-bold uppercase tracking-wide text-brand-primary sm:text-5xl">
            Book a demo
          </p>
          <h2 className="mt-3 text-balance text-xl font-bold leading-snug text-brand-text sm:text-2xl">
            See paintsaas on your store workflow
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[0.8125rem] font-medium leading-relaxed text-brand-muted">
            Share your details and our team will schedule a walkthrough of inventory, billing, and accounts.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="mt-8"
        >
          <BookDemoProcessArt className="h-auto w-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 overflow-hidden rounded-2xl border border-brand-border bg-[#eef4ff]/40 p-5 sm:p-6 lg:p-8"
        >
          <div className="mb-6 border-b border-brand-border/80 pb-5">
            <h3 className="text-base font-bold text-brand-text sm:text-lg">Request a demo</h3>
            <p className="mt-1 text-sm text-brand-muted">We respond within one business day</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="demo-name" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Your name
                </label>
                <input
                  id="demo-name"
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-shop" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Shop name
                </label>
                <input
                  id="demo-shop"
                  type="text"
                  required
                  placeholder="Sharma Paint House"
                  value={form.shop}
                  onChange={(e) => setForm((f) => ({ ...f, shop: e.target.value }))}
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-email" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Email
                </label>
                <input
                  id="demo-email"
                  type="email"
                  required
                  placeholder="you@shop.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="demo-phone" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Phone
                </label>
                <input
                  id="demo-phone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={field}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="demo-message" className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Message <span className="normal-case tracking-normal font-medium">(optional)</span>
              </label>
              <textarea
                id="demo-message"
                rows={2}
                placeholder="Store size or modules you want to see"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className={cn(field, "h-auto resize-none py-2.5")}
              />
            </div>

            <button type="submit" className={cn(btnPrimary, "mt-2 h-11 w-full text-sm")}>
              Send demo request
              <ArrowUpRight size={15} weight="bold" />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
