"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  BrainCircuit,
  CheckSquare,
  Workflow,
  Users2,
  Sparkles,
  Activity,
  User,
  LogOut,
  ChevronLeft,
  Menu,
  Shield,
  FileText,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Memories", href: "/memories", icon: BrainCircuit },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Multi-Agent System", href: "/multi-agent", icon: Users2 },
  { label: "Self-Improvement", href: "/self-improvement", icon: Sparkles },
  { label: "Monitoring", href: "/monitoring", icon: Activity },
  { label: "User Profile", href: "/profile", icon: User },
];

const adminNavItems = [
  { label: "Admin Console", href: "/admin", icon: Shield },
  { label: "User Management", href: "/admin/users", icon: Users2 },
  { label: "Multi-Agent Swarm", href: "/admin/multi-agent", icon: Users2 },
  { label: "Self-Improvement", href: "/admin/self-improvement", icon: Sparkles },
  { label: "Audit Trail", href: "/admin/audit-logs", icon: FileText },
  { label: "System Telemetry", href: "/admin/system", icon: Server },
];

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "admin" || !!user?.is_superuser;

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-card border-r transition-all duration-300 flex flex-col justify-between overflow-y-auto",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div>
          {/* Header Branding */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            {!collapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                  AI
                </div>
                <span className="font-bold text-sm tracking-tight truncate">
                  Agentic System
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname
                ? pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== "/dashboard")
                : false;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}

            {/* Admin Console Section */}
            {isAdmin && (
              <div className="pt-4 space-y-1 border-t mt-3">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Admin Console
                  </p>
                )}
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname ? pathname === item.href : false;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isActive
                          ? "bg-rose-500 text-white font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-rose-400" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="p-3 border-t">
          {!collapsed && user && (
            <div className="mb-2 px-2">
              <p className="text-xs font-semibold truncate">{user.username || user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role} Role</p>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 justify-start",
              collapsed && "px-2 justify-center"
            )}
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};
