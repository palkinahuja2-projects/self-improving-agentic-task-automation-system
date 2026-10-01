import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import {
  AdminDashboardStats,
  Agent,
  AgentCreate,
  AgentUpdate,
  AgentVersion,
  AuditLog,
  ExecutionEvaluation,
  ExecutionHistory,
  ImprovementProposal,
  Memory,
  MemoryCreate,
  MemorySearchResult,
  MemoryUpdate,
  MultiAgentExecution,
  MultiAgentExecutionRequest,
  PerformanceExperiment,
  SystemHealth,
  SystemMetrics,
  Task,
  TaskCreate,
  TaskUpdate,
  TokenResponse,
  User,
  Workflow,
  WorkflowCreate,
  WorkflowNode,
  WorkflowNodeCreate,
  WorkflowNodeUpdate,
  WorkflowUpdate,
} from "@/types";

const getApiBaseUrl = (): string => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cleanUrl = rawUrl.replace(/\/+$/, "");
  if (cleanUrl.endsWith("/api/v1")) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor for token refresh & error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== "undefined") {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const res = await axios.post<TokenResponse>(
            `${getApiBaseUrl()}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          const { access_token } = res.data;
          localStorage.setItem("access_token", access_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// API Helper Methods
// ─────────────────────────────────────────────

export const authApi = {
  register: async (data: {
    email: string;
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const res = await apiClient.post<User>("/auth/register", data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<TokenResponse>("/auth/login", data);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<User>("/auth/me");
    return res.data;
  },
  logout: async () => {
    try {
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (e) {
      // Ignore logout backend errors
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    }
  },
};

export const healthApi = {
  getHealth: async () => {
    const res = await apiClient.get<SystemHealth>("/health");
    return res.data;
  },
};

export const agentsApi = {
  list: async () => {
    const res = await apiClient.get<Agent[]>("/agents");
    return Array.isArray(res.data) ? res.data : [];
  },
  getById: async (id: string) => {
    const res = await apiClient.get<Agent>(`/agents/${id}`);
    return res.data;
  },
  create: async (data: AgentCreate) => {
    const payload = {
      ...data,
      capabilities: Array.isArray(data.capabilities)
        ? data.capabilities.join(", ")
        : data.capabilities || undefined,
    };
    const res = await apiClient.post<Agent>("/agents", payload);
    return res.data;
  },
  update: async (id: string, data: AgentUpdate) => {
    const payload = {
      ...data,
      capabilities: Array.isArray(data.capabilities)
        ? data.capabilities.join(", ")
        : data.capabilities,
    };
    const res = await apiClient.put<Agent>(`/agents/${id}`, payload);
    return res.data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/agents/${id}`);
  },
  getVersions: async (id: string) => {
    const res = await apiClient.get<AgentVersion[]>(`/self-improvement/agents/${id}/versions`);
    return Array.isArray(res.data) ? res.data : [];
  },
  rollbackVersion: async (id: string, version: number) => {
    const res = await apiClient.post<AgentVersion>(
      `/self-improvement/agents/${id}/rollback/${version}`
    );
    return res.data;
  },
};

