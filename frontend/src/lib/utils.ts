import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}

export function formatErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;

  // Axios error with backend detail
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === "string") return item;
        const loc = item.loc ? item.loc.filter((l: any) => l !== "body").join(".") : "";
        return loc ? `${loc}: ${item.msg}` : item.msg || JSON.stringify(item);
      })
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    if (detail.message) return String(detail.message);
    if (detail.msg) return String(detail.msg);
    return JSON.stringify(detail);
  }

  if (err.message && typeof err.message === "string") return err.message;

  return "An error occurred while processing your request.";
}

export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 4 || password.length > 12) {
    return { valid: false, message: "Password must be 4 to 12 characters long." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one numeric digit." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special symbol." };
  }
  return { valid: true, message: "" };
}

