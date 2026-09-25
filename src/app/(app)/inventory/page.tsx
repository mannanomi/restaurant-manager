"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/UIProvider";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  reorderThreshold: number;
  preferredVendor: string | null;
};

export default function InventoryPage() {
  const toast = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    unit: "",
    stockQty: "",
    reorderThreshold: "",
    preferredVendor: "",
  });
  const [addError, setAddError] = useState("");

  function load() {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((data: Ingredient[]) => {
        setIngredients(data);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function saveStock(id: string) {
    const value = editing[id];
    if (value === undefined) return;
    const res = await fetch(`/api/ingredients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty: Number(value) }),
    });
    if (res.ok) {
      const updated = { ...editing };
      delete updated[id];
      setEditing(updated);
      load();
      toast({ message: "Stock level updated", tone: "success" });
    } else {
      const data = await res.json();
      toast({ message: data.error ?? "Update failed (manager access required)", tone: "error" });
    }
  }

  async function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newIngredient),
    });
    if (res.ok) {
      setNewIngredient({ name: "", unit: "", stockQty: "", reorderThreshold: "", preferredVendor: "" });
      setShowAddForm(false);
      load();
      toast({ message: "Ingredient added", tone: "success" });
    } else {
      const data = await res.json();
      setAddError(data.error ?? "Could not add ingredient (manager access required)");
    }
  }

  const lowStock = ingredients.filter((i) => i.stockQty <= i.reorderThreshold);
  const visible = useMemo(
    () => ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [ingredients, search],
  );

  if (loading) return <div className="p-8 text-neutral-500">Loading inventory…</div>;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Live stock levels across every ingredient, garnish, and packaging item."
        actions={
          <>
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? "Cancel" : "+ New Ingredient"}
            </Button>
          </>
        }
      />

      {showAddForm && (
        <Card className="mb-5">
          <form onSubmit={addIngredient} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Name">
              <input
                required
                value={newIngredient.name}
                onChange={(e) => setNewIngredient((p) => ({ ...p, name: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Unit">
              <input
                required
                placeholder="g, ml, each"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient((p) => ({ ...p, unit: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Starting stock">
              <input
                required
                type="number"
                value={newIngredient.stockQty}
                onChange={(e) => setNewIngredient((p) => ({ ...p, stockQty: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Reorder threshold">
              <input
                required
                type="number"
                value={newIngredient.reorderThreshold}
                onChange={(e) => setNewIngredient((p) => ({ ...p, reorderThreshold: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Preferred vendor">
              <input
                placeholder="Optional"
                value={newIngredient.preferredVendor}
                onChange={(e) => setNewIngredient((p) => ({ ...p, preferredVendor: e.target.value }))}
                className="input"
              />
            </Field>
            <div className="col-span-2 flex items-end sm:col-span-5">
              {addError && <p className="mr-auto text-sm text-red-600">{addError}</p>}
              <Button type="submit" variant="primary">
                Add Ingredient
              </Button>
            </div>
          </form>
        </Card>
      )}

      {lowStock.length > 0 && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="font-medium">{lowStock.length}</span>
          <span>
            ingredient{lowStock.length !== 1 && "s"} at or below reorder threshold:{" "}
            {lowStock.map((i) => i.name).join(", ")}
          </span>
        </div>
      )}

      <input
        placeholder="Search ingredients…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-3 w-full max-w-xs"
      />

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ingredient</th>
                <th className="px-4 py-2.5 font-medium">Stock</th>
                <th className="px-4 py-2.5 font-medium">Reorder At</th>
                <th className="px-4 py-2.5 font-medium">Vendor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ing) => {
                const low = ing.stockQty <= ing.reorderThreshold;
                const critical = ing.stockQty <= ing.reorderThreshold / 2;
                return (
                  <tr key={ing.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{ing.name}</td>
                    <td className="px-4 py-2.5">
                      {ing.stockQty} {ing.unit}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {ing.reorderThreshold} {ing.unit}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{ing.preferredVendor ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {low ? (
                        <Badge tone={critical ? "danger" : "warning"}>
                          {critical ? "Critical" : "Low stock"}
                        </Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder={String(ing.stockQty)}
                          value={editing[ing.id] ?? ""}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [ing.id]: e.target.value }))
                          }
                          className="input w-20 py-1"
                        />
                        <Button size="sm" onClick={() => saveStock(ing.id)}>
                          Set
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No ingredients match &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
      {label}
      {children}
    </label>
  );
}
