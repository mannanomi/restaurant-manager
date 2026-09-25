import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import {
  IconHome,
  IconRegister,
  IconBox,
  IconBook,
  IconReceipt,
  IconTruck,
  IconDollar,
  IconUsers,
  IconChart,
} from "./ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  roles: ("MANAGER" | "STAFF")[];
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [{ href: "/dashboard", label: "Dashboard", icon: IconHome, roles: ["MANAGER"] }],
  },
  {
    label: "Front of House",
    items: [
      { href: "/pos", label: "POS", icon: IconRegister, roles: ["MANAGER", "STAFF"] },
      { href: "/orders", label: "Order History", icon: IconReceipt, roles: ["MANAGER", "STAFF"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/inventory", label: "Inventory", icon: IconBox, roles: ["MANAGER", "STAFF"] },
      { href: "/purchase-orders", label: "Purchase Orders", icon: IconTruck, roles: ["MANAGER"] },
      { href: "/menu", label: "Menu & Recipes", icon: IconBook, roles: ["MANAGER"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: IconDollar, roles: ["MANAGER"] },
      { href: "/payroll", label: "Payroll", icon: IconUsers, roles: ["MANAGER"] },
      { href: "/reports", label: "Reports", icon: IconChart, roles: ["MANAGER"] },
    ],
  },
];

export default async function Sidebar() {
  const session = await getSession();
  if (!session) return null;

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.includes(session.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <input type="checkbox" id="sidebar-toggle" className="peer hidden" />

      {/* Mobile top bar — fixed (like the backdrop/aside below) so it's taken out of the
          parent flex row entirely; left in normal flow it becomes a flex *item* and gets
          stretched full-height / squeezed to content-width by its siblings instead of
          spanning the top as a bar. */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <Link href={session.role === "MANAGER" ? "/dashboard" : "/pos"} className="flex items-center gap-2 font-semibold text-neutral-900">
          <span className="text-lg">🍔</span> Diner OS
        </Link>
        <label
          htmlFor="sidebar-toggle"
          className="cursor-pointer rounded-lg border border-neutral-300 p-2 text-neutral-600"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
      </header>

      {/* Backdrop for mobile drawer */}
      <label
        htmlFor="sidebar-toggle"
        className="fixed inset-0 z-30 hidden bg-black/30 peer-checked:block md:hidden"
      />

      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-neutral-200 bg-white transition-transform duration-200 peer-checked:translate-x-0 md:static md:z-auto md:translate-x-0">
        <div className="hidden items-center gap-2 border-b border-neutral-200 px-5 py-4 md:flex">
          <span className="text-xl">🍔</span>
          <span className="font-semibold text-neutral-900">Diner OS</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, i) => (
            <div key={i} className={i > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {group.label}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 text-neutral-400" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {session.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-neutral-900">{session.name}</div>
              <div className="text-xs text-neutral-400">{session.role === "MANAGER" ? "Manager" : "Staff"}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
