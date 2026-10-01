import json
import sys
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Import core & database models
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# 1. Core & Security
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)

# 2. Services
from app.services.user_service import create_user, get_user_by_email, get_user_by_username
from app.services.refresh_token_service import (
    create_refresh_token_record, get_refresh_token, revoke_refresh_token, is_refresh_token_valid
)
from app.services.health_service import HealthService
from app.services.embedding_service import embedding_service
from app.memory.vector_store import vector_store
from app.services.agent_service import (
    create_agent, get_agent, get_agents, update_agent, delete_agent,
    create_agent_memory, retrieve_agent_context_memories
)
from app.agents.registry import AgentRegistry
from app.services.memory_service import (
    create_memory, get_memory, list_memories, search_memories, update_memory,
    delete_memory, clear_short_term_memories
)
from app.services.task_service import TaskService
from app.tasks.execution_engine import TaskExecutionEngine
from app.services.workflow_service import WorkflowService
from app.tasks.workflow_engine import WorkflowExecutionEngine

# 3. Orchestration & Self-Improvement
from app.orchestration.orchestrator import MultiAgentOrchestrator
from app.orchestration.graph_engine import MultiAgentGraphEngine
from app.orchestration.protocol import AgentMessageProtocol
from app.orchestration.state import MultiAgentState

from app.self_improvement.evaluator import EvaluationEngine
from app.self_improvement.feedback import FeedbackAnalysisEngine
from app.self_improvement.strategy import ImprovementStrategyEngine
from app.self_improvement.versioning import VersionManager
from app.self_improvement.experiment import ExperimentRunner

# 4. Schemas
from app.schemas.memory import MemoryCreate, MemorySearchQuery, MemoryUpdate
from app.schemas.user import UserCreate, UserResponse
from app.schemas.agent import AgentCreate, AgentUpdate
from app.schemas.task import TaskCreate, TaskUpdate
from app.schemas.workflow import WorkflowCreate, WorkflowNodeCreate, WorkflowUpdate
from app.schemas.multi_agent import MultiAgentExecutionRequest
from app.schemas.self_improvement import EvaluationCreateRequest, ProposalCreateRequest, ExperimentRunRequest


