import React from "react";
import { create } from "zustand";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: any, description?: any) =>
    useToastStore.getState().addToast({
      title: typeof title === "string" ? title : String(title || "Success"),
      description: description ? (typeof description === "string" ? description : JSON.stringify(description)) : undefined,
      type: "success",
    }),
  error: (title: any, description?: any) =>
    useToastStore.getState().addToast({
      title: typeof title === "string" ? title : String(title || "Error"),
      description: description ? (typeof description === "string" ? description : JSON.stringify(description)) : undefined,
      type: "error",
    }),
  info: (title: any, description?: any) =>
    useToastStore.getState().addToast({
      title: typeof title === "string" ? title : String(title || "Notice"),
      description: description ? (typeof description === "string" ? description : JSON.stringify(description)) : undefined,
      type: "info",
    }),
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start justify-between rounded-lg border p-4 shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-2",
            t.type === "success" && "border-emerald-500/30 bg-emerald-950/80 text-emerald-200",
            t.type === "error" && "border-rose-500/30 bg-rose-950/80 text-rose-200",
            t.type === "info" && "border-blue-500/30 bg-blue-950/80 text-blue-200"
          )}
        >
          <div className="flex items-start gap-3">
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold text-sm">{t.title}</p>
              {t.description && <p className="text-xs opacity-90 mt-1">{t.description}</p>}
            </div>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="p-1 rounded opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
