"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast, useConfirm } from "@/components/ui/UIProvider";

type Expense = { id: string; category: string; amount: number; date: string; note: string | null };

const CATEGORIES = ["Vendor Purchase", "Utilities", "Rent", "Repairs", "Other"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    category: CATEGORIES[0],
    amount: "",
    date: todayStr(),
    note: "",
  });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data: Expense[]) => {
        setExpenses(data);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!draft.amount) {
      setError("Amount is required");
      return;
    }
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft({ category: CATEGORIES[0], amount: "", date: todayStr(), note: "" });
      load();
      toast({ message: "Expense logged", tone: "success" });
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add expense");
    }
  }

  async function removeExpense(exp: Expense) {
    const ok = await confirm({
      title: "Delete this expense?",
      description: `${exp.category} — $${exp.amount.toFixed(2)} on ${new Date(exp.date).toLocaleDateString()}`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/expenses/${exp.id}`, { method: "DELETE" });
    load();
    toast({ message: "Expense deleted", tone: "success" });
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <div className="p-8 text-neutral-500">Loading expenses…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Expenses" description="Track vendor purchases, utilities, and other outgoings." />

      <Card className="mb-6">
        <form onSubmit={addExpense} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <select
            value={draft.category}
            onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={draft.amount}
            onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
            className="input"
          />
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Note (optional)"
            value={draft.note}
            onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
            className="input"
          />
          <Button type="submit" variant="primary">
            Add Expense
          </Button>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        </form>
      </Card>

      <div className="mb-2 text-sm text-neutral-500">
        Total: <span className="font-semibold text-neutral-900">${total.toFixed(2)}</span>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Note</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-t border-neutral-100 hover:bg-neutral-50/60">
                  <td className="px-4 py-2.5">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{exp.category}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{exp.note ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">${exp.amount.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => removeExpense(exp)}
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete expense"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    No expenses logged yet.
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
