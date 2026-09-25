"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useToast, useConfirm } from "@/components/ui/UIProvider";

type Ingredient = { id: string; name: string; unit: string };
type RecipeLine = { id: string; quantity: number; unit: string; ingredient: Ingredient };
type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  recipeLines: RecipeLine[];
};

type DraftLine = { ingredientId: string; quantity: string; unit: string };

const emptyDraft = { name: "", price: "", category: "" };

export default function MenuPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [error, setError] = useState("");

  function load() {
    Promise.all([
      fetch("/api/menu-items").then((r) => r.json()),
      fetch("/api/ingredients").then((r) => r.json()),
    ]).then(([items, ings]) => {
      setMenuItems(items);
      setIngredients(ings);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function startNew() {
    setEditingId("new");
    setDraft(emptyDraft);
    setDraftLines([]);
    setError("");
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setDraft({ name: item.name, price: String(item.price), category: item.category });
    setDraftLines(
      item.recipeLines.map((l) => ({
        ingredientId: l.ingredient.id,
        quantity: String(l.quantity),
        unit: l.unit,
      })),
    );
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function addDraftLine() {
    if (ingredients.length === 0) return;
    setDraftLines((prev) => [
      ...prev,
      { ingredientId: ingredients[0].id, quantity: "1", unit: ingredients[0].unit },
    ]);
  }

  function updateDraftLine(index: number, patch: Partial<DraftLine>) {
    setDraftLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeDraftLine(index: number) {
    setDraftLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setError("");
    if (!draft.name || !draft.price || !draft.category) {
      setError("Name, price, and category are required");
      return;
    }
    if (draftLines.length === 0) {
      setError("Add at least one recipe line");
      return;
    }

    const payload = {
      name: draft.name,
      price: Number(draft.price),
      category: draft.category,
      recipeLines: draftLines.map((l) => ({
        ingredientId: l.ingredientId,
        quantity: Number(l.quantity),
        unit: l.unit,
      })),
    };

    const url = editingId === "new" ? "/api/menu-items" : `/api/menu-items/${editingId}`;
    const method = editingId === "new" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const wasNew = editingId === "new";
      setEditingId(null);
      load();
      toast({ message: wasNew ? "Menu item created" : "Menu item updated", tone: "success" });
    } else {
      const data = await res.json();
      setError(data.error ?? "Save failed");
    }
  }

  async function removeItem(item: MenuItem) {
    const ok = await confirm({
      title: `Remove "${item.name}"?`,
      description: "If it has past orders it will be deactivated instead of deleted.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      load();
      toast({
        message: data.deactivated ? `"${item.name}" deactivated (has order history)` : `"${item.name}" removed`,
        tone: "success",
      });
    }
  }

  if (loading) return <div className="p-8 text-neutral-500">Loading…</div>;

  const isEditing = editingId !== null;
  const grouped = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Menu & Recipes"
        description="Every menu item's price and the recipe that drives inventory deduction."
        actions={
          !isEditing && (
            <Button variant="primary" onClick={startNew}>
              + New Menu Item
            </Button>
          )
        }
      />

      {isEditing && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-neutral-900">
            {editingId === "new" ? "New Menu Item" : "Edit Menu Item"}
          </h2>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                value={draft.price}
                onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
                className="input"
              />
            </Field>
          </div>

          <h3 className="mb-2 text-sm font-medium text-neutral-600">
            Recipe — ingredients consumed per item sold
          </h3>
          <div className="flex flex-col gap-2">
            {draftLines.map((line, i) => {
              const ing = ingredients.find((x) => x.id === line.ingredientId);
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={line.ingredientId}
                    onChange={(e) => {
                      const newIng = ingredients.find((x) => x.id === e.target.value);
                      updateDraftLine(i, {
                        ingredientId: e.target.value,
                        unit: newIng?.unit ?? line.unit,
                      });
                    }}
                    className="input flex-1"
                  >
                    {ingredients.map((ing2) => (
                      <option key={ing2.id} value={ing2.id}>
                        {ing2.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateDraftLine(i, { quantity: e.target.value })}
                    className="input w-24"
                  />
                  <span className="w-10 text-sm text-neutral-500">{ing?.unit}</span>
                  <button
                    onClick={() => removeDraftLine(i)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove ingredient line"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {draftLines.length === 0 && (
              <p className="text-sm text-neutral-400">No recipe lines yet — add at least one.</p>
            )}
          </div>
          <button
            onClick={addDraftLine}
            className="mt-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            + Add ingredient line
          </button>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-5 flex gap-2">
            <Button variant="primary" onClick={save}>
              Save
            </Button>
            <Button variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <Card key={item.id} padded={false} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-neutral-900">
                      {item.name}
                      {!item.active && <Badge tone="neutral">Inactive</Badge>}
                    </div>
                    <div className="text-sm text-neutral-500">
                      ${item.price.toFixed(2)} · {item.recipeLines.length} ingredient
                      {item.recipeLines.length !== 1 && "s"}
                    </div>
                    <div className="mt-1 truncate text-xs text-neutral-400">
                      {item.recipeLines
                        .map((l) => `${l.ingredient.name} (${l.quantity}${l.unit})`)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeItem(item)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <p className="text-sm text-neutral-400">No menu items yet — create your first one above.</p>
        )}
      </div>
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
