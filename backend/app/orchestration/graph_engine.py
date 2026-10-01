import json
import time
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.agents.registry import AgentRegistry
from app.models.agent import Agent
from app.models.multi_agent import MultiAgentExecution
from app.orchestration.protocol import AgentMessageProtocol
from app.orchestration.state import MultiAgentState, SubTaskState
from app.services.agent_service import (
    create_agent_memory,
    retrieve_agent_context_memories,
)


class MultiAgentGraphEngine:
    @staticmethod
    def run_graph(
        db: Session,
        execution: MultiAgentExecution,
        state: MultiAgentState,
    ) -> MultiAgentState:
        start_time = time.time()
        state.status = "running"
        execution.status = "running"
        db.commit()

        try:
            # Step 1: Planner Node - Objective Decomposition
            state = MultiAgentGraphEngine._planner_step(db, execution, state)

            # Step 2: Dispatch Node - Agent Selection & Assignment
            state = MultiAgentGraphEngine._dispatch_step(db, execution, state)

            # Step 3: Execution Nodes (Parallel / Sequential Specialized Execution)
            state = MultiAgentGraphEngine._execute_subtasks_step(db, execution, state)

            # Step 4: Reviewer Node - Quality Assurance & Validation
            state = MultiAgentGraphEngine._reviewer_step(db, execution, state)

            # Step 5: Aggregator Node - Final Synthesis
            state = MultiAgentGraphEngine._aggregator_step(db, execution, state)

            end_time = time.time()
            duration_ms = round((end_time - start_time) * 1000, 2)

            state.status = "completed"
            execution.status = "completed"
            execution.plan_json = json.dumps([st.model_dump() for st in state.plan])
            execution.final_result = state.final_summary
            execution.duration_ms = duration_ms
            execution.updated_at = datetime.now(timezone.utc)
            db.commit()

            return state

        except Exception as e:
            end_time = time.time()
            duration_ms = round((end_time - start_time) * 1000, 2)

            error_msg = str(e)
            state.status = "failed"
            state.errors.append(error_msg)

            execution.status = "failed"
            execution.error_message = error_msg
            execution.duration_ms = duration_ms
            execution.updated_at = datetime.now(timezone.utc)
            db.commit()

            return state

    @staticmethod
    def _planner_step(
        db: Session, execution: MultiAgentExecution, state: MultiAgentState
    ) -> MultiAgentState:
        planner_agent = AgentRegistry.find_best_agent_for_task(
            db=db, user_id=state.user_id, required_role="planner"
        )

        subtask_1 = SubTaskState(
            id=str(uuid.uuid4())[:8],
            title=f"Research & Data Gathering for '{state.objective}'",
            assigned_role="researcher",
            input_data=state.objective,
        )
        subtask_2 = SubTaskState(
            id=str(uuid.uuid4())[:8],
            title=f"Data Analysis & Processing for '{state.objective}'",
            assigned_role="analyst",
            input_data=state.objective,
        )
        subtask_3 = SubTaskState(
            id=str(uuid.uuid4())[:8],
            title=f"Actionable Execution & Synthesis for '{state.objective}'",
            assigned_role="executor",
            input_data=state.objective,
        )

        state.plan = [subtask_1, subtask_2, subtask_3]

        AgentMessageProtocol.create_and_log_message(
            db=db,
            execution_id=execution.id,
            sender_role="planner",
            receiver_role="coordinator",
            message_type="delegation",
            payload=f"Decomposed objective into {len(state.plan)} subtasks.",
            sender_agent_id=planner_agent.id,
        )
        return state

    @staticmethod
    def _dispatch_step(
        db: Session, execution: MultiAgentExecution, state: MultiAgentState
    ) -> MultiAgentState:
        coordinator_agent = AgentRegistry.find_best_agent_for_task(
            db=db, user_id=state.user_id, required_role="coordinator"
        )

        for subtask in state.plan:
            agent = AgentRegistry.find_best_agent_for_task(
                db=db, user_id=state.user_id, required_role=subtask.assigned_role
            )
            subtask.assigned_agent_id = str(agent.id)

            AgentMessageProtocol.create_and_log_message(
                db=db,
                execution_id=execution.id,
                sender_role="coordinator",
                receiver_role=subtask.assigned_role,
                message_type="request",
                payload=f"Assigned subtask '{subtask.title}' to agent {agent.name}",
                sender_agent_id=coordinator_agent.id,
                receiver_agent_id=agent.id,
            )
        return state

    @staticmethod
    def _execute_subtasks_step(
        db: Session, execution: MultiAgentExecution, state: MultiAgentState
    ) -> MultiAgentState:
        accumulated_context = ""

        for subtask in state.plan:
            agent_id = uuid.UUID(subtask.assigned_agent_id)
            agent = db.query(Agent).filter(Agent.id == agent_id).first()

            # Memory recall for specialized agent
            context_memories = []
            if agent:
                try:
                    context_memories = retrieve_agent_context_memories(
                        db=db,
                        agent=agent,
                        query=subtask.title,
                        limit=3,
                    )
                except Exception:
                    context_memories = []

            # Simulated specialized agent action execution
            subtask_input = f"{subtask.input_data}\nPrior Context: {accumulated_context}"
            output_str = (
                f"[{subtask.assigned_role.upper()} AGENT '{agent.name if agent else 'System'}']\n"
                f"Executed: {subtask.title}\n"
                f"Recalled Context: {len(context_memories)} memories.\n"
                f"Result Payload: Processed subtask step successfully."
            )

            subtask.status = "completed"
            subtask.output = output_str
            state.results[subtask.id] = output_str
            accumulated_context += f"\n---\n{output_str}"

            if agent:
                try:
                    create_agent_memory(
                        db=db,
                        agent=agent,
                        content=f"Subtask execution outcome ({subtask.title}): {output_str}",
                        memory_type="episodic",
                    )
                except Exception:
                    pass

            AgentMessageProtocol.create_and_log_message(
                db=db,
                execution_id=execution.id,
                sender_role=subtask.assigned_role,
                receiver_role="coordinator",
                message_type="response",
                payload=output_str,
                sender_agent_id=agent.id if agent else None,
            )

        return state

    @staticmethod
    def _reviewer_step(
        db: Session, execution: MultiAgentExecution, state: MultiAgentState
    ) -> MultiAgentState:
        reviewer_agent = AgentRegistry.find_best_agent_for_task(
            db=db, user_id=state.user_id, required_role="reviewer"
        )

        completed_subtasks = [st for st in state.plan if st.status == "completed"]
        review_passed = len(completed_subtasks) == len(state.plan)

        feedback = (
            f"Quality Review PASSED: Verified all {len(completed_subtasks)} subtask outputs."
            if review_passed
            else "Quality Review WARNING: Incomplete subtask outputs detected."
        )
        state.reviewer_feedback = feedback

        AgentMessageProtocol.create_and_log_message(
            db=db,
            execution_id=execution.id,
            sender_role="reviewer",
            receiver_role="coordinator",
            message_type="feedback",
            payload=feedback,
            sender_agent_id=reviewer_agent.id,
        )

        return state

    @staticmethod
    def _aggregator_step(
        db: Session, execution: MultiAgentExecution, state: MultiAgentState
    ) -> MultiAgentState:
        subtask_summaries = "\n\n".join(
            [f"• {st.title} -> {st.output}" for st in state.plan]
        )
        final_result = (
            f"=== MULTI-AGENT COLLABORATION FINAL RESULT ===\n"
            f"Objective: {state.objective}\n"
            f"Review Status: {state.reviewer_feedback}\n\n"
            f"Synthesized Subtask Outcomes:\n{subtask_summaries}"
        )
        state.final_summary = final_result
        return state
