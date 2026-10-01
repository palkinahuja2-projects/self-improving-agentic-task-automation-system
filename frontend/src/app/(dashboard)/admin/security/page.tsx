"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ArrowLeft, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminSecurityPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-security-events"],
    queryFn: adminApi.listSecurityEvents,
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
            <h2 className="text-2xl font-bold tracking-tight">Security Events & RBAC Audit</h2>
            <p className="text-sm text-muted-foreground">
              Monitor security-sensitive administrative operations, status changes, and access events.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading security events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No security anomalies or events logged</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <Card key={evt.id} className="hover:border-rose-500/40 transition-all">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px] font-mono">
                        {evt.action}
                      </Badge>
                      <span className="font-semibold">{evt.username || evt.user_id || "System"}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Resource Target: {evt.resource_type} (ID: {evt.resource_id || "N/A"})
                    </p>
                  </div>
                  <span className="text-muted-foreground">{formatDate(evt.timestamp)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
