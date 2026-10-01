"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowLeft, Search, Filter, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { AuditLog } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, resourceFilter],
    queryFn: () =>
      adminApi.listAuditLogs({
        action: actionFilter === "all" ? undefined : actionFilter,
        resource_type: resourceFilter === "all" ? undefined : resourceFilter,
      }),
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
              <h2 className="text-2xl font-bold tracking-tight">Audit Trail Viewer</h2>
              <p className="text-sm text-muted-foreground">
                Persistent audit log records for administrative operations, user role updates, and security events.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="sm:max-w-xs">
            <option value="all">All Actions</option>
            <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
            <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
            <option value="ADMIN_BOOTSTRAP">ADMIN_BOOTSTRAP</option>
          </Select>

          <Select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value)} className="sm:max-w-xs">
            <option value="all">All Resource Types</option>
            <option value="user">User Resource</option>
            <option value="system">System Resource</option>
          </Select>
        </div>

        {/* Audit Log Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading audit log trail...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No audit logs recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id} className="hover:border-primary/40 transition-all">
                <CardContent className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px] text-amber-400">
                        {log.action}
                      </Badge>
                      <Badge variant={log.status === "success" ? "success" : "destructive"} className="text-[10px]">
                        {log.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        Actor: {log.username || log.user_id || "System"}
                      </span>
                    </div>

                    <p className="text-muted-foreground">
                      Resource: <span className="font-medium text-foreground">{log.resource_type}</span> (ID: {log.resource_id || "N/A"})
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                    <span>{formatDate(log.timestamp)}</span>
                    {log.details_json && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setInspectLog(log)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Log Inspector Dialog */}
        <Dialog open={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)} title="Audit Event Metadata">
          <div className="space-y-3 mt-2">
            <div className="text-xs space-y-1">
              <p><strong>Action:</strong> {inspectLog?.action}</p>
              <p><strong>Actor:</strong> {inspectLog?.username || inspectLog?.user_id}</p>
              <p><strong>Timestamp:</strong> {inspectLog && formatDate(inspectLog.timestamp)}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Details JSON Payload:</h4>
              <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-60">
                {inspectLog?.details_json ? JSON.stringify(JSON.parse(inspectLog.details_json), null, 2) : "{}"}
              </pre>
            </div>
          </div>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
