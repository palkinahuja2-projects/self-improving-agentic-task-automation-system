export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  role: string;
  agent_type?: string;
  system_prompt?: string;
  model: string;
  temperature: number;
  max_iterations: number;
  is_active: boolean;
  owner_id: string;
  capabilities: string[] | string | null;
  tools?: string[] | string | null;
  tools_config?: string | null;
  current_version: number;
  created_at: string;
  updated_at?: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  role?: string;
  agent_type?: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_iterations?: number;
  is_active?: boolean;
  capabilities?: string[] | string | null;
  tools?: string[] | string | null;
  tools_config?: string | null;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  role?: string;
  agent_type?: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_iterations?: number;
  is_active?: boolean;
  capabilities?: string[] | string | null;
  tools?: string[] | string | null;
  tools_config?: string | null;
}

export interface Memory {
  id: string;
  content: string;
  memory_type: "short_term" | "long_term" | "episodic" | string;
  agent_id?: string;
  user_id?: string;
  owner_id?: string;
  metadata?: Record<string, any>;
  importance_score: number;
  created_at: string;
  updated_at?: string;
}

export interface MemoryCreate {
  content: string;
  memory_type?: "short_term" | "long_term" | "episodic" | string;
  agent_id?: string;
  metadata?: Record<string, any>;
  importance_score?: number;
}

export interface MemoryUpdate {
  content?: string;
  memory_type?: string;
  metadata?: Record<string, any>;
  importance_score?: number;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  similarity_score?: number;
}

export interface Task {
  id: string;
  title: string;
  name?: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | string;
  input_data?: string | Record<string, any>;
  output_data?: string | Record<string, any>;
  agent_id?: string;
  assigned_agent_id?: string;
  user_id?: string;
  owner_id?: string;
  error_message?: string;
  execution_duration?: number;
  retry_count?: number;
  retries_count?: number;
  max_retries: number;
  timeout_seconds?: number;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreate {
  title: string;
  name?: string;
  description?: string;
  input_data?: string | Record<string, any>;
  agent_id?: string;
  assigned_agent_id?: string;
  priority?: string;
  max_retries?: number;
  timeout_seconds?: number;
}

export interface TaskUpdate {
  title?: string;
  name?: string;
  description?: string;
  input_data?: string | Record<string, any>;
  agent_id?: string;
  assigned_agent_id?: string;
  status?: string;
  priority?: string;
  max_retries?: number;
  timeout_seconds?: number;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: "agent_task" | "condition" | "delay" | "transformation" | "failure_policy" | string;
  name: string;
  configuration?: Record<string, any> | string;
  config?: Record<string, any> | string;
  position_x?: number;
  position_y?: number;
  next_nodes?: string[];
  next_node_id?: string;
  step_order?: number;
  created_at: string;
}

export interface WorkflowNodeCreate {
  node_type: string;
  name: string;
  configuration?: Record<string, any> | string;
  config?: Record<string, any> | string;
  position_x?: number;
  position_y?: number;
  next_nodes?: string[];
  next_node_id?: string;
  step_order?: number;
}

export interface WorkflowNodeUpdate {
  name?: string;
  configuration?: Record<string, any> | string;
  config?: Record<string, any> | string;
  position_x?: number;
  position_y?: number;
  next_nodes?: string[];
  next_node_id?: string;
  step_order?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "inactive" | "running" | "completed" | "failed" | string;
  user_id?: string;
  owner_id?: string;
  configuration?: Record<string, any> | string;
  nodes?: WorkflowNode[];
  created_at: string;
  updated_at?: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  configuration?: Record<string, any> | string;
  nodes?: WorkflowNodeCreate[];
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  status?: string;
  configuration?: Record<string, any> | string;
}

export interface MultiAgentExecution {
  id: string;
  objective: string;
  status: "pending" | "running" | "completed" | "failed" | string;
  result?: Record<string, any>;
  owner_id: string;
  agents_used: string[];
  total_tokens?: number;
  execution_time?: number;
  created_at: string;
  updated_at?: string;
}

export interface MultiAgentExecutionRequest {
  objective: string;
  subagents?: string[];
  initial_input?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  execution_id: string;
  sender_agent: string;
  receiver_agent: string;
  phase: string;
  content: string;
  created_at: string;
}

export interface ExecutionEvaluation {
  id: string;
  target_id: string;
  target_type: "task" | "workflow" | "multi_agent" | string;
  user_id: string;
  performance_score: number;
  detected_weaknesses: string[];
  root_cause_analysis?: string;
  detailed_feedback?: string;
  created_at: string;
}

export interface ImprovementProposal {
  id: string;
  agent_id: string;
  user_id: string;
  evaluation_id?: string;
  title: string;
  description: string;
  status: "draft" | "applied" | "rejected" | string;
  suggested_changes: Record<string, any>;
  created_at: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  configuration_snapshot: Record<string, any>;
  performance_metrics?: Record<string, any>;
  release_notes?: string;
  created_at: string;
}

export interface PerformanceExperiment {
  id: string;
  name: string;
  agent_id: string;
  baseline_version: number;
  candidate_version: number;
  baseline_score: number;
  candidate_score: number;
  is_promoted: boolean;
  sample_size: number;
  details?: Record<string, any>;
  created_at: string;
}

export interface ExecutionHistory {
  id: string;
  target_id: string;
  target_type: string;
  user_id: string;
  status: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  execution_duration: number;
  retries_count: number;
  created_at: string;
}

export interface SystemHealthComponent {
  status: "healthy" | "unhealthy" | "degraded" | string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: "ok" | "degraded" | "error" | string;
  components: {
    database: SystemHealthComponent;
    redis: SystemHealthComponent;
    chromadb: SystemHealthComponent;
    celery: SystemHealthComponent;
  };
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string | null;
  username?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  status: string;
  ip_address?: string | null;
  details_json?: string | null;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_agents: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_workflows: number;
  total_multi_agent_executions: number;
  total_self_improvement_proposals: number;
  total_audit_logs: number;
}

export interface SystemMetrics {
  uptime_seconds: number;
  total_api_requests: number;
  error_rate_percentage: number;
  active_db_connections: number;
  active_celery_tasks: number;
  chroma_vector_count: number;
}
