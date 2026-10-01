from datetime import datetime, timezone
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import ExecutionHistory
from app.models.workflow import Workflow
from app.models.workflow_node import WorkflowNode
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowNodeCreate,
    WorkflowNodeUpdate,
    WorkflowUpdate,
)


class WorkflowService:
    @staticmethod
    def create_workflow(
        db: Session, user_id: uuid.UUID, workflow_in: WorkflowCreate
    ) -> Workflow:
        workflow = Workflow(
            user_id=user_id,
            name=workflow_in.name,
            description=workflow_in.description,
            status=workflow_in.status,
            configuration=workflow_in.configuration,
        )
        db.add(workflow)
        db.flush()

        for node_in in workflow_in.nodes:
            node = WorkflowNode(
                workflow_id=workflow.id,
                name=node_in.name,
                node_type=node_in.node_type,
                agent_id=node_in.agent_id,
                step_order=node_in.step_order,
                config=node_in.config,
                next_node_id=node_in.next_node_id,
                on_failure=node_in.on_failure,
            )
            db.add(node)

        db.commit()
        db.refresh(workflow)
        return workflow

    @staticmethod
    def get_workflow(
        db: Session, workflow_id: uuid.UUID, user_id: uuid.UUID
    ) -> Workflow | None:
        stmt = select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == user_id)
        return db.scalars(stmt).first()

    @staticmethod
    def list_workflows(
        db: Session, user_id: uuid.UUID, status: str | None = None
    ) -> Sequence[Workflow]:
        stmt = select(Workflow).where(Workflow.user_id == user_id)
        if status:
            stmt = stmt.where(Workflow.status == status)
        stmt = stmt.order_by(Workflow.created_at.desc())
        return db.scalars(stmt).all()

    @staticmethod
    def update_workflow(
        db: Session, workflow: Workflow, workflow_in: WorkflowUpdate
    ) -> Workflow:
        update_data = workflow_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)
        db.commit()
        db.refresh(workflow)
        return workflow

    @staticmethod
    def delete_workflow(db: Session, workflow: Workflow) -> None:
        db.delete(workflow)
        db.commit()

    # Node Management
    @staticmethod
    def get_workflow_nodes(
        db: Session, workflow_id: uuid.UUID
    ) -> Sequence[WorkflowNode]:
        stmt = (
            select(WorkflowNode)
            .where(WorkflowNode.workflow_id == workflow_id)
            .order_by(WorkflowNode.step_order.asc())
        )
        return db.scalars(stmt).all()

    @staticmethod
    def add_node(
        db: Session, workflow_id: uuid.UUID, node_in: WorkflowNodeCreate
    ) -> WorkflowNode:
        node = WorkflowNode(
            workflow_id=workflow_id,
            name=node_in.name,
            node_type=node_in.node_type,
            agent_id=node_in.agent_id,
            step_order=node_in.step_order,
            config=node_in.config,
            next_node_id=node_in.next_node_id,
            on_failure=node_in.on_failure,
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def update_node(
        db: Session, node: WorkflowNode, node_in: WorkflowNodeUpdate
    ) -> WorkflowNode:
        update_data = node_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(node, field, value)
        db.commit()
        db.refresh(node)
        return node

    @staticmethod
    def delete_node(db: Session, node: WorkflowNode) -> None:
        db.delete(node)
        db.commit()

    @staticmethod
    def activate_workflow(db: Session, workflow: Workflow) -> Workflow:
        workflow.status = "active"
        db.commit()
        db.refresh(workflow)
        return workflow

    @staticmethod
    def deactivate_workflow(db: Session, workflow: Workflow) -> Workflow:
        workflow.status = "paused"
        db.commit()
        db.refresh(workflow)
        return workflow

    @staticmethod
    def get_workflow_history(
        db: Session, workflow_id: uuid.UUID, user_id: uuid.UUID
    ) -> Sequence[ExecutionHistory]:
        stmt = (
            select(ExecutionHistory)
            .where(
                ExecutionHistory.workflow_id == workflow_id,
                ExecutionHistory.user_id == user_id,
            )
            .order_by(ExecutionHistory.created_at.desc())
        )
        return db.scalars(stmt).all()

    @staticmethod
    def validate_workflow_graph(nodes: Sequence[WorkflowNode]) -> bool:
        """Validate that the workflow graph is directed and acyclic (no cycles)."""
        node_ids = {node.id for node in nodes}
        adj = {node.id: node.next_node_id for node in nodes}

        visited: set[uuid.UUID] = set()
        rec_stack: set[uuid.UUID] = set()

        def dfs(curr: uuid.UUID) -> bool:
            visited.add(curr)
            rec_stack.add(curr)

            next_node = adj.get(curr)
            if next_node and next_node in node_ids:
                if next_node not in visited:
                    if not dfs(next_node):
                        return False
                elif next_node in rec_stack:
                    return False  # Cycle detected

            rec_stack.remove(curr)
            return True

        for node_id in node_ids:
            if node_id not in visited:
                if not dfs(node_id):
                    return False

        return True
