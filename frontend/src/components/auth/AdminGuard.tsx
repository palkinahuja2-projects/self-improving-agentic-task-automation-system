"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const isAdmin = user?.role === "admin" || !!user?.is_superuser;

  useEffect(() => {
    if (isInitialized) {
      if (!user) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [isInitialized, user, isAdmin, router]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center space-y-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          You do not have administrative privileges required to access this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
