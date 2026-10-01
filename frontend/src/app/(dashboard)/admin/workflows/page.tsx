"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Workflow, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminWorkflowsPage() {
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: adminApi.listWorkflows,
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
            <h2 className="text-2xl font-bold tracking-tight">System-Wide Workflow Overview</h2>
            <p className="text-sm text-muted-foreground">
              Inspect multi-node DAG workflows configured across all tenant user accounts.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading system workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <Workflow className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No workflows found system-wide</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => (
              <Card key={wf.id} className="flex flex-col justify-between hover:border-amber-500/40 transition-all">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={wf.status === "active" ? "success" : "secondary"} className="capitalize text-[10px]">
                      {wf.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {wf.nodes?.length || 0} Nodes
                    </span>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="truncate">{wf.name}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {wf.description || "No workflow description provided."}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-mono truncate max-w-[140px]">{wf.user_id || wf.owner_id}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground border-t pt-2">
                    Created {formatDate(wf.created_at)}
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