export const memoriesApi = {
  list: async (params?: { agent_id?: string; memory_type?: string }) => {
    const res = await apiClient.get<Memory[]>("/memories", { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  create: async (data: MemoryCreate) => {
    const res = await apiClient.post<Memory>("/memories", data);
    return res.data;
  },
  search: async (query: {
    query: string;
    query_text?: string;
    limit?: number;
    top_k?: number;
    agent_id?: string;
    memory_type?: string;
    min_similarity?: number;
  }) => {
    const payload = {
      query: query.query || query.query_text || "",
      limit: query.limit ?? query.top_k ?? 10,
      agent_id: query.agent_id,
      memory_type: query.memory_type,
      min_similarity: query.min_similarity ?? 0.0,
    };
    const res = await apiClient.post<MemorySearchResult[]>("/memories/search", payload);
    return Array.isArray(res.data) ? res.data : [];
  },
  update: async (id: string, data: MemoryUpdate) => {
    const res = await apiClient.put<Memory>(`/memories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/memories/${id}`);
  },
  clearShortTerm: async (agent_id?: string) => {
    const res = await apiClient.delete<{ message: string; cleared_count: number }>(
      "/memories/short-term",
      { params: { agent_id } }
    );
    return res.data;
  },
};

export const tasksApi = {
  list: async (status?: string) => {
    const res = await apiClient.get<Task[]>("/tasks", { params: { status } });
    return Array.isArray(res.data) ? res.data : [];
  },
  getById: async (id: string) => {
    const res = await apiClient.get<Task>(`/tasks/${id}`);
    return res.data;
  },
  create: async (data: TaskCreate) => {
    const payload = {
      title: data.title || data.name || "Untitled Task",
      description: data.description,
      agent_id: data.agent_id || data.assigned_agent_id || null,
      priority: data.priority || "medium",
      input_data:
        typeof data.input_data === "object"
          ? JSON.stringify(data.input_data)
          : data.input_data || null,
      max_retries: data.max_retries ?? 3,
    };
    const res = await apiClient.post<Task>("/tasks", payload);
    return res.data;
  },
  update: async (id: string, data: TaskUpdate) => {
    const payload = {
      title: data.title || data.name,
      description: data.description,
      agent_id: data.agent_id || data.assigned_agent_id,
      status: data.status,
      priority: data.priority,
      input_data:
        typeof data.input_data === "object"
          ? JSON.stringify(data.input_data)
          : data.input_data,
      max_retries: data.max_retries,
    };
    const res = await apiClient.put<Task>(`/tasks/${id}`, payload);
    return res.data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/tasks/${id}`);
  },
  execute: async (id: string, inputData?: Record<string, any> | string) => {
    const payloadInput =
      typeof inputData === "object" ? JSON.stringify(inputData) : inputData;
    const res = await apiClient.post<Task>(`/tasks/${id}/execute`, {
      input_data: payloadInput,
    });
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await apiClient.post<Task>(`/tasks/${id}/cancel`);
    return res.data;
  },
  getHistory: async (id: string) => {
    const res = await apiClient.get<ExecutionHistory[]>(`/tasks/${id}/history`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const workflowsApi = {
  list: async (status?: string) => {
    const res = await apiClient.get<Workflow[]>("/workflows", { params: { status } });
    return Array.isArray(res.data) ? res.data : [];
  },
  getById: async (id: string) => {
    const res = await apiClient.get<Workflow>(`/workflows/${id}`);
    return res.data;
  },
  create: async (data: WorkflowCreate) => {
    const res = await apiClient.post<Workflow>("/workflows", data);
    return res.data;
  },
  update: async (id: string, data: WorkflowUpdate) => {
    const res = await apiClient.put<Workflow>(`/workflows/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    await apiClient.delete(`/workflows/${id}`);
  },
  addNode: async (workflowId: string, node: WorkflowNodeCreate) => {
    const res = await apiClient.post<WorkflowNode>(`/workflows/${workflowId}/nodes`, node);
    return res.data;
  },
  updateNode: async (workflowId: string, nodeId: string, node: WorkflowNodeUpdate) => {
    const res = await apiClient.put<WorkflowNode>(
      `/workflows/${workflowId}/nodes/${nodeId}`,
      node
    );
    return res.data;
  },
  deleteNode: async (workflowId: string, nodeId: string) => {
    await apiClient.delete(`/workflows/${workflowId}/nodes/${nodeId}`);
  },
  activate: async (id: string) => {
    const res = await apiClient.post<Workflow>(`/workflows/${id}/activate`);
    return res.data;
  },
  deactivate: async (id: string) => {
    const res = await apiClient.post<Workflow>(`/workflows/${id}/deactivate`);
    return res.data;
  },
  execute: async (id: string, inputData?: Record<string, any>) => {
    const res = await apiClient.post<Workflow>(`/workflows/${id}/execute`, {
      input_data: inputData,
    });
    return res.data;
  },
  getHistory: async (id: string) => {
    const res = await apiClient.get<ExecutionHistory[]>(`/workflows/${id}/history`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const multiAgentApi = {
  execute: async (req: MultiAgentExecutionRequest) => {
    const res = await apiClient.post<MultiAgentExecution>("/multi-agent/execute", req);
    return res.data;
  },
  list: async () => {
    const res = await apiClient.get<MultiAgentExecution[]>("/multi-agent/executions");
    return Array.isArray(res.data) ? res.data : [];
  },
  getById: async (id: string) => {
    const res = await apiClient.get<MultiAgentExecution>(`/multi-agent/executions/${id}`);
    return res.data;
  },
  getMessages: async (id: string) => {
    const res = await apiClient.get<any[]>(`/multi-agent/executions/${id}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const selfImprovementApi = {
  evaluate: async (req: {
    target_id: string;
    target_type: string;
    execution_time_seconds?: number;
    tokens_used?: number;
    user_satisfaction_rating?: number;
    error_occurred?: boolean;
    logs?: string[];
  }) => {
    const res = await apiClient.post<ExecutionEvaluation>("/self-improvement/evaluate", req);
    return res.data;
  },
  getEvaluations: async (targetId: string) => {
    const res = await apiClient.get<ExecutionEvaluation[]>(
      `/self-improvement/evaluations/${targetId}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },
  createProposal: async (req: {
    agent_id: string;
    evaluation_id?: string;
    custom_instruction?: string;
  }) => {
    const res = await apiClient.post<ImprovementProposal>("/self-improvement/proposals", req);
    return res.data;
  },
  listProposals: async () => {
    const res = await apiClient.get<ImprovementProposal[]>("/self-improvement/proposals");
    return Array.isArray(res.data) ? res.data : [];
  },
  applyProposal: async (proposalId: string) => {
    const res = await apiClient.post<ImprovementProposal>(
      `/self-improvement/proposals/${proposalId}/apply`
    );
    return res.data;
  },
  runExperiment: async (req: {
    name: string;
    agent_id: string;
    baseline_version: number;
    candidate_version: number;
    sample_size?: number;
  }) => {
    const res = await apiClient.post<PerformanceExperiment>(
      "/self-improvement/experiments/run",
      req
    );
    return res.data;
  },
};

export const adminApi = {
  getDashboardStats: async () => {
    const res = await apiClient.get<AdminDashboardStats>("/admin/dashboard");
    return res.data;
  },
  listUsers: async (params?: { search?: string; role?: string; is_active?: boolean }) => {
    const res = await apiClient.get<User[]>("/admin/users", { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  getUser: async (userId: string) => {
    const res = await apiClient.get<User>(`/admin/users/${userId}`);
    return res.data;
  },
  updateUserStatus: async (userId: string, is_active: boolean) => {
    const res = await apiClient.put<User>(`/admin/users/${userId}/status`, { is_active });
    return res.data;
  },
  updateUserRole: async (userId: string, role: string, is_superuser?: boolean) => {
    const res = await apiClient.put<User>(`/admin/users/${userId}/role`, { role, is_superuser });
    return res.data;
  },
  listAgents: async () => {
    const res = await apiClient.get<Agent[]>("/admin/agents");
    return Array.isArray(res.data) ? res.data : [];
  },
  listTasks: async () => {
    const res = await apiClient.get<Task[]>("/admin/tasks");
    return Array.isArray(res.data) ? res.data : [];
  },
  listWorkflows: async () => {
    const res = await apiClient.get<Workflow[]>("/admin/workflows");
    return Array.isArray(res.data) ? res.data : [];
  },
  listMultiAgentExecutions: async () => {
    const res = await apiClient.get<MultiAgentExecution[]>("/admin/multi-agent/executions");
    return Array.isArray(res.data) ? res.data : [];
  },
  listSelfImprovementProposals: async () => {
    const res = await apiClient.get<ImprovementProposal[]>("/admin/self-improvement");
    return Array.isArray(res.data) ? res.data : [];
  },
  listAuditLogs: async (params?: { action?: string; resource_type?: string }) => {
    const res = await apiClient.get<AuditLog[]>("/admin/audit-logs", { params });
    return Array.isArray(res.data) ? res.data : [];
  },
  listSecurityEvents: async () => {
    const res = await apiClient.get<AuditLog[]>("/admin/security-events");
    return Array.isArray(res.data) ? res.data : [];
  },
  getSystemHealth: async () => {
    const res = await apiClient.get<any>("/admin/system-health");
    return res.data;
  },
  getSystemMetrics: async () => {
    const res = await apiClient.get<SystemMetrics>("/admin/system-metrics");
    return res.data;
  },
};
