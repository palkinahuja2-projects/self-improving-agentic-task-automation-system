"use client";

import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastContainer } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300">
          <AppHeader />
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
