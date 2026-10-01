"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Award,
  AlertTriangle,
  FileCheck,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  FlaskConical,
  Plus,
  Play,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { selfImprovementApi, agentsApi } from "@/lib/api-client";
import { ImprovementProposal, ExecutionEvaluation, PerformanceExperiment } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

export default function SelfImprovementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("proposals");

  // Dialog States
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isExperimentOpen, setIsExperimentOpen] = useState(false);

  // Evaluation Form
  const [targetId, setTargetId] = useState("");
  const [targetType, setTargetType] = useState("task");
  const [userRating, setUserRating] = useState(4);
  const [executionTime, setExecutionTime] = useState(2.5);

  // Proposal Form
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");

  // Experiment Form
  const [expName, setExpName] = useState("Baseline vs Candidate Prompt Optimization");
  const [baselineVersion, setBaselineVersion] = useState(1);
  const [candidateVersion, setCandidateVersion] = useState(2);
  const [sampleSize, setSampleSize] = useState(20);

  // Fetch Agents & Proposals
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });
  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals"],
    queryFn: selfImprovementApi.listProposals,
  });

  // Evaluate Execution Mutation
  const evaluateMutation = useMutation({
    mutationFn: () =>
      selfImprovementApi.evaluate({
        target_id: targetId,
        target_type: targetType,
        execution_time_seconds: executionTime,
        user_satisfaction_rating: userRating,
      }),
    onSuccess: () => {
      toast.success("Evaluation complete", "Performance metrics & weaknesses analyzed.");
      setIsEvaluationOpen(false);
    },
    onError: (err: any) => {
      toast.error("Evaluation failed", formatErrorMessage(err));
    },
  });

  // Create Proposal Mutation
  const proposalMutation = useMutation({
    mutationFn: () =>
      selfImprovementApi.createProposal({
        agent_id: selectedAgentId,
        custom_instruction: customInstruction,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Improvement proposal generated", "Review suggested prompt modifications.");
      setIsProposalOpen(false);
    },
    onError: (err: any) => {
      toast.error("Proposal failed", formatErrorMessage(err));
    },
  });

  // Apply Proposal Mutation
  const applyProposalMutation = useMutation({
    mutationFn: (id: string) => selfImprovementApi.applyProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Proposal applied", "Agent updated and new version snapshot created.");
    },
    onError: (err: any) => {
      toast.error("Apply failed", formatErrorMessage(err));
    },
  });

  // Run Experiment Mutation
  const experimentMutation = useMutation({
    mutationFn: () =>
      selfImprovementApi.runExperiment({
        name: expName,
        agent_id: selectedAgentId,
        baseline_version: baselineVersion,
        candidate_version: candidateVersion,
        sample_size: sampleSize,
      }),
    onSuccess: (exp) => {
      toast.success(
        "Experiment complete",
        exp.is_promoted
          ? "Candidate version PROMOTED! Significant performance gain."
          : "Candidate version REJECTED. Retained baseline."
      );
      setIsExperimentOpen(false);
    },
    onError: (err: any) => {
      toast.error("Experiment failed", formatErrorMessage(err));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Self-Improvement Engine</h2>
          <p className="text-sm text-muted-foreground">
            M8 Autonomous optimization lifecycle: Evaluation, Root-Cause Analysis, Automated Proposals, and Baseline-vs-Candidate Experiments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEvaluationOpen(true)}>
            <Award className="h-4 w-4 mr-1 text-amber-500" /> Run Evaluation
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExperimentOpen(true)}>
            <FlaskConical className="h-4 w-4 mr-1 text-purple-400" /> Run Experiment
          </Button>
          <Button size="sm" onClick={() => setIsProposalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Generate Proposal
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="proposals" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="proposals">
            <Sparkles className="h-4 w-4 mr-1.5" /> Proposals ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="lifecycle">
            <TrendingUp className="h-4 w-4 mr-1.5" /> Optimization Architecture
          </TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4 pt-2">
          {isLoadingProposals ? (
            <div className="text-center py-12 text-muted-foreground">Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-muted-foreground">No proposals generated</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Generate Proposal&quot; to synthesize automated agent optimizations.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {proposals.map((prop) => {
                const targetAgent = agents.find((a) => a.id === prop.agent_id);

                return (
                  <Card key={prop.id} className="flex flex-col justify-between hover:border-amber-500/40 transition-all">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={prop.status === "applied" ? "success" : "secondary"}
                          className="capitalize text-[10px]"
                        >
                          {prop.status}
                        </Badge>
                        {targetAgent && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Agent: {targetAgent.name}
                          </span>
                        )}
                      </div>

                      <div>
                        <CardTitle className="text-base font-bold">{prop.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {prop.description}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {prop.suggested_changes && (
                        <div className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-32">
                          <pre>{JSON.stringify(prop.suggested_changes, null, 2)}</pre>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-3 gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          Created {formatDate(prop.created_at)}
                        </span>
                        {prop.status !== "applied" && (
                          <Button
                            size="sm"
                            disabled={applyProposalMutation.isPending}
                            onClick={() => applyProposalMutation.mutate(prop.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Apply & Version Up
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Lifecycle Explanation Tab */}
        <TabsContent value="lifecycle" className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> M8 Self-Improvement Closed Loop
              </CardTitle>
              <CardDescription>
                How the platform evaluates performance, diagnoses weaknesses, generates proposals, and safely promotes improvements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1">
                    <span>1. Evaluation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scoring execution time, token usage, user satisfaction ratings, and failure logs.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <div className="font-bold text-purple-400 flex items-center gap-1">
                    <span>2. Root-Cause Analysis</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Detecting system prompt weaknesses, ambiguity, or tool invocation flaws.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <div className="font-bold text-amber-500 flex items-center gap-1">
                    <span>3. Proposal Generation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Synthesizing targeted system prompt modifications and parameter tweaks.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <div className="font-bold text-emerald-500 flex items-center gap-1">
                    <span>4. Controlled A/B Experiment</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Running baseline vs candidate versions, promoting winner, rolling back on regression.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Evaluation Dialog */}
      <Dialog open={isEvaluationOpen} onOpenChange={setIsEvaluationOpen} title="Evaluate Execution Run">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            evaluateMutation.mutate();
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Target Task/Workflow ID</label>
            <Input
              placeholder="Paste Task or Workflow UUID..."
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Target Type</label>
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="task">Task Execution</option>
              <option value="workflow">Workflow Pipeline</option>
              <option value="multi_agent">Multi-Agent Objective</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              User Satisfaction Rating (1 - 5)
            </label>
            <Input
              type="number"
              min="1"
              max="5"
              value={userRating}
              onChange={(e) => setUserRating(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsEvaluationOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={evaluateMutation.isPending || !targetId}>
              {evaluateMutation.isPending ? "Evaluating..." : "Run Evaluation Engine"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Proposal Dialog */}
      <Dialog open={isProposalOpen} onOpenChange={setIsProposalOpen} title="Generate Improvement Proposal">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            proposalMutation.mutate();
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Select Target Agent</label>
            <Select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} required>
              <option value="">Select Agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Custom Optimization Focus (Optional)
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Optimize prompt to reduce output verbosity and handle edge case errors..."
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsProposalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={proposalMutation.isPending || !selectedAgentId}>
              {proposalMutation.isPending ? "Synthesizing..." : "Generate Proposal"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Experiment Dialog */}
      <Dialog open={isExperimentOpen} onOpenChange={setIsExperimentOpen} title="Run A/B Performance Experiment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            experimentMutation.mutate();
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Experiment Name</label>
            <Input value={expName} onChange={(e) => setExpName(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Select Target Agent</label>
            <Select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} required>
              <option value="">Select Agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (v{a.current_version})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Baseline Version
              </label>
              <Input
                type="number"
                value={baselineVersion}
                onChange={(e) => setBaselineVersion(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Candidate Version
              </label>
              <Input
                type="number"
                value={candidateVersion}
                onChange={(e) => setCandidateVersion(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Sample Size Runs</label>
            <Input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsExperimentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={experimentMutation.isPending || !selectedAgentId}>
              {experimentMutation.isPending ? "Running Experiment..." : "Run Statistical Trial"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
