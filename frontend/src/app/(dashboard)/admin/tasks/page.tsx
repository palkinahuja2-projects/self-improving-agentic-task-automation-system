"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { adminApi } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function AdminTasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: adminApi.listTasks,
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
            <h2 className="text-2xl font-bold tracking-tight">System-Wide Task Overview</h2>
            <p className="text-sm text-muted-foreground">
              Inspect automated background tasks submitted across all tenant user accounts.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading system tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-card">
            <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-muted-foreground">No tasks found system-wide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{task.title || task.name || "Untitled Task"}</span>
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "success"
                            : task.status === "failed"
                            ? "destructive"
                            : task.status === "running"
                            ? "info"
                            : "secondary"
                        }
                        className="capitalize text-[10px]"
                      >
                        {task.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        User: {task.user_id || task.owner_id || "System"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                      <span>Created {formatDate(task.created_at)}</span>
                      <span>Retries: {task.retry_count ?? task.retries_count ?? 0} / {task.max_retries}</span>
                      {task.execution_duration && (
                        <span>Duration: {task.execution_duration.toFixed(2)}s</span>
                      )}
                    </div>
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
