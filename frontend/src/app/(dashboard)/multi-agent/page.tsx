"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users2,
  Play,
  MessageSquare,
  Sparkles,
  Bot,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Eye,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { multiAgentApi } from "@/lib/api-client";
import { MultiAgentExecution, AgentMessage } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

const availableSubagentRoles = [
  { id: "planner", name: "Planner", desc: "Decomposes complex objectives into subtasks" },
  { id: "researcher", name: "Researcher", desc: "Fetches web/document context & factual data" },
  { id: "analyst", name: "Analyst", desc: "Evaluates findings and synthesizes strategy" },
  { id: "executor", name: "Executor", desc: "Runs code and performs state changes" },
  { id: "reviewer", name: "Reviewer", desc: "Audits outputs for accuracy & security" },
  { id: "coordinator", name: "Coordinator", desc: "Orchestrates inter-agent handoffs" },
];

export default function MultiAgentPage() {
  const queryClient = useQueryClient();
  const [objective, setObjective] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    "planner",
    "researcher",
    "executor",
    "reviewer",
  ]);

  const [activeSession, setActiveSession] = useState<MultiAgentExecution | null>(null);

  // Fetch Multi-Agent Executions
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["multi-agent-executions"],
    queryFn: multiAgentApi.list,
  });

  // Fetch Messages for active session
  const { data: messages = [] } = useQuery({
    queryKey: ["multi-agent-messages", activeSession?.id],
    queryFn: () => multiAgentApi.getMessages(activeSession!.id),
    enabled: !!activeSession,
  });

  // Start Multi-Agent Execution Mutation
  const executeMutation = useMutation({
    mutationFn: () =>
      multiAgentApi.execute({
        objective,
        subagents: selectedRoles,
      }),
    onSuccess: (newExec) => {
      queryClient.invalidateQueries({ queryKey: ["multi-agent-executions"] });
      toast.success("Multi-agent objective started", "Agents collaborating on task.");
      setActiveSession(newExec);
    },
    onError: (err: any) => {
      toast.error("Execution failed", formatErrorMessage(err));
    },
  });

  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Multi-Agent System</h2>
        <p className="text-sm text-muted-foreground">
          Deploy specialized multi-agent teams (Planner, Researcher, Analyst, Executor, Reviewer, Coordinator) for high-order autonomous objectives.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Objective Submission Form */}
        <Card className="lg:col-span-1 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> New Multi-Agent Objective
            </CardTitle>
            <CardDescription>Configure team & submit high-level goal</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Objective Description
              </label>
              <Textarea
                rows={4}
                placeholder="e.g. Conduct market research on AI agent platforms, synthesize findings, write code implementation plan, and audit for security."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Select Specialized Subagents ({selectedRoles.length})
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {availableSubagentRoles.map((role) => {
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                        isSelected
                          ? "border-primary bg-primary/10 font-semibold"
                          : "bg-card hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bot className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-semibold capitalize">{role.name}</p>
                          <p className="text-[10px] text-muted-foreground">{role.desc}</p>
                        </div>
                      </div>
                      <Badge variant={isSelected ? "default" : "outline"} className="text-[10px]">
                        {isSelected ? "Selected" : "Off"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={executeMutation.isPending || !objective.trim() || selectedRoles.length === 0}
              onClick={() => executeMutation.mutate()}
            >
              {executeMutation.isPending ? "Orchestrating..." : "Start Pipeline"}
              {!executeMutation.isPending && <Play className="h-4 w-4 ml-2" />}
            </Button>
          </CardContent>
        </Card>

        {/* Sessions & Inter-Agent Message Log Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-400" /> Inter-Agent Communication Stream
              </CardTitle>
              {activeSession && (
                <Badge variant="success" className="text-[10px]">
                  Session ID: {activeSession.id.slice(0, 8)}
                </Badge>
              )}
            </div>
            <CardDescription>
              Real-time audit log of agent handoffs, reasoning, and message exchanges
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Executions Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-muted-foreground shrink-0 font-semibold">Executions:</span>
              {executions.map((exec) => (
                <Button
                  key={exec.id}
                  size="sm"
                  variant={activeSession?.id === exec.id ? "default" : "outline"}
                  className="text-xs shrink-0"
                  onClick={() => setActiveSession(exec)}
                >
                  {exec.objective.slice(0, 20)}...
                </Button>
              ))}
            </div>

            {!activeSession ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Select an execution session or start a new objective above.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Objective: {activeSession.objective}</span>
                    <Badge variant="info" className="capitalize text-[10px]">
                      {activeSession.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Agents: {activeSession.agents_used?.join(", ") || "All"} • Created {formatDate(activeSession.created_at)}
                  </p>
                </div>

                {/* Message Log Feed */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No inter-agent messages logged for this execution yet.
                    </p>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border bg-card/70 space-y-1.5 hover:border-purple-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-semibold">
                            <span className="text-primary">{msg.sender_agent || "Agent"}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-purple-400">{msg.receiver_agent || "System"}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            Phase: {msg.phase || "execution"}
                          </Badge>
                        </div>
                        <p className="text-xs font-mono text-foreground whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Final Result Render */}
                {activeSession.result && (
                  <div className="border-t pt-3">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Final Aggregated Result:
                    </h4>
                    <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(activeSession.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
