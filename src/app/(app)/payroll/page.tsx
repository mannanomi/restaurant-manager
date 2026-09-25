"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/UIProvider";

type Shift = { id: string; date: string; hoursWorked: number; payPeriod: string };
type StaffMember = {
  id: string;
  name: string;
  hourlyRate: number;
  active: boolean;
  shifts: Shift[];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PayrollPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStaff, setNewStaff] = useState({ name: "", hourlyRate: "" });
  const [shiftDraft, setShiftDraft] = useState({
    staffMemberId: "",
    date: todayStr(),
    hoursWorked: "",
    payPeriod: todayStr().slice(0, 7), // default to current month, e.g. "2026-09"
  });
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [error, setError] = useState("");

  function load() {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data: StaffMember[]) => {
        setStaff(data);
        setLoading(false);
        if (data[0]) {
          setShiftDraft((p) => (p.staffMemberId ? p : { ...p, staffMemberId: data[0].id }));
        }
      });
  }

  useEffect(load, []);

  const payPeriods = useMemo(() => {
    const set = new Set<string>();
    for (const s of staff) for (const sh of s.shifts) set.add(sh.payPeriod);
    return [...set].sort().reverse();
  }, [staff]);

  // Default to the most recent pay period until the user picks one explicitly,
  // without syncing it into state (avoids an extra render-triggering effect).
  const effectivePeriod = selectedPeriod || payPeriods[0] || "";

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newStaff.name || !newStaff.hourlyRate) {
      setError("Name and hourly rate are required");
      return;
    }
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff),
    });
    if (res.ok) {
      setNewStaff({ name: "", hourlyRate: "" });
      load();
      toast({ message: "Staff member added", tone: "success" });
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add staff member");
    }
  }

  async function logShift(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!shiftDraft.staffMemberId || !shiftDraft.hoursWorked || !shiftDraft.payPeriod) {
      setError("Staff, hours, and pay period are required");
      return;
    }
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftDraft),
    });
    if (res.ok) {
      setShiftDraft((p) => ({ ...p, hoursWorked: "" }));
      load();
      toast({ message: "Shift logged", tone: "success" });
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not log shift");
    }
  }

  async function removeShift(id: string) {
    await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    load();
  }

  const summary = useMemo(() => {
    return staff
      .map((s) => {
        const hours = s.shifts
          .filter((sh) => sh.payPeriod === effectivePeriod)
          .reduce((sum, sh) => sum + sh.hoursWorked, 0);
        return { ...s, hours, pay: hours * s.hourlyRate };
      })
      .filter((s) => s.hours > 0);
  }, [staff, effectivePeriod]);

  const totalPay = summary.reduce((sum, s) => sum + s.pay, 0);

  if (loading) return <div className="p-8 text-neutral-500">Loading payroll…</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Payroll" description="Staff roster, logged shifts, and pay-period summaries." />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-neutral-900">Staff</h2>
        <ul className="mb-4 flex flex-col divide-y divide-neutral-100 text-sm">
          {staff.map((s) => (
            <li key={s.id} className="flex justify-between py-1.5">
              <span className="text-neutral-800">{s.name}</span>
              <span className="text-neutral-500">${s.hourlyRate.toFixed(2)}/hr</span>
            </li>
          ))}
          {staff.length === 0 && <li className="py-1.5 text-neutral-400">No staff yet.</li>}
        </ul>
        <form onSubmit={addStaff} className="flex gap-2">
          <input
            placeholder="Name"
            value={newStaff.name}
            onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
            className="input flex-1"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Hourly rate"
            value={newStaff.hourlyRate}
            onChange={(e) => setNewStaff((p) => ({ ...p, hourlyRate: e.target.value }))}
            className="input w-32"
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-neutral-900">Log Shift</h2>
        <form onSubmit={logShift} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={shiftDraft.staffMemberId}
            onChange={(e) => setShiftDraft((p) => ({ ...p, staffMemberId: e.target.value }))}
            className="input"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={shiftDraft.date}
            onChange={(e) => setShiftDraft((p) => ({ ...p, date: e.target.value }))}
            className="input"
          />
          <input
            type="number"
            step="0.25"
            placeholder="Hours"
            value={shiftDraft.hoursWorked}
            onChange={(e) => setShiftDraft((p) => ({ ...p, hoursWorked: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Pay period (e.g. 2026-09)"
            value={shiftDraft.payPeriod}
            onChange={(e) => setShiftDraft((p) => ({ ...p, payPeriod: e.target.value }))}
            className="input"
          />
          <Button type="submit" variant="primary" className="col-span-2 sm:col-span-4">
            Log Shift
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Pay Summary</h2>
          <select
            value={effectivePeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input py-1"
          >
            {payPeriods.length === 0 && <option value="">No shifts logged</option>}
            {payPeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-1">Staff</th>
              <th className="py-1 text-right">Hours</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Pay</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100">
                <td className="py-1.5">{s.name}</td>
                <td className="py-1.5 text-right">{s.hours}</td>
                <td className="py-1.5 text-right">${s.hourlyRate.toFixed(2)}</td>
                <td className="py-1.5 text-right">${s.pay.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.length > 0 && (
          <div className="mt-3 flex justify-between border-t border-neutral-200 pt-2 font-semibold text-neutral-900">
            <span>Total</span>
            <span>${totalPay.toFixed(2)}</span>
          </div>
        )}
        {summary.length === 0 && (
          <p className="mt-2 text-sm text-neutral-400">No shifts logged for this pay period.</p>
        )}
      </Card>

      {staff.some((s) => s.shifts.length > 0) && (
        <Card className="mt-6">
          <h2 className="mb-3 font-semibold text-neutral-900">Recent Shifts</h2>
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {staff
              .flatMap((s) => s.shifts.map((sh) => ({ ...sh, staffName: s.name })))
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map((sh) => (
                <li key={sh.id} className="flex items-center justify-between py-1.5">
                  <span className="text-neutral-700">
                    {new Date(sh.date).toLocaleDateString()} · {sh.staffName} · {sh.hoursWorked}h ·{" "}
                    {sh.payPeriod}
                  </span>
                  <button
                    onClick={() => removeShift(sh.id)}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete shift"
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
