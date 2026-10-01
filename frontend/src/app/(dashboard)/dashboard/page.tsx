"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  BrainCircuit,
  CheckSquare,
  Workflow,
  Activity,
  Plus,
  Play,
  Sparkles,
  Database,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  agentsApi,
  memoriesApi,
  tasksApi,
  workflowsApi,
  healthApi,
  multiAgentApi,
} from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });
  const { data: memories = [] } = useQuery({ queryKey: ["memories"], queryFn: () => memoriesApi.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const { data: workflows = [] } = useQuery({ queryKey: ["workflows"], queryFn: () => workflowsApi.list() });
  const { data: multiExecutions = [] } = useQuery({
    queryKey: ["multiExecutions"],
    queryFn: multiAgentApi.list,
  });
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: healthApi.getHealth });

  const activeAgents = agents.filter((a) => a.is_active).length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Autonomous Agentic Task Automation Platform with Memory, Workflows & Self-Improvement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/agents">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Agent
              </Button>
            </Link>
            <Link href="/tasks">
              <Button size="sm" variant="outline">
                <Play className="h-4 w-4 mr-1" /> New Task
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Agents
            </CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-emerald-500">{activeAgents} active</span> in system
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Memory Items
            </CardTitle>
            <BrainCircuit className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Short-term, long-term & vector index
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tasks Automated
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-blue-500">{completedTasks} completed</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Workflows Built
            </CardTitle>
            <Workflow className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Visual DAG node pipelines</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Section: System Health & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health Status Widget */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> System Infrastructure
              </CardTitle>
              <Badge
                variant={
                  health?.status === "ok"
                    ? "success"
                    : health?.status === "degraded"
                    ? "warning"
                    : "destructive"
                }
              >
                {health?.status || "checking..."}
              </Badge>
            </div>
            <CardDescription>M9 Production Health Checks</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium">PostgreSQL Database</span>
              </div>
              <Badge variant={health?.components?.database?.status === "healthy" ? "success" : "destructive"} className="text-[10px]">
                {health?.components?.database?.status || "online"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium">Redis Cache & Broker</span>
              </div>
              <Badge variant={health?.components?.redis?.status === "healthy" ? "success" : "destructive"} className="text-[10px]">
                {health?.components?.redis?.status || "online"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium">ChromaDB Vector Store</span>
              </div>
              <Badge variant={health?.components?.chromadb?.status === "healthy" ? "success" : "destructive"} className="text-[10px]">
                {health?.components?.chromadb?.status || "online"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium">Celery Task Workers</span>
              </div>
              <Badge variant={health?.components?.celery?.status === "healthy" ? "success" : "destructive"} className="text-[10px]">
                {health?.components?.celery?.status || "active"}
              </Badge>
            </div>

            <div className="pt-2">
              <Link href="/monitoring" className="w-full">
                <Button variant="outline" className="w-full text-xs" size="sm">
                  View Full Observability Suite
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions & Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Recent Execution Activity
            </CardTitle>
            <CardDescription>Live task and workflow execution history</CardDescription>
          </CardHeader>

          <CardContent>
            {tasks.length === 0 && multiExecutions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm space-y-3">
                <p>No recent task or multi-agent executions recorded yet.</p>
                <Link href="/tasks">
                  <Button variant="outline" size="sm">
                    Create & Execute First Task
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{t.name}</span>
                        <Badge
                          variant={
                            t.status === "completed"
                              ? "success"
                              : t.status === "failed"
                              ? "destructive"
                              : t.status === "running"
                              ? "info"
                              : "secondary"
                          }
                          className="text-[10px] capitalize"
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Retries: {t.retries_count} • Created {formatDate(t.created_at)}
                      </p>
                    </div>

                    <Link href="/tasks">
                      <Button variant="ghost" size="sm" className="text-xs">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
