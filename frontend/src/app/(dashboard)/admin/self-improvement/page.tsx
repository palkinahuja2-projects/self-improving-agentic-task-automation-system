"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatErrorMessage } from "@/lib/utils";
import { ImprovementProposal } from "@/types";

export default function AdminSelfImprovementPage() {
  const { data: proposals, isLoading, error } = useQuery<ImprovementProposal[]>({
    queryKey: ["admin-self-improvement-proposals"],
    queryFn: adminApi.listSelfImprovementProposals,
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Self-Improvement Proposals & Telemetry</h2>
            <p className="text-sm text-muted-foreground">
              System-wide AI optimization proposals, performance evaluation scores, and autonomous strategy updates.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {proposals?.length || 0} Proposals
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading self-improvement proposals...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-destructive/15 text-destructive text-sm font-medium">
            Failed to load self-improvement proposals: {formatErrorMessage(error)}
          </div>
        ) : !proposals || proposals.length === 0 ? (
          <Card className="p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-purple-400 mb-3" />
            <h3 className="font-semibold text-lg">No Self-Improvement Proposals Recorded</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Autonomous self-improvement proposals and agent optimization strategies will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposals.map((prop: ImprovementProposal) => (
              <Card key={prop.id} className="hover:border-purple-500/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-semibold">{prop.title || "Improvement Proposal"}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Agent ID: <span className="font-mono text-foreground">{prop.agent_id}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={prop.status === "applied" ? "success" : "secondary"}>
                      {prop.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {prop.description && (
                    <p className="text-muted-foreground">{prop.description}</p>
                  )}

                  <div className="flex items-center justify-between border-t pt-3 text-[11px]">
                    <span className="text-muted-foreground">
                      Status: <span className="font-semibold text-foreground uppercase">{prop.status}</span>
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {new Date(prop.created_at).toLocaleDateString()}
                    </span>
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
