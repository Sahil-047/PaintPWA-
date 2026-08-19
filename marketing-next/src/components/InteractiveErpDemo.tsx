"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SquaresFour,
  Package,
  Receipt,
  FileText,
  Users,
  ArrowCounterClockwise,
  PaintBrush,
  Wallet,
  ChartBar,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Check,
  Plus,
  Minus,
} from "@phosphor-icons/react";
import {
  cn,
  demoActionBtn,
  demoClickable,
  demoQtyBtn,
  demoSelected,
  demoToast,
  erpChrome,
  erpFloatLayer,
  erpFrame,
  erpNavActiveBg,
  erpNavBtnBase,
  erpNavHint,
  erpSidebar,
  erpSurface,
  erpTiltLayer,
  erpTiltScene,
  metricAccent,
  metricCard,
  neuBadge,
  neuBar,
  neuDemoPill,
  neuIconAccent,
  neuInsetPanel,
  neuRaised,
  neuRaisedSm,
} from "@/lib/tw";

type ModuleId =
  | "dashboard"
  | "inventory"
  | "billing"
  | "cashmemos"
  | "accounts"
  | "returns"
  | "painters"
  | "expenses"
  | "analytics";

type CartItem = { id: string; name: string; price: number; qty: number };

type DemoActions = {
  navigate: (module: ModuleId) => void;
  toast: (message: string) => void;
  select: (key: string | null) => void;
  selected: string | null;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  updateQty: (id: string, delta: number) => void;
  chartMonth: number | null;
  setChartMonth: (index: number | null) => void;
};

