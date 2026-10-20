"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type ToastTone = "success" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: ReactNode;
}

type ShowToast = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

const DURATION_MS = { success: 4000, error: 8000 } as const;

/**
 * Lightweight toasts. Messages are rendered inside persistent live regions
 * (polite for success, assertive for errors) so screen readers announce them.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (toast) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DURATION_MS[toast.tone]);
    },
    [dismiss],
  );

  const region = (tone: ToastTone) => (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className="flex w-full flex-col items-center gap-2 sm:items-end"
    >
      {toasts
        .filter((toast) => toast.tone === tone)
        .map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg"
          >
            {tone === "success" ? (
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
            ) : (
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">{toast.title}</p>
              {toast.description && <div className="mt-0.5 break-words text-muted">{toast.description}</div>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 rounded-md p-1 text-muted hover:bg-ink/5 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
    </div>
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end print:hidden">
        {region("success")}
        {region("error")}
      </div>
    </ToastContext.Provider>
  );
}
