export function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export const neuRaised =
  "shadow-[10px_10px_22px_#b8c4d4,-10px_-10px_22px_#ffffff]";
export const neuRaisedSm =
  "shadow-[5px_5px_12px_#b8c4d4,-5px_-5px_12px_#ffffff]";
export const neuInsetSm =
  "shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff]";

export const siteShell = "min-h-screen bg-white";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary font-semibold text-white shadow-[0_12px_28px_rgba(19,88,250,0.28)] transition hover:-translate-y-px hover:shadow-[0_16px_32px_rgba(19,88,250,0.34)]";

export const heroDemoWrap =
  "mx-auto mt-8 flex w-full max-w-[52rem] flex-col rounded-[1.65rem] bg-neu-bg p-3 shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff] lg:mt-10";

export const howSection =
  "relative overflow-hidden bg-white py-16 lg:py-24";

export const clayCardBase =
  "relative flex min-h-full flex-col overflow-hidden rounded-xl border border-white/90 p-5 transition hover:-translate-y-0.5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[45%] before:rounded-t-xl before:bg-gradient-to-b before:from-white/45 before:to-transparent";

export const clayCardShadow =
  "shadow-[inset_2px_2px_6px_rgba(255,255,255,0.95),inset_-3px_-4px_8px_rgba(19,88,250,0.05),0_8px_20px_rgba(19,88,250,0.08)] hover:shadow-[inset_2px_2px_6px_rgba(255,255,255,0.98),inset_-3px_-4px_8px_rgba(19,88,250,0.04),0_14px_28px_rgba(19,88,250,0.11)]";

export const clayGradients: Record<string, string> = {
  "clay-blue": "bg-gradient-to-br from-white to-[#eef4ff]",
  "clay-peach": "bg-gradient-to-br from-white to-[#f3f7ff]",
  "clay-mint": "bg-gradient-to-br from-white to-[#edf3ff]",
  "clay-lilac": "bg-gradient-to-br from-white to-[#f2f8ff]",
};

export const clayStepLabel =
  "inline-flex min-w-9 items-center justify-center rounded-lg border border-brand-secondary/45 bg-gradient-to-br from-white to-[#f0f5ff] px-2 py-1 text-[0.68rem] font-bold tracking-wider text-brand-primary shadow-[inset_1px_1px_3px_rgba(255,255,255,0.95),inset_-1px_-2px_3px_rgba(19,88,250,0.05),0_2px_6px_rgba(19,88,250,0.07)]";

export const clayIconBubble =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-secondary/40 bg-gradient-to-br from-white to-[#eef3fc] text-brand-primary shadow-[inset_1px_1px_3px_rgba(255,255,255,0.95),inset_-2px_-2px_4px_rgba(19,88,250,0.04),0_3px_8px_rgba(19,88,250,0.08)]";

export const erpTiltScene =
  "flex h-[min(420px,62vw)] max-h-[480px] w-full flex-col [perspective:1100px] sm:h-[440px] lg:h-[460px]";

export const erpFloatLayer =
  "flex min-h-0 flex-1 flex-col [transform-style:preserve-3d] animate-erp-float";

export const erpTiltLayer =
  "flex min-h-0 flex-1 flex-col [transform-style:preserve-3d] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none";

export const erpFrame =
  "flex min-h-full flex-1 flex-col overflow-hidden rounded-3xl border-0 bg-neu-surface shadow-[5px_5px_12px_#b8c4d4,-5px_-5px_12px_#ffffff]";

export const erpChrome =
  "shrink-0 bg-neu-surface shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff]";

export const erpSurface = "flex min-h-0 flex-1 bg-neu-surface";

export const erpSidebar =
  "relative z-[2] w-[108px] shrink-0 space-y-1 overflow-x-visible overflow-y-auto bg-neu-surface p-2 shadow-[inset_-4px_0_8px_rgba(184,196,212,0.35)] sm:w-32";

export const erpNavBtnBase =
  "relative flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-[0.875rem] border-0 bg-transparent px-3.5 py-2.5 text-left text-[0.78rem] font-medium transition";

export const erpNavActiveBg =
  "absolute inset-0 rounded-[0.875rem] bg-gradient-to-br from-[#1a62ff] to-[#0f4ed4] shadow-[4px_4px_10px_rgba(19,88,250,0.45),-3px_-3px_8px_rgba(255,255,255,0.55),inset_1px_1px_2px_rgba(255,255,255,0.25)]";

export const erpNavHint =
  "pointer-events-none absolute left-[calc(100%+0.45rem)] top-1/2 z-20 hidden w-[9.5rem] -translate-y-1/2 rounded-xl bg-neu-surface p-2.5 text-[0.62rem] leading-snug text-brand-muted shadow-[10px_10px_22px_#b8c4d4,-10px_-10px_22px_#ffffff] sm:block";

export const metricCard = cn("rounded-xl border-0 bg-neu-surface", neuRaisedSm);

export const metricAccent =
  "rounded-xl bg-gradient-to-br from-[#1a62ff] to-[#0f4ed4] text-white shadow-[6px_6px_14px_rgba(19,88,250,0.4),-4px_-4px_10px_rgba(255,255,255,0.65)]";

export const demoClickable =
  "cursor-pointer border-0 transition hover:-translate-y-px active:scale-[0.985]";

export const demoSelected =
  "shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff] outline outline-1 outline-brand-primary/20";

export const neuBar =
  "min-h-1 cursor-pointer rounded-t-md border-0 bg-gradient-to-b from-[#3d7bff] to-brand-primary p-0 shadow-[2px_2px_6px_rgba(19,88,250,0.35),-1px_-1px_4px_rgba(255,255,255,0.4)] transition hover:scale-y-105";

export const demoQtyBtn = cn(
  "inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border-0 bg-neu-surface text-brand-primary transition hover:scale-110 active:scale-95 active:shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff]",
  neuRaisedSm
);

export const demoActionBtn =
  "mt-1 w-full cursor-pointer rounded-xl border-0 bg-gradient-to-br from-[#1a62ff] to-[#0f4ed4] px-3 py-2.5 text-[0.68rem] font-semibold text-white shadow-[4px_4px_12px_rgba(19,88,250,0.35)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

export const demoToast =
  "hidden max-w-[160px] truncate items-center rounded-full bg-neu-surface px-2.5 py-1 text-[0.62rem] font-semibold text-brand-primary shadow-[inset_3px_3px_6px_#b8c4d4,inset_-3px_-3px_6px_#ffffff] sm:inline-flex";

export const neuDemoPill = cn(
  "hidden items-center gap-1 rounded-full border-0 px-2 py-0.5 text-[9px] font-semibold text-green-700 sm:inline-flex",
  neuRaisedSm,
  "bg-neu-surface"
);

export const neuBadge = cn(
  "rounded-full border-0 px-2 py-0.5 font-medium text-brand-primary",
  neuInsetSm,
  "bg-neu-surface"
);

export const neuIconAccent =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a62ff] to-[#0f4ed4] text-white shadow-[4px_4px_10px_rgba(19,88,250,0.4),-2px_-2px_6px_rgba(255,255,255,0.5)]";

export const neuInsetPanel = cn("rounded-xl bg-neu-surface", neuInsetSm);
