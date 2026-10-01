"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Server, ArrowLeft, Activity, ExternalLink, Database, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import Link from "next/link";

export default function AdminSystemPage() {
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["admin-system-metrics"],
    queryFn: adminApi.getSystemMetrics,
  });

  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: adminApi.getSystemHealth,
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">System Health & Telemetry</h2>
              <p className="text-sm text-muted-foreground">
                Deep health probes, Prometheus metrics telemetry, and Grafana monitoring links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" /> Grafana Dashboards
              </Button>
            </a>
            <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" /> Prometheus Metrics
              </Button>
            </a>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isMetricsLoading ? "..." : `${Math.floor((metrics?.uptime_seconds || 0) / 60)} min`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Backend service process uptime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {isMetricsLoading ? "..." : `${metrics?.error_rate_percentage || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Task execution failure percentage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Active Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isMetricsLoading ? "..." : metrics?.active_db_connections || 1}
              </div>
              <p className="text-xs text-muted-foreground mt-1">PostgreSQL pool active connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Chroma Vectors Indexed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {isMetricsLoading ? "..." : metrics?.chroma_vector_count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Memories indexed in vector store</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Component Probes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-400" /> Component Health Probes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isHealthLoading ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Running health probes...</div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">PostgreSQL Relational Database</h4>
                    <p className="text-xs text-muted-foreground">Primary transactional storage engine</p>
                  </div>
                  <Badge variant={health?.components?.database?.status === "healthy" ? "success" : "destructive"}>
                    {health?.components?.database?.status || "healthy"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Redis In-Memory Cache & Broker</h4>
                    <p className="text-xs text-muted-foreground">Celery task broker & rate limiter cache</p>
                  </div>
                  <Badge variant={health?.components?.redis?.status === "healthy" ? "success" : "secondary"}>
                    {health?.components?.redis?.status || "healthy"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">ChromaDB Semantic Vector Index</h4>
                    <p className="text-xs text-muted-foreground">Dense embeddings memory store</p>
                  </div>
                  <Badge variant={health?.components?.vector_store?.status === "healthy" ? "success" : "secondary"}>
                    {health?.components?.vector_store?.status || "healthy"}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Celery Background Automation Engine</h4>
                    <p className="text-xs text-muted-foreground">Asynchronous task execution workers</p>
                  </div>
                  <Badge variant={health?.components?.celery?.status === "healthy" ? "success" : "secondary"}>
                    {health?.components?.celery?.status || "healthy"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
