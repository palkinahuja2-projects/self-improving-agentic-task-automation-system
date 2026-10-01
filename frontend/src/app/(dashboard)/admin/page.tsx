"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ShieldCheck,
  Bot,
  CheckSquare,
  Workflow,
  Users2,
  Sparkles,
  FileText,
  Activity,
  AlertTriangle,
  Server,
  Database,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatErrorMessage } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: stats, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: adminApi.getDashboardStats,
  });

  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: adminApi.getSystemHealth,
  });

  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["admin-system-metrics"],
    queryFn: adminApi.getSystemMetrics,
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">System Administration Console</h2>
              <Badge variant="destructive" className="uppercase text-[10px]">
                Admin Restricted
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              System-wide telemetry, user & RBAC management, resource audit trails, and multi-tenant observability.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/users">
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-1 text-primary" /> Manage Users
              </Button>
            </Link>
            <Link href="/admin/audit-logs">
              <Button size="sm">
                <FileText className="h-4 w-4 mr-1" /> View Audit Logs
              </Button>
            </Link>
          </div>
        </div>

        {/* System KPI Cards */}
        {isStatsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading admin statistics...</div>
        ) : statsError ? (
          <div className="p-4 rounded-xl bg-destructive/15 text-destructive text-sm font-medium">
            Failed to load admin stats: {formatErrorMessage(statsError)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  User Accounts
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active: <span className="text-emerald-500 font-semibold">{stats?.active_users || 0}</span> • Admins: <span className="text-rose-400 font-semibold">{stats?.admin_users || 0}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Autonomous Agents
                </CardTitle>
                <Bot className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_agents || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Configured AI Agents system-wide</p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Task Executions
                </CardTitle>
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed: <span className="text-emerald-500 font-semibold">{stats?.completed_tasks || 0}</span> • Failed: <span className="text-destructive font-semibold">{stats?.failed_tasks || 0}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                  Audit Log Events
                </CardTitle>
                <FileText className="h-4 w-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_audit_logs || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Logged admin & security events</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Infrastructure & Telemetry Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-400" /> Infrastructure Components Health
              </CardTitle>
              <CardDescription>
                Live health check probing database, cache, workers, and vector DB
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {isHealthLoading ? (
                <div className="text-center py-4 text-xs text-muted-foreground">Probing infrastructure...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between">
                    <span className="text-xs font-medium">PostgreSQL DB</span>
                    <Badge variant={health?.components?.database?.status === "healthy" ? "success" : "destructive"}>
                      {health?.components?.database?.status || "healthy"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between">
                    <span className="text-xs font-medium">Redis Cache</span>
                    <Badge variant={health?.components?.redis?.status === "healthy" ? "success" : "secondary"}>
                      {health?.components?.redis?.status || "healthy"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between">
                    <span className="text-xs font-medium">Chroma Vector DB</span>
                    <Badge variant={health?.components?.vector_store?.status === "healthy" ? "success" : "secondary"}>
                      {health?.components?.vector_store?.status || "healthy"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card/60 flex items-center justify-between">
                    <span className="text-xs font-medium">Celery Automation</span>
                    <Badge variant={health?.components?.celery?.status === "healthy" ? "success" : "secondary"}>
                      {health?.components?.celery?.status || "healthy"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Telemetry & Quick Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-400" /> Admin Console Modules
              </CardTitle>
              <CardDescription>
                Access administrative controls across system modules
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/admin/users" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>User & Role Management</span>
                <Users className="h-4 w-4 text-primary" />
              </Link>

              <Link href="/admin/audit-logs" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>Audit Logs Trail</span>
                <FileText className="h-4 w-4 text-amber-400" />
              </Link>

              <Link href="/admin/security" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>Security Events</span>
                <ShieldCheck className="h-4 w-4 text-rose-400" />
              </Link>

              <Link href="/admin/system" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>System Telemetry</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </Link>

              <Link href="/admin/agents" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>Agents Overview</span>
                <Bot className="h-4 w-4 text-purple-400" />
              </Link>

              <Link href="/admin/workflows" className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors flex items-center justify-between">
                <span>Workflows Overview</span>
                <Workflow className="h-4 w-4 text-blue-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
