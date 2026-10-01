"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminAgentsPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: adminApi.listAgents,
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System-Wide Agent Overview</h2>
            <p className="text-sm text-muted-foreground">
              Audit all autonomous AI agents configured across all tenant user accounts.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading system agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No agents found system-wide</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="flex flex-col justify-between hover:border-purple-500/40 transition-all">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {agent.role}
                    </Badge>
                    <Badge variant={agent.is_active ? "success" : "secondary"} className="text-[10px]">
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{agent.name}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {agent.description || "No description provided."}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner ID:</span>
                      <span className="font-mono truncate max-w-[120px]">{agent.owner_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-semibold">{agent.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-semibold text-primary">v{agent.current_version}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground border-t pt-2">
                    Created {formatDate(agent.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