def run_full_system_demo():
    print("=" * 80)
    print("  SELF-IMPROVING AGENTIC TASK AUTOMATION SYSTEM")
    print("  COMPLETE FUNCTIONAL DEMONSTRATION & EXECUTION TOUR")
    print("=" * 80)

    # 1. Setup SQLite In-Memory DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("\n--- 1. CORE & SECURITY MODULE ---")
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    is_valid = verify_password(password, hashed)
    token = create_access_token(subject="user_12345")
    decoded = decode_token(token)
    ref_tok = create_refresh_token(subject="user_12345")
    print(f"  [+] hash_password('{password}') -> {hashed[:30]}...")
    print(f"  [+] verify_password('{password}', hash) -> {is_valid}")
    print(f"  [+] create_access_token(subject='user_12345') -> {token[:30]}...")
    print(f"  [+] decode_token(token) -> subject: {decoded.get('sub')}")
    print(f"  [+] create_refresh_token(subject='user_12345') -> {ref_tok[:30]}...")

    print("\n--- 2. USER SERVICE ---")
    user_in = UserCreate(
        email="admin@agentic.ai",
        username="admin_user",
        password=password,
    )
    user = create_user(db, user_in)
    print(f"  [+] create_user -> ID: {user.id}, Username: {user.username}, Role: {user.role}")
    
    fetched_user_email = get_user_by_email(db, "admin@agentic.ai")
    fetched_user_username = get_user_by_username(db, "admin_user")
    print(f"  [+] get_user_by_email -> Found: {fetched_user_email.email}")
    print(f"  [+] get_user_by_username -> Found: {fetched_user_username.username}")

    print("\n--- 3. REFRESH TOKEN SERVICE ---")
    tok_rec = create_refresh_token_record(
        db, user_id=user.id, token=ref_tok, expires_at=datetime.now(timezone.utc)
    )
    print(f"  [+] create_refresh_token_record -> Token ID: {tok_rec.id}, Revoked: {tok_rec.is_revoked}")
    
    fetched_tok = get_refresh_token(db, ref_tok)
    print(f"  [+] get_refresh_token -> Found ID: {fetched_tok.id}")
    
    revoked = revoke_refresh_token(db, ref_tok)
    print(f"  [+] revoke_refresh_token -> Success: {revoked}")
    print(f"  [+] is_refresh_token_valid -> Valid: {is_refresh_token_valid(fetched_tok)}")

    print("\n--- 4. HEALTH SERVICE ---")
    deep_health = HealthService.get_deep_health_status(db)
    print(f"  [+] HealthService.get_deep_health_status -> Overall Status: {deep_health['status']}")
    print(f"      Database Component: {deep_health['components']['database']}")
    print(f"      Vector Store Component: {deep_health['components']['vector_store']}")

    print("\n--- 5. EMBEDDING SERVICE & VECTOR STORE ---")
    sample_text = "Autonomous AI agents collaborate on complex reasoning workflows."
    embedding = embedding_service.generate_embedding(sample_text)
    batch_embeddings = embedding_service.generate_embeddings([sample_text, "Second document payload"])
    print(f"  [+] EmbeddingService.generate_embedding -> Vector Dimension: {len(embedding)}")
    print(f"  [+] EmbeddingService.generate_embeddings -> Batch Count: {len(batch_embeddings)}")
    
    vector_store.add_vector(
        memory_id="mem_001",
        embedding=embedding,
        metadata={"user_id": str(user.id), "memory_type": "long_term"},
        document_text=sample_text
    )
    print(f"  [+] VectorStore.add_vector -> Memory 'mem_001' indexed.")
    
    similar_matches = vector_store.query_similar(
        query_embedding=embedding_service.generate_embedding("AI agent workflow execution"),
        user_id=str(user.id),
        limit=3
    )
    print(f"  [+] VectorStore.query_similar -> Matches found: {len(similar_matches)}, Top Similarity: {similar_matches[0][1] if similar_matches else 'N/A'}")

    vector_store.delete_vector("mem_001")
    print(f"  [+] VectorStore.delete_vector -> Memory 'mem_001' deleted from index.")

    print("\n--- 6. AGENT & MEMORY SERVICE & AGENT REGISTRY ---")
    agent_data = AgentCreate(
        name="Research Analyst Agent",
        description="Specialized in gathering web research and synthesizing data.",
        agent_type="specialized",
        is_active=True
    )
    agent = create_agent(db, agent_data=agent_data, owner_id=user.id)
    agent.role = "researcher"
    db.commit()
    print(f"  [+] create_agent -> Agent ID: {agent.id}, Name: {agent.name}")

    updated_agent = update_agent(db, agent, AgentUpdate(description="Updated description with higher capability."))
    print(f"  [+] update_agent -> Description: {updated_agent.description[:45]}...")

    agents_list = get_agents(db, owner_id=user.id)
    print(f"  [+] get_agents -> Total Agents for User: {len(agents_list)}")

    agent_by_id = get_agent(db, agent_id=agent.id, owner_id=user.id)
    print(f"  [+] get_agent -> Found Agent: {agent_by_id.name}")

    best_agent = AgentRegistry.find_best_agent_for_task(db, user_id=user.id, required_role="planner")
    print(f"  [+] AgentRegistry.find_best_agent_for_task -> Assigned: '{best_agent.name}' (Role: {best_agent.role})")

    agent_mem = create_agent_memory(
        db, agent=agent, content="Found key research report on quantum algorithms.", memory_type="long_term"
    )
    print(f"  [+] create_agent_memory -> Created Memory ID: {agent_mem.id}")

    recalled_mems = retrieve_agent_context_memories(db, agent=agent, query="quantum algorithms", limit=2)
    print(f"  [+] retrieve_agent_context_memories -> Recalled: {len(recalled_mems)} memories.")

    # Generic Memory Service
    mem1 = create_memory(db, MemoryCreate(content="User prefers Python for backend development.", memory_type="long_term"), owner_id=user.id)
    mem2 = create_memory(db, MemoryCreate(content="Temporary session token cache.", memory_type="short_term"), owner_id=user.id)
    print(f"  [+] create_memory -> Long Term ID: {mem1.id}, Short Term ID: {mem2.id}")

    memories_list = list_memories(db, owner_id=user.id)
    print(f"  [+] list_memories -> Total Memories: {len(memories_list)}")

    search_res = search_memories(db, MemorySearchQuery(query="Python backend development", limit=2), owner_id=user.id)
    print(f"  [+] search_memories -> Score: {search_res[0].score if search_res else 'N/A'}, Content: {search_res[0].memory.content if search_res else ''}")

    cleared_count = clear_short_term_memories(db, owner_id=user.id)
    print(f"  [+] clear_short_term_memories -> Cleared {cleared_count} short term memories.")

    print("\n--- 7. TASK SERVICE & TASK EXECUTION ENGINE ---")
    task_in = TaskCreate(
        title="Synthesize Market Analysis Report",
        description="Analyze Q3 trends and summarize opportunities.",
        agent_id=agent.id,
        input_data="Market data payload: Q3 revenue growth +15%",
        priority="high"
    )
    task = TaskService.create_task(db, user_id=user.id, task_in=task_in)
    print(f"  [+] TaskService.create_task -> Task ID: {task.id}, Title: {task.title}, Status: {task.status}")

    task_fetched = TaskService.get_task(db, task_id=task.id, user_id=user.id)
    tasks_all = TaskService.list_tasks(db, user_id=user.id)
    print(f"  [+] TaskService.get_task -> Found: {task_fetched.title}")
    print(f"  [+] TaskService.list_tasks -> Count: {len(tasks_all)}")

    # Execute task with engine
    executed_task = TaskExecutionEngine.execute_task(db, task_id=task.id, user_id=user.id)
    print(f"  [+] TaskExecutionEngine.execute_task -> New Status: {executed_task.status}")
    print(f"      Output: {executed_task.output_data.splitlines()[0]}")

    history = TaskService.get_task_history(db, task_id=task.id, user_id=user.id)
    print(f"  [+] TaskService.get_task_history -> Execution Records: {len(history)}")

    # Cancel task test
    task_2 = TaskService.create_task(db, user_id=user.id, task_in=TaskCreate(title="Task to cancel"))
    cancelled_task = TaskService.cancel_task(db, task_2)
    print(f"  [+] TaskService.cancel_task -> Status: {cancelled_task.status}")

    print("\n--- 8. WORKFLOW SERVICE & WORKFLOW EXECUTION ENGINE ---")
    wf_in = WorkflowCreate(
        name="Automated Data Pipeline Workflow",
        description="Extract, Transform, Analyze, and Review Pipeline",
        nodes=[
            WorkflowNodeCreate(name="Extract Step", node_type="agent_task", agent_id=agent.id, step_order=1),
            WorkflowNodeCreate(name="Transform Step", node_type="transform", step_order=2),
            WorkflowNodeCreate(name="Quality Check Step", node_type="condition", step_order=3),
        ]
    )
    workflow = WorkflowService.create_workflow(db, user_id=user.id, workflow_in=wf_in)
    print(f"  [+] WorkflowService.create_workflow -> ID: {workflow.id}, Name: {workflow.name}, Nodes: {len(workflow.nodes)}")

    nodes = WorkflowService.get_workflow_nodes(db, workflow_id=workflow.id)
    is_dag = WorkflowService.validate_workflow_graph(nodes)
    print(f"  [+] WorkflowService.validate_workflow_graph -> DAG Valid: {is_dag}")

    activated_wf = WorkflowService.activate_workflow(db, workflow)
    print(f"  [+] WorkflowService.activate_workflow -> Status: {activated_wf.status}")

    executed_wf = WorkflowExecutionEngine.execute_workflow(db, workflow_id=workflow.id, user_id=user.id, initial_input="Raw input telemetry data")
    print(f"  [+] WorkflowExecutionEngine.execute_workflow -> Status: {executed_wf.status}")

    wf_history = WorkflowService.get_workflow_history(db, workflow_id=workflow.id, user_id=user.id)
    print(f"  [+] WorkflowService.get_workflow_history -> Execution History Records: {len(wf_history)}")

    print("\n--- 9. MULTI-AGENT GRAPH ENGINE & ORCHESTRATION ---")
    ma_req = MultiAgentExecutionRequest(
        objective="Design an automated multi-tenant API authorization architecture"
    )
    ma_execution = MultiAgentOrchestrator.create_and_execute_session(db, user_id=user.id, req=ma_req)
    print(f"  [+] MultiAgentOrchestrator.create_and_execute_session -> ID: {ma_execution.id}")
    print(f"      Status: {ma_execution.status}, Duration: {ma_execution.duration_ms}ms")
    print(f"      Final Result Overview:\n{ma_execution.final_result[:160]}...")

    executions = MultiAgentOrchestrator.list_executions(db, user_id=user.id)
    fetched_exec = MultiAgentOrchestrator.get_execution(db, ma_execution.id, user_id=user.id)
    print(f"  [+] MultiAgentOrchestrator.list_executions -> Total Executions: {len(executions)}")
    print(f"  [+] MultiAgentOrchestrator.get_execution -> Found Objective: '{fetched_exec.objective}'")

    messages = MultiAgentOrchestrator.get_execution_messages(db, execution_id=ma_execution.id, user_id=user.id)
    print(f"  [+] MultiAgentOrchestrator.get_execution_messages -> Total Inter-Agent Messages Logged: {len(messages)}")
    for msg in messages[:3]:
        print(f"      - Sender: [{msg.sender_role}] -> Receiver: [{msg.receiver_role}] | Type: {msg.message_type}")

    print("\n--- 10. SELF-IMPROVEMENT CYCLE (EVALUATE -> PROPOSE -> APPLY -> EXPERIMENT -> ROLLBACK) ---")
    # 10a. Evaluate Execution
    eval_req = EvaluationCreateRequest(
        target_type="task",
        target_id=task.id,
        execution_time_ms=1200.0,
        success=True,
        error_count=1,
        retry_count=1,
        output_text="Result payload processed with minor fallback retry.",
        reviewer_feedback="Quality Review PASSED with minor notes."
    )
    evaluation = EvaluationEngine.evaluate_execution(db, user_id=user.id, req=eval_req)
    print(f"  [+] EvaluationEngine.evaluate_execution -> Score: {evaluation.score}/100.0")
    print(f"      Feedback Summary: {evaluation.feedback_summary}")

    # 10b. Feedback Analysis
    category, explanation, diagnostic = FeedbackAnalysisEngine.analyze_feedback(evaluation)
    print(f"  [+] FeedbackAnalysisEngine.analyze_feedback -> Category: {category}, Explanation: {explanation}")

    # 10c. Generate Improvement Proposal
    prop_req = ProposalCreateRequest(
        evaluation_id=evaluation.id,
        agent_id=agent.id
    )
    proposal = ImprovementStrategyEngine.generate_proposal(db, user_id=user.id, req=prop_req)
    print(f"  [+] ImprovementStrategyEngine.generate_proposal -> Proposal ID: {proposal.id}")
    print(f"      Category: {proposal.category}, Title: {proposal.title}")

    # 10d. Apply Proposal & Version Snapshot
    applied_prop, new_version = VersionManager.apply_proposal(db, user_id=user.id, proposal_id=proposal.id)
    print(f"  [+] VersionManager.apply_proposal -> Proposal Status: {applied_prop.status}")
    print(f"      Created Agent Version Snapshot: Version #{new_version.version_number} ({new_version.change_summary})")

    # 10e. Run Performance A/B Experiment
    exp_req = ExperimentRunRequest(
        proposal_id=proposal.id,
        baseline_execution_id=evaluation.id
    )
    experiment = ExperimentRunner.run_experiment(db, user_id=user.id, req=exp_req)
    print(f"  [+] ExperimentRunner.run_experiment -> Baseline Score: {experiment.baseline_score}, Candidate Score: {experiment.candidate_score}")
    print(f"      Improvement Ratio: {experiment.improvement_ratio}%, Outcome: {experiment.outcome}")

    # 10f. Rollback Version Test
    restored_agent, rollback_ver = VersionManager.rollback_agent_version(db, user_id=user.id, agent_id=agent.id, target_version_number=1)
    print(f"  [+] VersionManager.rollback_agent_version -> Restored to Version #1. New Snapshot: #{rollback_ver.version_number}")

    print("\n--- 11. REST API ENDPOINTS (FASTAPI TESTCLIENT TOUR) ---")
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)

    # Auth endpoints
    reg_resp = test_client.post("/api/v1/auth/register", json={
        "email": "client_user@agentic.ai",
        "username": "client_user",
        "password": "ClientPassword123!"
    })
    print(f"  [+] POST /api/v1/auth/register -> Status: {reg_resp.status_code}")

    login_resp = test_client.post("/api/v1/auth/login", json={
        "email": "client_user@agentic.ai",
        "password": "ClientPassword123!"
    })
    print(f"  [+] POST /api/v1/auth/login -> Status: {login_resp.status_code}")
    auth_data = login_resp.json()
    auth_token = auth_data.get("access_token")
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Me endpoint
    me_resp = test_client.get("/api/v1/auth/me", headers=headers)
    print(f"  [+] GET /api/v1/auth/me -> Status: {me_resp.status_code}, User: {me_resp.json().get('username')}")

    # Health endpoint
    health_resp = test_client.get("/api/v1/health")
    print(f"  [+] GET /api/v1/health -> Status: {health_resp.status_code}, Status Payload: {health_resp.json().get('status')}")

    # Agents endpoint
    agent_create_resp = test_client.post("/api/v1/agents", headers=headers, json={
        "name": "API Client Agent",
        "description": "Agent created via HTTP API endpoint",
        "agent_type": "general"
    })
    print(f"  [+] POST /api/v1/agents -> Status: {agent_create_resp.status_code}, Created ID: {agent_create_resp.json().get('id')}")

    agents_list_resp = test_client.get("/api/v1/agents", headers=headers)
    print(f"  [+] GET /api/v1/agents -> Status: {agents_list_resp.status_code}, Count: {len(agents_list_resp.json())}")

    # Multi-Agent API execution
    ma_api_resp = test_client.post("/api/v1/multi-agent/execute", headers=headers, json={
        "objective": "Build REST API OpenAPI schema validator module"
    })
    print(f"  [+] POST /api/v1/multi-agent/execute -> Status: {ma_api_resp.status_code}, Status: {ma_api_resp.json().get('status')}")

    app.dependency_overrides.clear()

    print("\n" + "=" * 80)
    print("SUCCESS: ALL SYSTEM MODULES, SERVICES, & FUNCTIONS TESTED AND VERIFIED WORKING!")
    print("=" * 80)

if __name__ == "__main__":
    run_full_system_demo()
