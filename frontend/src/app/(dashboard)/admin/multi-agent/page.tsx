"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatErrorMessage } from "@/lib/utils";
import { MultiAgentExecution } from "@/types";

export default function AdminMultiAgentExecutionsPage() {
  const { data: executions, isLoading, error } = useQuery<MultiAgentExecution[]>({
    queryKey: ["admin-multi-agent-executions"],
    queryFn: adminApi.listMultiAgentExecutions,
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Multi-Agent Swarm Executions</h2>
            <p className="text-sm text-muted-foreground">
              System-wide orchestration history and execution traces across all multi-agent graph runs.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {executions?.length || 0} Total Executions
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading multi-agent execution traces...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-destructive/15 text-destructive text-sm font-medium">
            Failed to load execution traces: {formatErrorMessage(error)}
          </div>
        ) : !executions || executions.length === 0 ? (
          <Card className="p-8 text-center">
            <Users2 className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-lg">No Multi-Agent Executions</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Multi-agent graph executions triggered by users will appear in this administrative ledger.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {executions.map((exec: MultiAgentExecution) => (
              <Card key={exec.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-semibold">{exec.objective}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Execution ID: <span className="font-mono text-foreground">{exec.id}</span> • Owner ID: <span className="font-mono">{exec.owner_id}</span>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        exec.status === "completed"
                          ? "success"
                          : exec.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {exec.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Started: {new Date(exec.created_at).toLocaleString()}
                    </span>
                    {exec.execution_time && (
                      <span>Duration: {exec.execution_time.toFixed(2)}s</span>
                    )}
                    {exec.total_tokens !== undefined && (
                      <span>Tokens: {exec.total_tokens}</span>
                    )}
                  </div>

                  {exec.agents_used && exec.agents_used.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">Agents Involved:</span>
                      <div className="flex flex-wrap gap-1">
                        {exec.agents_used.map((agentId: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-accent font-mono text-[10px]"
                          >
                            {agentId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {exec.result && (
                    <div className="p-3 rounded-lg bg-muted/60 font-mono text-[11px] overflow-x-auto max-h-36">
                      <pre>{JSON.stringify(exec.result, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
