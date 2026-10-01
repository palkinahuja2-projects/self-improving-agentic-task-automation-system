import json
import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import Agent


class AgentRegistry:
    @staticmethod
    def get_agents_by_role(
        db: Session, user_id: uuid.UUID, role: str
    ) -> Sequence[Agent]:
        stmt = select(Agent).where(
            Agent.owner_id == user_id,
            Agent.role == role,
            Agent.is_active.is_(True),
        )
        return db.scalars(stmt).all()

    @staticmethod
    def find_best_agent_for_task(
        db: Session,
        user_id: uuid.UUID,
        required_role: str,
        required_capabilities: list[str] | None = None,
    ) -> Agent:
        agents = AgentRegistry.get_agents_by_role(db, user_id, required_role)
        if agents:
            if required_capabilities:
                for agent in agents:
                    if agent.capabilities:
                        caps = json.loads(agent.capabilities) if isinstance(agent.capabilities, str) else []
                        if any(c in caps for c in required_capabilities):
                            return agent
            return agents[0]

        # Auto-provision system agent if none found for role
        role_titles = {
            "planner": "System Planner Agent",
            "researcher": "System Researcher Agent",
            "analyst": "System Data Analyst Agent",
            "executor": "System Execution Agent",
            "reviewer": "System Quality Reviewer Agent",
            "coordinator": "System Multi-Agent Coordinator",
        }
        title = role_titles.get(required_role, f"System {required_role.capitalize()} Agent")
        
        agent = Agent(
            owner_id=user_id,
            name=title,
            description=f"Automated specialized system agent for role '{required_role}'",
            agent_type="specialized",
            role=required_role,
            capabilities=json.dumps(required_capabilities or [required_role]),
            is_active=True,
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent
