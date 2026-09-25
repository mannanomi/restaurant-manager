"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
type ToastInput = { message: string; tone?: Toast["tone"] };

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

type UIContextValue = {
  toast: (input: ToastInput | string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const UIContext = createContext<UIContextValue | null>(null);

export function useToast() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useToast must be used within UIProvider");
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useConfirm must be used within UIProvider");
  return ctx.confirm;
}

export default function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((input: ToastInput | string) => {
    const { message, tone = "info" } = typeof input === "string" ? { message: input } : input;
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  function closeConfirm(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-64 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${
              t.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : t.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-neutral-200 bg-white text-neutral-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">{confirmState.title}</h3>
            {confirmState.description && (
              <p className="mt-1.5 text-sm text-neutral-500">{confirmState.description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => closeConfirm(false)}
                className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium text-white ${
                  confirmState.tone === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-neutral-900 hover:bg-neutral-700"
                }`}
              >
                {confirmState.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
