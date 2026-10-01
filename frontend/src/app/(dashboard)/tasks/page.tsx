"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Plus,
  Play,
  XCircle,
  Trash2,
  Clock,
  RotateCcw,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { tasksApi, agentsApi } from "@/lib/api-client";
import { Task, TaskCreate, ExecutionHistory } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inspectTask, setInspectTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [inputDataJson, setInputDataJson] = useState('{\n  "query": "Research quantum computing trends"\n}');
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeoutSeconds, setTimeoutSeconds] = useState(300);

  // Fetch Tasks & Agents
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", statusFilter],
    queryFn: () => tasksApi.list(statusFilter === "all" ? undefined : statusFilter),
  });

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });

  // Fetch Execution History for selected task
  const { data: historyRecords = [] } = useQuery({
    queryKey: ["task-history", historyTask?.id],
    queryFn: () => tasksApi.getHistory(historyTask!.id),
    enabled: !!historyTask,
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created", "Automation task queued for execution.");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to create task", formatErrorMessage(err));
    },
  });

  // Execute Task Mutation
  const executeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.execute(id),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task execution finished", `Status: ${updatedTask.status}`);
    },
    onError: (err: any) => {
      toast.error("Execution failed", formatErrorMessage(err));
    },
  });

  // Cancel Task Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => tasksApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.info("Task cancelled", "Execution stopped.");
    },
    onError: (err: any) => {
      toast.error("Cancel failed", formatErrorMessage(err));
    },
  });

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted", "Task record removed.");
      setDeletingTaskId(null);
    },
    onError: (err: any) => {
      toast.error("Delete failed", formatErrorMessage(err));
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setAssignedAgentId("");
    setInputDataJson('{\n  "query": "Research quantum computing trends"\n}');
    setMaxRetries(3);
    setTimeoutSeconds(300);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title: name,
      name: name,
      description,
      agent_id: assignedAgentId || undefined,
      assigned_agent_id: assignedAgentId || undefined,
      input_data: inputDataJson,
      max_retries: maxRetries,
      timeout_seconds: timeoutSeconds,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Automation</h2>
          <p className="text-sm text-muted-foreground">
            Create, execute, cancel, and inspect background automated agentic tasks.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Create Task
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-semibold text-muted-foreground">No tasks found</p>
          <p className="text-xs text-muted-foreground mt-1">Create a task to initiate execution.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const taskTitle = task.title || task.name || "Untitled Task";
            const targetAgentId = task.agent_id || task.assigned_agent_id;
            const assignedAgent = agents.find((a) => a.id === targetAgentId);
            const retryCount = task.retry_count ?? task.retries_count ?? 0;

            return (
              <Card key={task.id} className="hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{taskTitle}</span>
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
                      {assignedAgent && (
                        <Badge variant="outline" className="text-[10px]">
                          Agent: {assignedAgent.name}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.description || "No task description."}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                      <span>Created {formatDate(task.created_at)}</span>
                      <span>Retries: {retryCount} / {task.max_retries}</span>
                      {task.execution_duration && (
                        <span>Duration: {task.execution_duration.toFixed(2)}s</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={executeMutation.isPending || task.status === "running"}
                      onClick={() => executeMutation.mutate(task.id)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      {executeMutation.isPending && executeMutation.variables === task.id
                        ? "Running..."
                        : "Execute"}
                    </Button>

                    {task.status === "running" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(task.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-destructive" /> Cancel
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInspectTask(task)}
                      title="Inspect Result"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setHistoryTask(task)}
                      title="Execution History"
                    >
                      <Clock className="h-4 w-4 text-purple-400" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeletingTaskId(task.id)}
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create Automation Task">
        <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Task Name</label>
            <Input
              placeholder="e.g. Weekly Market Analysis Task"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Assigned Agent</label>
            <Select value={assignedAgentId} onChange={(e) => setAssignedAgentId(e.target.value)}>
              <option value="">Auto-Assign / Default</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <Input
              placeholder="Summary of task goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Input Data (JSON format)
            </label>
            <Textarea
              rows={4}
              value={inputDataJson}
              onChange={(e) => setInputDataJson(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Max Retries</label>
              <Input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Timeout (seconds)
              </label>
              <Input
                type="number"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Save Task"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Inspect Task Output Dialog */}
      <Dialog
        open={!!inspectTask}
        onOpenChange={(open) => !open && setInspectTask(null)}
        title={`Task Inspector: ${inspectTask?.name}`}
      >
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              Status: {inspectTask?.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ID: {inspectTask?.id}
            </span>
          </div>

          {inspectTask?.error_message && (
            <div className="p-3 rounded-lg bg-destructive/15 text-destructive text-xs font-mono">
              <strong>Error:</strong> {inspectTask.error_message}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Input Payload:
            </h4>
            <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto">
              {JSON.stringify(inspectTask?.input_data || {}, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Execution Output Result:
            </h4>
            <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-60">
              {JSON.stringify(inspectTask?.output_data || {}, null, 2)}
            </pre>
          </div>
        </div>
      </Dialog>

      {/* Task History Dialog */}
      <Dialog
        open={!!historyTask}
        onOpenChange={(open) => !open && setHistoryTask(null)}
        title={`Execution History (${historyTask?.name})`}
      >
        <div className="space-y-3 mt-2">
          {historyRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No historical execution runs recorded.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {historyRecords.map((rec) => (
                <div key={rec.id} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={rec.status === "completed" ? "success" : "destructive"}>
                      {rec.status}
                    </Badge>
                    <span className="text-muted-foreground">{formatDate(rec.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    Duration: {rec.execution_duration.toFixed(2)}s • Retries: {rec.retries_count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Delete Task Dialog */}
      <ConfirmDialog
        open={!!deletingTaskId}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
        title="Delete Automation Task"
        description="Are you sure you want to delete this task record?"
        onConfirm={() => { if (deletingTaskId) deleteMutation.mutate(deletingTaskId); }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
