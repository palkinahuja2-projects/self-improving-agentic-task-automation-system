"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Workflow as WorkflowIcon,
  Plus,
  Play,
  CheckCircle,
  Power,
  Trash2,
  Settings,
  Bot,
  GitBranch,
  Clock,
  Shuffle,
  ShieldAlert,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { workflowsApi, agentsApi } from "@/lib/api-client";
import { Workflow, WorkflowNode, WorkflowCreate } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

// ─────────────────────────────────────────────
// Custom React Flow Nodes
// ─────────────────────────────────────────────

const AgentTaskNode = ({ data }: any) => (
  <div className="rounded-xl border-2 border-primary bg-card p-3 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-primary" />
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1 rounded bg-primary/20 text-primary">
        <Bot className="h-4 w-4" />
      </div>
      <span className="font-bold text-xs truncate">{data.label || "Agent Task"}</span>
    </div>
    <p className="text-[10px] text-muted-foreground truncate">
      Agent: {data.agentName || "Default"}
    </p>
    <Handle type="source" position={Position.Bottom} className="!bg-primary" />
  </div>
);

const ConditionNode = ({ data }: any) => (
  <div className="rounded-xl border-2 border-amber-500 bg-card p-3 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-amber-500" />
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1 rounded bg-amber-500/20 text-amber-500">
        <GitBranch className="h-4 w-4" />
      </div>
      <span className="font-bold text-xs truncate">{data.label || "Condition"}</span>
    </div>
    <p className="text-[10px] text-muted-foreground truncate">
      Rule: {data.condition || "status == success"}
    </p>
    <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
  </div>
);

const DelayNode = ({ data }: any) => (
  <div className="rounded-xl border-2 border-purple-500 bg-card p-3 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-purple-500" />
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1 rounded bg-purple-500/20 text-purple-500">
        <Clock className="h-4 w-4" />
      </div>
      <span className="font-bold text-xs truncate">{data.label || "Delay"}</span>
    </div>
    <p className="text-[10px] text-muted-foreground truncate">
      Wait: {data.delaySeconds || 5}s
    </p>
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
  </div>
);

const TransformationNode = ({ data }: any) => (
  <div className="rounded-xl border-2 border-blue-500 bg-card p-3 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-blue-500" />
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1 rounded bg-blue-500/20 text-blue-500">
        <Shuffle className="h-4 w-4" />
      </div>
      <span className="font-bold text-xs truncate">{data.label || "Transformation"}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
  </div>
);