const NAV: { id: ModuleId; label: string; hint: string; icon: typeof SquaresFour }[] = [
  { id: "dashboard", label: "Dashboard", hint: "Revenue, dues & monthly charts", icon: SquaresFour },
  { id: "inventory", label: "Inventory", hint: "Stock by size, codes & brands", icon: Package },
  { id: "billing", label: "Billing", hint: "Counter cart & invoice PDF", icon: Receipt },
  { id: "cashmemos", label: "Cash memos", hint: "Customer advance tokens", icon: FileText },
  { id: "accounts", label: "Accounts", hint: "Customer ledger & dues", icon: Users },
  { id: "returns", label: "Returns", hint: "Process returns to stock", icon: ArrowCounterClockwise },
  { id: "painters", label: "Painters", hint: "Painter payouts & dues", icon: PaintBrush },
  { id: "expenses", label: "Expenses", hint: "Rent, salaries & overheads", icon: Wallet },
  { id: "analytics", label: "Analytics", hint: "Sales, outstanding & trends", icon: ChartBar },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const BAR_HEIGHTS = [42, 68, 55, 82, 71, 90, 64, 78];

const CATALOG = [
  { id: "apcolite-4l", name: "Apcolite 4L", price: 1200 },
  { id: "primer-10l", name: "Primer 10L", price: 2040 },
  { id: "putty-20kg", name: "Putty 20kg", price: 2880 },
];

function fmt(n: number) {
  return `₹ ${n.toLocaleString("en-IN")}`;
}

function cartTotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function DashboardView({ actions }: { actions: DemoActions }) {
  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div>
        <p className="text-sm font-bold text-[#0f172a]">Hello, Rajesh! 👋</p>
        <p className="text-[11px] text-[#64748b]">Tap a metric or bar to explore.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={cn(demoClickable, metricAccent, "flex min-h-[72px] flex-col p-3 text-left")}
          onClick={() => {
            actions.navigate("analytics");
            actions.toast("Opened analytics");
          }}
        >
          <p className="text-[10px] text-white/80">Total revenue</p>
          <p className="mt-1 text-base font-bold tabular-nums">{fmt(284500)}</p>
          <span className="mt-auto inline-flex items-center gap-0.5 text-[9px] text-emerald-100">
            <ArrowUpRight size={10} weight="bold" /> 12,4%
          </span>
        </button>
        <button
          type="button"
          className={cn(demoClickable, metricCard, "flex min-h-[72px] flex-col p-3 text-left")}
          onClick={() => {
            actions.navigate("accounts");
            actions.toast("Viewing customer dues");
          }}
        >
          <p className="text-[10px] text-[#64748b]">Total Due</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#0f172a]">{fmt(48200)}</p>
          <span className="mt-auto inline-flex items-center gap-0.5 text-[9px] text-rose-500">
            <ArrowDownRight size={10} weight="bold" /> 3,1%
          </span>
        </button>
        <button
          type="button"
          className={cn(demoClickable, metricCard, "flex min-h-[72px] flex-col p-3 text-left")}
          onClick={() => {
            actions.navigate("expenses");
            actions.toast("Expense ledger opened");
          }}
        >
          <p className="text-[10px] text-[#64748b]">Total Expenses</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#0f172a]">{fmt(36800)}</p>
        </button>
        <button
          type="button"
          className={cn(demoClickable, metricCard, "flex min-h-[72px] flex-col p-3 text-left")}
          onClick={() => {
            actions.navigate("analytics");
            actions.toast("Net revenue breakdown");
          }}
        >
          <p className="text-[10px] text-[#64748b]">Net revenue</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#0f172a]">{fmt(241200)}</p>
        </button>
      </div>
      <div className={cn(metricCard, "p-3")}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#0f172a]">Revenue</p>
          <p className="text-[10px] text-[#1358fa] font-medium tabular-nums">
            {actions.chartMonth !== null ? MONTHS[actions.chartMonth] : "Select a bar"}
          </p>
        </div>
        <div className="mt-2 flex items-end gap-1 h-16">
          {BAR_HEIGHTS.map((h, i) => (
            <button
              key={MONTHS[i]}
              type="button"
              className={cn(
                neuBar,
                "flex-1",
                actions.chartMonth === i &&
                  "shadow-[2px_2px_8px_rgba(19,88,250,0.5),-1px_-1px_4px_rgba(255,255,255,0.5)]"
              )}
              data-selected={actions.chartMonth === i}
              style={{ height: `${h}%`, opacity: actions.chartMonth === i ? 1 : 0.55 + i * 0.05 }}
              onClick={() => {
                actions.setChartMonth(i);
                actions.toast(`${MONTHS[i]} revenue, ${fmt(18000 + h * 420)}`);
              }}
              aria-label={`${MONTHS[i]} revenue`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryView({ actions }: { actions: DemoActions }) {
  const rows = [
    { id: "AP2041", name: "Apcolite Premium Emulsion", code: "AP2041", stock: "48 L", brand: "Asian Paints", price: 980 },
    { id: "LX8812", name: "Luxol Hi Gloss Enamel", code: "LX8812", stock: "22 L", brand: "Berger", price: 1120 },
    { id: "TR1102", name: "Tractor Emulsion", code: "TR1102", stock: "6 L", brand: "Asian Paints", price: 640 },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#0f172a]">Inventory</p>
        <span className={cn(neuBadge, "text-[10px]")}>124 products</span>
      </div>
      <div className={cn(metricCard, "overflow-hidden")}>
        <div className={cn(neuInsetPanel, "grid grid-cols-[1fr_52px_40px] gap-2 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]")}>
          <span>Product</span>
          <span>Code</span>
          <span className="text-right">Stock</span>
        </div>
        {rows.map((r) => (
          <button
            key={r.code}
            type="button"
            className={cn(
              demoClickable,
              "grid w-full grid-cols-[1fr_52px_40px] gap-2 border-t border-[#b8c4d4]/35 bg-white/35 px-3 py-2.5 text-left text-[11px]",
              actions.selected === r.id && demoSelected
            )}
            onClick={() => {
              actions.select(r.id);
              actions.addToCart({ id: r.id, name: r.name, price: r.price });
              actions.navigate("billing");
              actions.toast(`${r.name} added to cart`);
            }}
          >
            <div>
              <p className="font-medium text-[#0f172a] truncate">{r.name}</p>
              <p className="text-[10px] text-[#94a3b8]">{r.brand}</p>
            </div>
            <span className="font-mono text-[#475569]">{r.code}</span>
            <span className="text-right font-semibold text-[#0f172a]">{r.stock}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BillingView({ actions }: { actions: DemoActions }) {
  const total = cartTotal(actions.cart);
  const itemCount = actions.cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <p className="text-sm font-bold text-[#0f172a]">Billing</p>
      <div className="grid grid-cols-2 gap-2">
        {CATALOG.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(demoClickable, metricCard, "p-2.5 text-left text-[10px]")}
            onClick={() => {
              actions.addToCart(item);
              actions.toast(`Added ${item.name}`);
            }}
          >
            <p className="font-medium text-[#0f172a] truncate">{item.name}</p>
            <p className="mt-1 text-[#64748b]">Tap to add</p>
            <p className="mt-0.5 font-semibold tabular-nums">{fmt(item.price)}</p>
          </button>
        ))}
      </div>

      <div className={cn(metricCard, "space-y-2 p-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={neuIconAccent}>
              <ShoppingCart size={16} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#0f172a]">Cart, {itemCount} items</p>
              <p className="text-[10px] text-[#64748b]">Sharma Hardware</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#64748b]">Total</p>
            <p className="text-sm font-bold text-[#1358fa] tabular-nums">{fmt(total)}</p>
          </div>
        </div>

        {actions.cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-white/35 px-2 py-1.5">
            <p className="text-[10px] font-medium text-[#334155] truncate flex-1">{item.name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                className={demoQtyBtn}
                onClick={() => actions.updateQty(item.id, -1)}
                aria-label={`Decrease ${item.name}`}
              >
                <Minus size={10} weight="bold" />
              </button>
              <span className="text-[10px] font-semibold tabular-nums w-4 text-center">{item.qty}</span>
              <button
                type="button"
                className={demoQtyBtn}
                onClick={() => actions.updateQty(item.id, 1)}
                aria-label={`Increase ${item.name}`}
              >
                <Plus size={10} weight="bold" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className={demoActionBtn}
          disabled={itemCount === 0}
          onClick={() => actions.toast(`Invoice created, ${fmt(total)}, PDF ready`)}
        >
          Create invoice
        </button>
      </div>
    </div>
  );
}

function CashMemosView({ actions }: { actions: DemoActions }) {
  const rows = [
    { id: "CM2401", no: "CM2401", customer: "Sharma Hardware", amount: 5000 },
    { id: "CM2398", no: "CM2398", customer: "Gupta Paints", amount: 12000 },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <p className="text-sm font-bold text-[#0f172a]">Cash memos</p>
      <p className="text-[10px] text-[#64748b]">Tap a memo to preview PDF token</p>
      {rows.map((r) => (
        <button
          key={r.no}
          type="button"
          className={cn(
            demoClickable,
            metricCard,
            "flex w-full items-center justify-between p-3 text-left",
            actions.selected === r.id && demoSelected
          )}
          onClick={() => {
            actions.select(r.id);
            actions.toast(`${r.no} PDF token generated`);
          }}
        >
          <div>
            <p className="text-[11px] font-semibold text-[#0f172a]">{r.customer}</p>
            <p className="text-[10px] text-[#94a3b8]">{r.no}</p>
          </div>
          <p className="text-sm font-bold text-[#1358fa] tabular-nums">{fmt(r.amount)}</p>
        </button>
      ))}
    </div>
  );
}

function AccountsView({ actions }: { actions: DemoActions }) {
  const rows = [
    { id: "sharma", name: "Sharma Hardware", due: 12400, orders: 18 },
    { id: "gupta", name: "Gupta Paints", due: 8200, orders: 11 },
    { id: "city", name: "City Decorators", due: 0, orders: 6 },
  ];
  const active = rows.find((r) => r.id === actions.selected);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <p className="text-sm font-bold text-[#0f172a]">Accounts</p>
      {rows.map((r) => (
        <button
          key={r.name}
          type="button"
          className={cn(
            demoClickable,
            metricCard,
            "flex w-full justify-between p-3 text-left",
            actions.selected === r.id && demoSelected
          )}
          onClick={() => {
            actions.select(r.id);
            actions.toast(r.due > 0 ? `${r.name}, ${fmt(r.due)} due` : `${r.name}, account clear`);
          }}
        >
          <div>
            <p className="text-[11px] font-semibold text-[#0f172a]">{r.name}</p>
            <p className="text-[10px] text-[#94a3b8]">{r.orders} invoices</p>
          </div>
          <p className={`text-sm font-bold tabular-nums ${r.due > 0 ? "text-[#ea580c]" : "text-[#16a34a]"}`}>
            {r.due > 0 ? fmt(r.due) : "Clear"}
          </p>
        </button>
      ))}
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(neuInsetPanel, "p-3 text-[10px] text-brand-muted")}
        >
          <p className="font-semibold text-[#0f172a]">{active.name}</p>
          <p className="mt-1">{active.orders} invoices on file, last payment 3 days ago</p>
        </motion.div>
      )}
    </div>
  );
}

function SimpleListView({
  title,
  items,
  actions,
}: {
  title: string;
  items: { id: string; label: string; toast: string }[];
  actions: DemoActions;
}) {
  return (
    <div className="p-3 sm:p-4 space-y-3">
      <p className="text-sm font-bold text-[#0f172a]">{title}</p>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            demoClickable,
            metricCard,
            "w-full px-3 py-2.5 text-left text-[11px] font-medium text-[#334155]",
            actions.selected === item.id && demoSelected
          )}
          onClick={() => {
            actions.select(item.id);
            actions.toast(item.toast);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function AnalyticsView({ actions }: { actions: DemoActions }) {
  const stats = [
    { id: "sales", label: "Net Sales", value: fmt(284500), tone: "green" as const, module: "billing" as ModuleId },
    { id: "due", label: "Outstanding", value: fmt(48200), tone: "orange" as const, module: "accounts" as ModuleId },
    { id: "exp", label: "Expenses", value: fmt(36800), tone: "purple" as const, module: "expenses" as ModuleId },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <p className="text-sm font-bold text-[#0f172a]">Analytics</p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            className={cn(
              demoClickable,
              metricCard,
              "p-2.5 text-left",
              s.tone === "green" && "text-green-600",
              s.tone === "orange" && "text-orange-600",
              s.tone === "purple" && "text-purple-600",
              actions.selected === s.id && demoSelected
            )}
            onClick={() => {
              actions.select(s.id);
              actions.navigate(s.module);
              actions.toast(`Drill down, ${s.label}`);
            }}
          >
            <p className="text-[9px] font-medium opacity-80">{s.label}</p>
            <p className="mt-1 text-[11px] font-bold tabular-nums">{s.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function renderView(module: ModuleId, actions: DemoActions) {
  switch (module) {
    case "dashboard":
      return <DashboardView actions={actions} />;
    case "inventory":
      return <InventoryView actions={actions} />;
    case "billing":
      return <BillingView actions={actions} />;
    case "cashmemos":
      return <CashMemosView actions={actions} />;
    case "accounts":
      return <AccountsView actions={actions} />;
    case "returns":
      return (
        <SimpleListView
          title="Returns"
          actions={actions}
          items={[
            { id: "ret-1", label: "Apcolite 4L, Sharma Hardware", toast: "Return CM882 queued" },
            { id: "ret-2", label: "Primer 1L, Gupta Paints", toast: "Return approved, stock restored" },
          ]}
        />
      );
    case "painters":
      return (
        <SimpleListView
          title="Painters"
          actions={actions}
          items={[
            { id: "p-1", label: "Ramesh Kumar, ₹ 2,400 paid", toast: "Painter ledger updated" },
            { id: "p-2", label: "Vikram Singh, ₹ 1,800 due", toast: "Payment reminder sent" },
          ]}
        />
      );
    case "expenses":
      return (
        <SimpleListView
          title="Expenses"
          actions={actions}
          items={[
            { id: "e-1", label: "Rent, ₹ 18,000", toast: "Expense logged, Rent" },
            { id: "e-2", label: "Transport, ₹ 3,200", toast: "Expense logged, Transport" },
            { id: "e-3", label: "Salaries, ₹ 42,000", toast: "Expense logged, Salaries" },
          ]}
        />
      );
    case "analytics":
      return <AnalyticsView actions={actions} />;
    default:
      return null;
  }
}

const MAX_TILT = 7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function InteractiveErpDemo() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [chartMonth, setChartMonth] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([
    { id: "apcolite-4l", name: "Apcolite 4L", price: 1200, qty: 1 },
    { id: "primer-10l", name: "Primer 10L", price: 2040, qty: 1 },
  ]);
  const [hoveredNav, setHoveredNav] = useState<ModuleId | null>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const addToCart = (item: Omit<CartItem, "qty">, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, { ...item, qty }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const actions: DemoActions = {
    navigate: setActive,
    toast: showToast,
    select: setSelected,
    selected,
    cart,
    addToCart,
    updateQty,
    chartMonth,
    setChartMonth,
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const updateFromPointer = (clientX: number, clientY: number) => {
      const el = tiltRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const px = clamp((clientX - centerX) / (window.innerWidth * 0.42), -1, 1);
      const py = clamp((clientY - centerY) / (window.innerHeight * 0.42), -1, 1);

      setTilt({
        x: -py * MAX_TILT,
        y: px * MAX_TILT,
      });

      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      setHovering(inside);
    };

    const onMouseMove = (e: MouseEvent) => updateFromPointer(e.clientX, e.clientY);
    const onMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
      setHovering(false);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div className={erpTiltScene}>
      <div
        className={erpFloatLayer}
        style={{ animationPlayState: hovering ? "paused" : "running" }}
      >
        <div
          ref={tiltRef}
          className={erpTiltLayer}
          data-hover={hovering}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${hovering ? 14 : 0}px) scale(${hovering ? 1.008 : 1})`,
          }}
        >
          <div className={erpFrame}>
            <div className={cn(erpChrome, "flex shrink-0 items-center gap-2 px-3 py-2.5")}>
              <img src="/logo.png" alt="" className="h-7 w-auto rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#0f172a] truncate">Paint ERP</p>
                <p className="text-[9px] text-[#94a3b8]">Interactive demo</p>
              </div>
              <AnimatePresence mode="wait">
                {toast ? (
                  <motion.span
                    key={toast}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={demoToast}
                  >
                    {toast}
                  </motion.span>
                ) : (
                  <motion.span
                    key="demo-pill"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={neuDemoPill}
                  >
                    <Check size={10} weight="bold" /> Live
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className={erpSurface}>
              <aside className={erpSidebar} onMouseLeave={() => setHoveredNav(null)}>
                {NAV.map(({ id, label, hint, icon: Icon }) => {
                  const isActive = active === id;
                  const isHovered = hoveredNav === id;

                  return (
                    <div key={id} className="relative">
                      <motion.button
                        type="button"
                        className={cn(
                          erpNavBtnBase,
                          isActive
                            ? "text-white shadow-none"
                            : cn(
                                neuRaisedSm,
                                "text-brand-text/55 hover:text-brand-text",
                                isHovered &&
                                  "text-brand-primary shadow-[5px_5px_12px_#b8c4d4,-5px_-5px_12px_#ffffff,0_0_0_1px_rgba(19,88,250,0.15)]"
                              )
                        )}
                        onMouseEnter={() => setHoveredNav(id)}
                        onFocus={() => setHoveredNav(id)}
                        onBlur={() => setHoveredNav(null)}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          setActive(id);
                          setHoveredNav(null);
                          showToast(`${label} module`);
                        }}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="erp-nav-active"
                            className={erpNavActiveBg}
                            transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          />
                        )}
                        <span className="relative z-[1] flex min-w-0 items-center gap-2.5">
                          <motion.span
                            className="inline-flex shrink-0"
                            animate={{
                              scale: isHovered || isActive ? 1.12 : 1,
                              rotate: isHovered && !isActive ? -6 : 0,
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          >
                            <Icon size={15} weight={isActive ? "fill" : "regular"} />
                          </motion.span>
                          <span className="truncate">{label}</span>
                        </span>
                      </motion.button>

                      <AnimatePresence>
                        {isHovered && !isActive && (
                          <motion.div
                            initial={{ opacity: 0, x: -6, scale: 0.96 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -4, scale: 0.96 }}
                            transition={{ duration: 0.16 }}
                            className={erpNavHint}
                          >
                            <p className="font-semibold text-[#0f172a]">{label}</p>
                            <p className="mt-0.5 leading-snug">{hint}</p>
                            <p className="mt-1.5 text-[#1358fa] font-semibold">Click to open</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </aside>

              <div className="flex-1 min-w-0 min-h-0 overflow-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.22 }}
                    className="h-full"
                  >
                    {renderView(active, actions)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
