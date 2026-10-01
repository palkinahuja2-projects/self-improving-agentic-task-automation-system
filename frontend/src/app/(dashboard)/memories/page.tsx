"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  Plus,
  Search,
  Trash2,
  Sparkles,
  Zap,
  Tag,
  Clock,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { memoriesApi, agentsApi } from "@/lib/api-client";
import { Memory, MemorySearchResult } from "@/types";
import { formatDate, formatErrorMessage } from "@/lib/utils";

export default function MemoriesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  // Vector Search States
  const [searchQueryText, setSearchQueryText] = useState("");
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClearShortTermOpen, setIsClearShortTermOpen] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);

  // Form States
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] = useState("long_term");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [importanceScore, setImportanceScore] = useState(0.5);

  // Fetch Memories & Agents
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories", typeFilter, agentFilter],
    queryFn: () =>
      memoriesApi.list({
        memory_type: typeFilter === "all" ? undefined : typeFilter,
        agent_id: agentFilter === "all" ? undefined : agentFilter,
      }),
  });

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.list });

  // Store Memory Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      memoriesApi.create({
        content,
        memory_type: memoryType,
        agent_id: selectedAgentId || undefined,
        importance_score: importanceScore,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory stored", "Indexed in PostgreSQL & ChromaDB vector store.");
      setContent("");
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error("Failed to store memory", formatErrorMessage(err));
    },
  });

  // Delete Memory Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory deleted", "Memory record purged.");
      setDeletingMemoryId(null);
    },
    onError: (err: any) => {
      toast.error("Delete failed", formatErrorMessage(err));
    },
  });

  // Clear Short-Term Memory Mutation
  const clearShortTermMutation = useMutation({
    mutationFn: () => memoriesApi.clearShortTerm(agentFilter === "all" ? undefined : agentFilter),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Short-term memories cleared", `Purged ${data.cleared_count} records.`);
      setIsClearShortTermOpen(false);
    },
    onError: (err: any) => {
      toast.error("Clear failed", formatErrorMessage(err));
    },
  });

  // Handle Vector Search
  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQueryText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await memoriesApi.search({
        query: searchQueryText,
        limit: 5,
        agent_id: agentFilter === "all" ? undefined : agentFilter,
      });
      setSearchResults(results);
    } catch (err: any) {
      toast.error("Search failed", formatErrorMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Memory System</h2>
          <p className="text-sm text-muted-foreground">
            Multi-tenant semantic vector store (ChromaDB) and persistent context management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsClearShortTermOpen(true)}>
            <Zap className="h-4 w-4 mr-1 text-amber-500" /> Clear Short-Term
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Store Memory
          </Button>
        </div>
      </div>

      {/* Main Tabs: Memory Browser vs Vector Search */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <BrainCircuit className="h-4 w-4 mr-1.5" /> Memory Items ({memories.length})
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1.5" /> Semantic Vector Search
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Memory Browser */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:max-w-xs">
              <option value="all">All Types</option>
              <option value="short_term">Short Term</option>
              <option value="long_term">Long Term</option>
              <option value="episodic">Episodic</option>
            </Select>

            <Select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="sm:max-w-xs">
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading memories...</div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <BrainCircuit className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-muted-foreground">No memories recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Store memories manually or automatically during agent task executions.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {memories.map((mem) => (
                <Card key={mem.id} className="flex flex-col justify-between hover:border-purple-500/40 transition-all">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          mem.memory_type === "long_term"
                            ? "info"
                            : mem.memory_type === "episodic"
                            ? "warning"
                            : "secondary"
                        }
                        className="capitalize text-[10px]"
                      >
                        {mem.memory_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Score: {(mem.importance_score || 0.5).toFixed(2)}
                      </span>
                    </div>

                    <CardContent className="px-0 pt-2 pb-0">
                      <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                        {mem.content}
                      </p>
                    </CardContent>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>Created {formatDate(mem.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingMemoryId(mem.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Semantic Vector Search */}
        <TabsContent value="search" className="space-y-4 pt-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" /> Vector Similarity Query
              </CardTitle>
              <CardDescription>
                Perform dense embeddings semantic search using ChromaDB vector index
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleVectorSearch} className="flex gap-2">
                <Input
                  placeholder="Enter natural language query e.g. 'What user preferences were discussed?'"
                  value={searchQueryText}
                  onChange={(e) => setSearchQueryText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? "Searching..." : "Vector Search"}
                </Button>
              </form>

              {hasSearched && searchResults.length === 0 && (
                <div className="p-8 text-center border rounded-xl bg-card space-y-2 pt-6">
                  <BrainCircuit className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-semibold text-muted-foreground">No relevant memories found</p>
                  <p className="text-xs text-muted-foreground">
                    Try refining your semantic search query or storing new memory records.
                  </p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Top {searchResults.length} Relevant Memory Matches
                  </h4>
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border bg-card/60 space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="success" className="text-[10px]">
                          Similarity Score: {((res.score ?? res.similarity_score ?? 0) * 100).toFixed(1)}%
                        </Badge>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {res.memory.memory_type}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{res.memory.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Store Memory Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Store Memory Record">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 mt-2"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Memory Content
            </label>
            <Textarea
              rows={4}
              placeholder="Enter factual information, preference, or context memory snippet..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Memory Type
            </label>
            <Select value={memoryType} onChange={(e) => setMemoryType(e.target.value)}>
              <option value="short_term">Short Term (Transient Task Context)</option>
              <option value="long_term">Long Term (Persistent Knowledge)</option>
              <option value="episodic">Episodic (Event Experience)</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Associated Agent (Optional)
            </label>
            <Select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
              <option value="">Global / User Memory</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !content}>
              {createMutation.isPending ? "Indexing..." : "Save Memory"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Clear Short Term Dialog */}
      <ConfirmDialog
        open={isClearShortTermOpen}
        onOpenChange={setIsClearShortTermOpen}
        title="Clear Short-Term Memories"
        description="Are you sure you want to purge transient short-term memories? Long-term knowledge will remain intact."
        onConfirm={() => clearShortTermMutation.mutate()}
        isLoading={clearShortTermMutation.isPending}
      />

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingMemoryId}
        onOpenChange={(open) => !open && setDeletingMemoryId(null)}
        title="Delete Memory Record"
        description="Are you sure you want to delete this memory item from PostgreSQL and vector index?"
        onConfirm={() => { if (deletingMemoryId) deleteMutation.mutate(deletingMemoryId); }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