const FailurePolicyNode = ({ data }: any) => (
  <div className="rounded-xl border-2 border-rose-500 bg-card p-3 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-rose-500" />
    <div className="flex items-center gap-2 mb-1">
      <div className="p-1 rounded bg-rose-500/20 text-rose-500">
        <ShieldAlert className="h-4 w-4" />
      </div>
      <span className="font-bold text-xs truncate">{data.label || "Failure Policy"}</span>
    </div>
    <p className="text-[10px] text-muted-foreground truncate">
      Action: {data.policy || "retry_3x"}
    </p>
    <Handle type="source" position={Position.Bottom} className="!bg-rose-500" />
  </div>
);

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  // Dialog & Deletion States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDesc, setNewWorkflowDesc] = useState("");

  // Canvas Node & Edge States
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeTypes = useMemo(
    () => ({
      agent_task: AgentTaskNode,
      condition: ConditionNode,
      delay: DelayNode,
      transformation: TransformationNode,
      failure_policy: FailurePolicyNode,
    }),
    []
  );

  // Fetch Workflows & Agents
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => workflowsApi.list(),
  });

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });

  // Create Workflow Mutation
  // Create Workflow Mutation
  const createMutation = useMutation({
    mutationFn: (data: WorkflowCreate) => workflowsApi.create(data),
    onSuccess: (newWf) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created", "Opened Visual Canvas Studio.");
      setIsCreateOpen(false);
      openCanvas(newWf);
    },
    onError: (err: any) => {
      toast.error("Failed to create workflow", formatErrorMessage(err));
    },
  });

  // Execute Workflow Mutation
  const executeMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.execute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow execution finished", "Pipeline run complete.");
    },
    onError: (err: any) => {
      toast.error("Execution error", formatErrorMessage(err));
    },
  });

  // Activate / Deactivate Mutations
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? workflowsApi.activate(id) : workflowsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow status updated", "Saved active state.");
    },
    onError: (err: any) => {
      toast.error("Status update failed", formatErrorMessage(err));
    },
  });

  // Delete Workflow Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted", "Workflow removed.");
      setDeletingWorkflowId(null);
      if (selectedWorkflow?.id === deletingWorkflowId) {
        setSelectedWorkflow(null);
      }
    },
    onError: (err: any) => {
      toast.error("Delete failed", formatErrorMessage(err));
    },
  });

  const openCanvas = (wf: Workflow) => {
    setSelectedWorkflow(wf);
    let loadedNodes: Node[] = [];
    let loadedEdges: Edge[] = [];

    if (wf.configuration) {
      try {
        const parsed = typeof wf.configuration === "string" ? JSON.parse(wf.configuration) : wf.configuration;
        if (parsed && Array.isArray(parsed.nodes)) {
          loadedNodes = parsed.nodes;
          loadedEdges = parsed.edges || [];
        }
      } catch (e) {
        // Fall back to node list
      }
    }

    if (loadedNodes.length === 0 && wf.nodes && wf.nodes.length > 0) {
      loadedNodes = wf.nodes.map((n, idx) => ({
        id: n.id,
        type: n.node_type || "agent_task",
        position: { x: 250, y: 100 + idx * 100 },
        data: { label: n.name, config: n.config },
      }));

      wf.nodes.forEach((n) => {
        if (n.next_node_id) {
          loadedEdges.push({
            id: `e-${n.id}-${n.next_node_id}`,
            source: n.id,
            target: String(n.next_node_id),
            animated: true,
          });
        }
      });
    }

    if (loadedNodes.length === 0) {
      loadedNodes = [
        {
          id: "node-1",
          type: "agent_task",
          position: { x: 250, y: 100 },
          data: { label: "Initial Agent Task" },
        },
      ];
    }

    setNodes(loadedNodes);
    setEdges(loadedEdges);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const addCanvasNode = (type: string, label: string) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: { x: 250 + Math.random() * 50, y: 150 + nodes.length * 80 },
      data: { label },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const saveCanvasNodes = async () => {
    if (!selectedWorkflow) return;
    try {
      const configJson = JSON.stringify({ nodes, edges });
      await workflowsApi.update(selectedWorkflow.id, {
        configuration: configJson,
      });

      let order = 1;
      for (const node of nodes) {
        try {
          await workflowsApi.addNode(selectedWorkflow.id, {
            name: (node.data.label as string) || "Node",
            node_type: node.type || "agent_task",
            step_order: order++,
            config: typeof node.data.config === "string" ? node.data.config : JSON.stringify(node.data),
          });
        } catch (nodeErr) {
          // Node entry saved in configuration
        }
      }

      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow canvas saved", "Workflow definition persisted to database.");
    } catch (e: any) {
      toast.error("Save failed", formatErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      {/* If Canvas Studio is Open */}
      {selectedWorkflow ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedWorkflow(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
              </Button>
              <div>
                <h3 className="text-xl font-bold tracking-tight">{selectedWorkflow.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Visual Canvas Builder • {nodes.length} Nodes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveCanvasNodes}>
                <Save className="h-4 w-4 mr-1" /> Save Canvas
              </Button>
              <Button
                size="sm"
                disabled={executeMutation.isPending}
                onClick={() => executeMutation.mutate(selectedWorkflow.id)}
              >
                <Play className="h-4 w-4 mr-1" /> Run Workflow
              </Button>
            </div>
          </div>

          {/* Node Creation Palette Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-card text-xs">
            <span className="font-semibold text-muted-foreground mr-2">Add Node:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCanvasNode("agent_task", "Agent Execution")}
            >
              <Bot className="h-3.5 w-3.5 mr-1 text-primary" /> + Agent Task
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCanvasNode("condition", "Branch Condition")}
            >
              <GitBranch className="h-3.5 w-3.5 mr-1 text-amber-500" /> + Condition
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCanvasNode("delay", "Delay Step")}
            >
              <Clock className="h-3.5 w-3.5 mr-1 text-purple-500" /> + Delay
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCanvasNode("transformation", "Data Transform")}
            >
              <Shuffle className="h-3.5 w-3.5 mr-1 text-blue-500" /> + Transform
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addCanvasNode("failure_policy", "Failure Policy")}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1 text-rose-500" /> + Retry Policy
            </Button>
          </div>

          {/* React Flow Canvas Container */}
          <div className="h-[600px] w-full rounded-2xl border bg-background shadow-inner overflow-hidden relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background color="#888" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      ) : (
        /* Workflows List Interface */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Workflow Studio</h2>
              <p className="text-sm text-muted-foreground">
                Build, connect, execute, and monitor multi-node visual agentic DAG pipelines.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Workflow
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <WorkflowIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-muted-foreground">No workflows found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a workflow to build visual automation pipelines.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <Card key={wf.id} className="flex flex-col justify-between hover:border-amber-500/40 transition-all">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          wf.status === "active"
                            ? "success"
                            : wf.status === "running"
                            ? "info"
                            : "secondary"
                        }
                        className="capitalize text-[10px]"
                      >
                        {wf.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {wf.nodes?.length || 0} Nodes
                      </span>
                    </div>

                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <WorkflowIcon className="h-5 w-5 text-amber-500 shrink-0" />
                        <span className="truncate">{wf.name}</span>
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {wf.description || "No workflow description provided."}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between border-t pt-3 gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openCanvas(wf)}
                      >
                        <Settings className="h-3.5 w-3.5 mr-1" /> Canvas Builder
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={executeMutation.isPending}
                          onClick={() => executeMutation.mutate(wf.id)}
                          title="Execute Pipeline"
                        >
                          <Play className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setDeletingWorkflowId(wf.id)}
                          title="Delete Workflow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create New Workflow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ name: newWorkflowName, description: newWorkflowDesc });
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Workflow Name
            </label>
            <Input
              placeholder="e.g. Automated Code Refactoring Pipeline"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Description
            </label>
            <Input
              placeholder="Brief summary of workflow objective..."
              value={newWorkflowDesc}
              onChange={(e) => setNewWorkflowDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !newWorkflowName}>
              {createMutation.isPending ? "Creating..." : "Create & Open Canvas"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Workflow Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingWorkflowId}
        onOpenChange={(open) => !open && setDeletingWorkflowId(null)}
        title="Delete Workflow"
        description="Are you sure you want to delete this workflow and all contained node DAG definitions?"
        onConfirm={() => { if (deletingWorkflowId) deleteMutation.mutate(deletingWorkflowId); }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
