"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast, useConfirm } from "@/components/ui/UIProvider";

type Ingredient = { id: string; name: string; unit: string };
type Line = { id: string; quantity: number; ingredient: Ingredient };
type PurchaseOrder = {
  id: string;
  vendor: string;
  status: "draft" | "sent";
  createdAt: string;
  sentAt: string | null;
  lines: Line[];
};

export default function PurchaseOrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingQty, setEditingQty] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((data: PurchaseOrder[]) => {
        setPos(data);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate" }),
    });
    const data = await res.json();
    setGenerating(false);
    toast({
      message: data.created?.length
        ? `Drafted ${data.created.length} purchase order${data.created.length !== 1 ? "s" : ""}`
        : "Nothing to draft — no low-stock ingredients without an open draft",
      tone: data.created?.length ? "success" : "info",
    });
    load();
  }

  async function saveLineQty(poId: string, lineId: string) {
    const value = editingQty[lineId];
    if (value === undefined) return;
    await fetch(`/api/purchase-orders/${poId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: [{ id: lineId, quantity: Number(value) }] }),
    });
    const updated = { ...editingQty };
    delete updated[lineId];
    setEditingQty(updated);
    load();
  }

  async function markSent(poId: string) {
    const ok = await confirm({
      title: "Mark this purchase order as sent?",
      description: "Sent orders are locked and can no longer be edited or deleted.",
      confirmLabel: "Mark as Sent",
    });
    if (!ok) return;
    await fetch(`/api/purchase-orders/${poId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    load();
    toast({ message: "Purchase order marked as sent", tone: "success" });
  }

  async function removePo(poId: string) {
    const ok = await confirm({
      title: "Delete this draft purchase order?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/purchase-orders/${poId}`, { method: "DELETE" });
    load();
    toast({ message: "Draft purchase order deleted", tone: "success" });
  }

  if (loading) return <div className="p-8 text-neutral-500">Loading purchase orders…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Purchase Orders"
        description="Draft reorders for vendors when stock runs low, then send them for a manager to place."
        actions={
          <Button variant="primary" onClick={generate} disabled={generating}>
            {generating ? "Checking stock…" : "Generate from Low Stock"}
          </Button>
        }
      />

      {pos.length === 0 && (
        <Card>
          <p className="text-center text-sm text-neutral-400">
            No purchase orders yet. Click &ldquo;Generate from Low Stock&rdquo; to draft one.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {pos.map((po) => (
          <Card key={po.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900">{po.vendor}</span>
                <Badge tone={po.status === "sent" ? "success" : "warning"}>{po.status}</Badge>
              </div>
              <span className="text-xs text-neutral-400">
                {new Date(po.createdAt).toLocaleDateString()}
              </span>
            </div>

            <table className="w-full text-sm">
              <tbody>
                {po.lines.map((line) => (
                  <tr key={line.id} className="border-t border-neutral-100">
                    <td className="py-2">{line.ingredient.name}</td>
                    <td className="py-2 text-right">
                      {po.status === "draft" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            placeholder={String(line.quantity)}
                            value={editingQty[line.id] ?? ""}
                            onChange={(e) =>
                              setEditingQty((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            className="input w-20 py-1 text-right"
                          />
                          <span className="text-neutral-500">{line.ingredient.unit}</span>
                          <Button size="sm" onClick={() => saveLineQty(po.id, line.id)}>
                            Set
                          </Button>
                        </div>
                      ) : (
                        <span>
                          {line.quantity} {line.ingredient.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {po.status === "draft" && (
              <div className="mt-4 flex gap-2">
                <Button variant="primary" size="sm" onClick={() => markSent(po.id)}>
                  Mark as Sent
                </Button>
                <Button variant="danger" size="sm" onClick={() => removePo(po.id)}>
                  Delete
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
