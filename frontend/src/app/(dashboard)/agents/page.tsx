"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  History,
  Power,
  Sliders,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { agentsApi } from "@/lib/api-client";
import { Agent, AgentCreate, AgentVersion } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [versionHistoryAgent, setVersionHistoryAgent] = useState<Agent | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("executor");
  const [model, setModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxIterations, setMaxIterations] = useState(10);
  const [capabilitiesInput, setCapabilitiesInput] = useState("web_search, code_execution");

  // Fetch Agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  // Fetch Agent Versions when history dialog is open
  const { data: versions = [] } = useQuery({
    queryKey: ["agent-versions", versionHistoryAgent?.id],
    queryFn: () => agentsApi.getVersions(versionHistoryAgent!.id),
    enabled: !!versionHistoryAgent,
  });

  // Create Agent Mutation
  const createMutation = useMutation({
    mutationFn: (data: AgentCreate) => agentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent created", "New autonomous agent is ready for tasks.");
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to create agent", formatErrorMessage(err));
    },
  });

  // Update Agent Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgentCreate> }) =>
      agentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent updated", "Agent configuration saved successfully.");
      setEditingAgent(null);
    },
    onError: (err: any) => {
      toast.error("Update failed", formatErrorMessage(err));
    },
  });

  // Delete Agent Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted", "Agent record has been removed.");
      setDeletingAgentId(null);
    },
    onError: (err: any) => {
      toast.error("Delete failed", formatErrorMessage(err));
    },
  });

  // Rollback Mutation
  const rollbackMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      agentsApi.rollbackVersion(id, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-versions", variables.id] });
      toast.success("Rollback successful", `Restored configuration to version v${variables.version}`);
      setVersionHistoryAgent(null);
    },
    onError: (err: any) => {
      toast.error("Rollback failed", formatErrorMessage(err));
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setRole("executor");
    setModel("gpt-4o-mini");
    setSystemPrompt("");
    setTemperature(0.7);
    setMaxIterations(10);
    setCapabilitiesInput("web_search, code_execution");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const capabilities = capabilitiesInput.split(",").map((s) => s.trim()).filter(Boolean);
    createMutation.mutate({
      name,
      description,
      role,
      model,
      system_prompt: systemPrompt,
      temperature,
      max_iterations: maxIterations,
      capabilities,
      is_active: true,
    });
  };

  const handleEditClick = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setDescription(agent.description || "");
    setRole(agent.role);
    setModel(agent.model);
    setSystemPrompt(agent.system_prompt || "");
    setTemperature(agent.temperature);
    const capsStr = Array.isArray(agent.capabilities)
      ? agent.capabilities.join(", ")
      : agent.capabilities || "";
    setCapabilitiesInput(capsStr);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    const capabilities = capabilitiesInput.split(",").map((s) => s.trim()).filter(Boolean);
    updateMutation.mutate({
      id: editingAgent.id,
      data: {
        name,
        description,
        role,
        model,
        system_prompt: systemPrompt,
        temperature,
        max_iterations: maxIterations,
        capabilities,
      },
    });
  };

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || a.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure specialized AI agents, manage capabilities, and audit version snapshots.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Create Agent
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search agents by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">All Roles</option>
          <option value="planner">Planner</option>
          <option value="researcher">Researcher</option>
          <option value="analyst">Analyst</option>
          <option value="executor">Executor</option>
          <option value="reviewer">Reviewer</option>
          <option value="coordinator">Coordinator</option>
        </Select>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading agents...</div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-semibold text-muted-foreground">No agents found</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first agent to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="flex flex-col justify-between hover:border-primary/40 transition-all">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {agent.role}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: agent.id, data: { is_active: checked } })
                      }
                    />
                    <Badge variant={agent.is_active ? "success" : "secondary"} className="text-[10px]">
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary shrink-0" />
                    <span className="truncate">{agent.name}</span>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {agent.description || "No description provided."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-semibold">{agent.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-semibold">{agent.temperature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-semibold text-primary">v{agent.current_version}</span>
                  </div>
                </div>

                {(() => {
                  const capsList = Array.isArray(agent.capabilities)
                    ? agent.capabilities
                    : typeof agent.capabilities === "string"
                    ? agent.capabilities.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  if (capsList.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {capsList.map((cap, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-accent/60 px-2 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between border-t pt-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setVersionHistoryAgent(agent)}
                  >
                    <History className="h-3.5 w-3.5 mr-1 text-purple-400" /> History
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(agent)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingAgentId(agent.id)}
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

      {/* Create Agent Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create New Agent">
        <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Agent Name</label>
            <Input
              placeholder="e.g. Code Reviewer Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="planner">Planner</option>
              <option value="researcher">Researcher</option>
              <option value="analyst">Analyst</option>
              <option value="executor">Executor</option>
              <option value="reviewer">Reviewer</option>
              <option value="coordinator">Coordinator</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <Input
              placeholder="Brief summary of agent responsibilities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">LLM Model</label>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
              <option value="ollama-llama3">ollama-llama3</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">System Prompt</label>
            <Textarea
              rows={3}
              placeholder="You are an autonomous AI assistant specialized in..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Temperature ({temperature})
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Max Iterations
              </label>
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Capabilities (comma-separated)
            </label>
            <Input
              placeholder="web_search, code_execution, data_analysis"
              value={capabilitiesInput}
              onChange={(e) => setCapabilitiesInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Save Agent"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog
        open={!!editingAgent}
        onOpenChange={(open) => !open && setEditingAgent(null)}
        title="Edit Agent Configuration"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Agent Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="planner">Planner</option>
              <option value="researcher">Researcher</option>
              <option value="analyst">Analyst</option>
              <option value="executor">Executor</option>
              <option value="reviewer">Reviewer</option>
              <option value="coordinator">Coordinator</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">LLM Model</label>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">System Prompt</label>
            <Textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditingAgent(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Agent"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Version History & Rollback Dialog */}
      <Dialog
        open={!!versionHistoryAgent}
        onOpenChange={(open) => !open && setVersionHistoryAgent(null)}
        title={`Version History & Rollback (${versionHistoryAgent?.name})`}
      >
        <div className="space-y-4 mt-2">
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No version snapshots recorded yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">v{ver.version_number}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(ver.created_at)}</span>
                    </div>
                    {ver.release_notes && (
                      <p className="text-xs text-muted-foreground">{ver.release_notes}</p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      rollbackMutation.isPending ||
                      ver.version_number === versionHistoryAgent?.current_version
                    }
                    onClick={() =>
                      rollbackMutation.mutate({
                        id: versionHistoryAgent!.id,
                        version: ver.version_number,
                      })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    {ver.version_number === versionHistoryAgent?.current_version
                      ? "Current"
                      : "Rollback"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingAgentId}
        onOpenChange={(open) => !open && setDeletingAgentId(null)}
        title="Delete Agent"
        description="Are you sure you want to delete this agent? This action cannot be undone."
        onConfirm={() => { if (deletingAgentId) deleteMutation.mutate(deletingAgentId); }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
