"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/UIProvider";

type Ingredient = { id: string; name: string; unit: string; stockQty: number };
type RecipeLine = { id: string; quantity: number; unit: string; ingredient: Ingredient };
type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  recipeLines: RecipeLine[];
};

type CartLine = { menuItemId: string; name: string; price: number; quantity: number };

type Shortage = { ingredientId: string; name: string; required: number; available: number; unit: string };

export default function PosPage() {
  const toast = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shortages, setShortages] = useState<Shortage[]>([]);

  function loadMenu() {
    fetch("/api/menu-items")
      .then((r) => r.json())
      .then((data: MenuItem[]) => {
        setMenuItems(data.filter((m) => m.active));
        setLoading(false);
      });
  }

  useEffect(loadMenu, []);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category));
    return [...set];
  }, [menuItems]);

  // Available-to-sell count based on current on-hand stock, so staff can see
  // when an item is about to run out before they even add it to the cart.
  function maxSellable(item: MenuItem): number | null {
    if (item.recipeLines.length === 0) return null;
    return Math.min(
      ...item.recipeLines.map((line) =>
        line.quantity > 0 ? Math.floor(line.ingredient.stockQty / line.quantity) : Infinity,
      ),
    );
  }

  function addToCart(item: MenuItem) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(menuItemId: string) {
    setCart((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }

  const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  async function submitOrder() {
    setSubmitting(true);
    setError("");
    setShortages([]);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Order failed");
      if (data.shortages) setShortages(data.shortages);
      return;
    }

    toast({ message: `Order placed — $${data.total.toFixed(2)}`, tone: "success" });
    setCart([]);
    loadMenu();
  }

  if (loading) return <div className="p-8 text-neutral-500">Loading menu…</div>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        {categories.map((cat) => (
          <div key={cat} className="mb-7">
            <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {cat}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {menuItems
                .filter((m) => m.category === cat)
                .map((item) => {
                  const max = maxSellable(item);
                  const outOfStock = max !== null && max <= 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={outOfStock}
                      className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-all hover:border-neutral-400 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-sm"
                    >
                      <span className="font-medium text-neutral-900">{item.name}</span>
                      <span className="text-sm text-neutral-500">${item.price.toFixed(2)}</span>
                      {outOfStock ? (
                        <span className="mt-1.5">
                          <Badge tone="danger">Out of stock</Badge>
                        </span>
                      ) : max !== null && max <= 5 ? (
                        <span className="mt-1.5">
                          <Badge tone="warning">Only {max} left</Badge>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <Card className="h-fit w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Current Order</h2>
          {itemCount > 0 && <Badge tone="neutral">{itemCount} item{itemCount !== 1 && "s"}</Badge>}
        </div>
        {cart.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">Tap a menu item to add it</p>
        )}
        <ul className="flex flex-col gap-3">
          {cart.map((line) => (
            <li key={line.menuItemId} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium text-neutral-900">{line.name}</div>
                <div className="text-neutral-500">${line.price.toFixed(2)} each</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => updateQty(line.menuItemId, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                >
                  −
                </button>
                <span className="w-4 text-center tabular-nums">{line.quantity}</span>
                <button
                  onClick={() => updateQty(line.menuItemId, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                >
                  +
                </button>
                <button
                  onClick={() => removeLine(line.menuItemId)}
                  className="ml-0.5 rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-semibold text-neutral-900">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            {error}
            {shortages.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {shortages.map((s) => (
                  <li key={s.ingredientId}>
                    {s.name}: need {s.required}
                    {s.unit}, have {s.available}
                    {s.unit}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button
          variant="primary"
          onClick={submitOrder}
          disabled={cart.length === 0 || submitting}
          className="mt-4 w-full py-3 text-base"
        >
          {submitting ? "Placing order…" : "Place Order"}
        </Button>
      </Card>
    </div>
  );
}
