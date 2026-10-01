import json
import time
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.execution import ExecutionHistory
from app.models.workflow import Workflow
from app.models.workflow_node import WorkflowNode
from app.services.agent_service import (
    create_agent_memory,
    retrieve_agent_context_memories,
)
from app.services.workflow_service import WorkflowService


class WorkflowExecutionEngine:
    @staticmethod
    def execute_workflow(
        db: Session,
        workflow_id: uuid.UUID,
        user_id: uuid.UUID,
        initial_input: str | None = None,
    ) -> Workflow:
        workflow = (
            db.query(Workflow)
            .filter(Workflow.id == workflow_id, Workflow.user_id == user_id)
            .first()
        )
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found for user {user_id}")

        nodes = WorkflowService.get_workflow_nodes(db, workflow_id)
        if not nodes:
            raise ValueError(f"Workflow {workflow_id} has no execution nodes.")

        # Check for cycles
        if not WorkflowService.validate_workflow_graph(nodes):
            raise ValueError("Workflow contains cyclical node dependencies.")

        start_time = time.time()
        started_at = datetime.now(timezone.utc)

        workflow.status = "active"
        db.commit()

        workflow_history = ExecutionHistory(
            user_id=user_id,
            workflow_id=workflow.id,
            status="running",
            input_data=initial_input,
            started_at=started_at,
        )
        db.add(workflow_history)
        db.commit()

        current_input = initial_input or ""
        last_output = current_input

        # Execute node pipeline
        for node in nodes:
            node_start = time.time()
            node_started_at = datetime.now(timezone.utc)

            node_history = ExecutionHistory(
                user_id=user_id,
                workflow_id=workflow.id,
                workflow_node_id=node.id,
                status="running",
                input_data=last_output,
                started_at=node_started_at,
            )
            db.add(node_history)
            db.commit()

            try:
                if node.node_type == "agent_task":
                    # Execute agent node step
                    agent_context = []
                    agent = None
                    if node.agent_id:
                        agent = db.query(Agent).filter(Agent.id == node.agent_id).first()
                        if agent:
                            agent_context = retrieve_agent_context_memories(
                                db=db,
                                agent=agent,
                                query=last_output or node.name,
                                limit=3,
                            )

                    node_output = (
                        f"[Step {node.step_order} - {node.name}]\n"
                        f"Input: {last_output}\n"
                        f"Context Recalled: {len(agent_context)} memories.\n"
                        f"Action: Agent executed step successfully."
                    )

                    if agent:
                        create_agent_memory(
                            db=db,
                            agent=agent,
                            content=f"Workflow Step Output ({node.name}): {node_output}",
                            memory_type="episodic",
                        )

                elif node.node_type == "condition":
                    # Evaluate condition against last_output
                    condition_passed = "error" not in last_output.lower() and "fail" not in last_output.lower()
                    node_output = (
                        f"[Condition Step {node.name}] Result: {'PASSED' if condition_passed else 'FAILED'}"
                    )
                    if not condition_passed and node.on_failure == "stop":
                        raise ValueError(f"Condition check failed at node '{node.name}'")

                elif node.node_type == "delay":
                    delay_sec = 0.1
                    if node.config:
                        try:
                            delay_sec = float(node.config)
                        except ValueError:
                            pass
                    time.sleep(min(delay_sec, 2.0))
                    node_output = f"[Delay Step {node.name}] Delayed for {delay_sec}s."

                elif node.node_type == "transform":
                    node_output = f"[Transform Step {node.name}] Transformed Data: {last_output.upper()}"

                else:
                    node_output = f"[Generic Step {node.name}] Output: {last_output}"

                node_end = time.time()
                node_duration = round((node_end - node_start) * 1000, 2)
                node_completed_at = datetime.now(timezone.utc)

                node_history.status = "completed"
                node_history.output_data = node_output
                node_history.duration_ms = node_duration
                node_history.completed_at = node_completed_at
                db.commit()

                last_output = node_output

            except Exception as e:
                node_end = time.time()
                node_duration = round((node_end - node_start) * 1000, 2)
                node_completed_at = datetime.now(timezone.utc)

                error_msg = str(e)
                node_history.status = "failed"
                node_history.error_message = error_msg
                node_history.duration_ms = node_duration
                node_history.completed_at = node_completed_at
                db.commit()

                if node.on_failure == "stop":
                    workflow_history.status = "failed"
                    workflow_history.error_message = f"Failed at node '{node.name}': {error_msg}"
                    workflow_history.completed_at = datetime.now(timezone.utc)
                    workflow_history.duration_ms = round((time.time() - start_time) * 1000, 2)
                    db.commit()

                    workflow.status = "paused"
                    db.commit()
                    return workflow
                elif node.on_failure == "skip":
                    continue  # Proceed to next node

        end_time = time.time()
        workflow_duration = round((end_time - start_time) * 1000, 2)
        completed_at = datetime.now(timezone.utc)

        workflow_history.status = "completed"
        workflow_history.output_data = last_output
        workflow_history.duration_ms = workflow_duration
        workflow_history.completed_at = completed_at
        db.commit()

        db.refresh(workflow)
        return workflow
