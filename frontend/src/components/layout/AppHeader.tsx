"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, string> = {
  "/dashboard": "System Dashboard",
  "/agents": "Agent Management",
  "/memories": "Memory System",
  "/tasks": "Task Automation",
  "/workflows": "Workflow Studio & Visual Builder",
  "/multi-agent": "Multi-Agent System",
  "/self-improvement": "Self-Improvement Engine",
  "/monitoring": "System Monitoring & Telemetry",
  "/profile": "User Profile & Security",
};

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title =
    Object.entries(pageTitles).find(([route]) => pathname && pathname.startsWith(route))?.[1] ||
    "Agentic Platform";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Badge variant="outline" className="capitalize text-[10px]">
              {user.role}
            </Badge>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
};
