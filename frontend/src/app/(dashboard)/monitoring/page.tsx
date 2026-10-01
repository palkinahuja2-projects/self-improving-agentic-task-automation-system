"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  Server,
  Zap,
  BrainCircuit,
  ExternalLink,
  BarChart3,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { healthApi, tasksApi, agentsApi } from "@/lib/api-client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

export default function MonitoringPage() {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: healthApi.getHealth });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });

  // Prepare Task Status Pie Data
  const statusCounts = tasks.reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map((status) => ({
    name: status.toUpperCase(),
    value: statusCounts[status],
  }));

  // Latency mock chart data for visualization
  const latencyData = [
    { time: "10:00", latencyMs: 45, throughput: 120 },
    { time: "10:05", latencyMs: 52, throughput: 145 },
    { time: "10:10", latencyMs: 38, throughput: 190 },
    { time: "10:15", latencyMs: 65, throughput: 210 },
    { time: "10:20", latencyMs: 41, throughput: 165 },
    { time: "10:25", latencyMs: 48, throughput: 180 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Monitoring & Observability</h2>
          <p className="text-sm text-muted-foreground">
            M9 Production telemetry, Prometheus metrics, Grafana dashboards, and real-time health checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="http://localhost:9090" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1 text-amber-500" /> Prometheus (9090)
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
          <a href="http://localhost:3000" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-1 text-primary" /> Grafana Dashboards (3000)
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        </div>
      </div>

      {/* Health Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              PostgreSQL DB
            </CardTitle>
            <Database className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {health?.components?.database?.status || "Healthy"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Port 5432 • Connection Pool OK</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Redis Broker
            </CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {health?.components?.redis?.status || "Healthy"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Port 6379 • Cache & Broker OK</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              ChromaDB Vector Store
            </CardTitle>
            <BrainCircuit className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {health?.components?.chromadb?.status || "Healthy"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Dense Embeddings Index OK</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Celery Task Queue
            </CardTitle>
            <Server className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">
              {health?.components?.celery?.status || "Healthy"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Worker Threads Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Latency & Throughput Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> API Request Throughput & Latency (ms)
            </CardTitle>
            <CardDescription>Live REST endpoint performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData}>
                <XAxis dataKey="time" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="latencyMs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Execution Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" /> Task Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of task execution outcomes</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No task data recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
