"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

type OrderLine = { id: string; quantity: number; unitPrice: number; menuItem: { name: string } };
type Order = { id: string; createdAt: string; total: number; status: string; lines: OrderLine[] };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data: Order[]) => {
        setOrders(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-neutral-500">Loading order history…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Order History" description="Every order placed, most recent first." />
      {orders.length === 0 && (
        <Card>
          <p className="text-center text-sm text-neutral-400">No orders placed yet.</p>
        </Card>
      )}
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Card key={order.id} padded={false} className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">
                {new Date(order.createdAt).toLocaleString()}
              </span>
              <span className="font-semibold text-neutral-900">${order.total.toFixed(2)}</span>
            </div>
            <ul className="text-sm text-neutral-600">
              {order.lines.map((line) => (
                <li key={line.id}>
                  {line.quantity} × {line.menuItem.name}{" "}
                  <span className="text-neutral-400">(${line.unitPrice.toFixed(2)} each)</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
