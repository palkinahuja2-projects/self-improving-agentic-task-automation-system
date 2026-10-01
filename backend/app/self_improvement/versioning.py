import json
import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.self_improvement import AgentVersion, ImprovementProposal


class VersionManager:
    @staticmethod
    def create_agent_snapshot(
        db: Session,
        agent: Agent,
        change_summary: str = "Configuration Snapshot",
    ) -> AgentVersion:
        # Determine highest existing version number for this agent
        latest_ver = (
            db.query(AgentVersion)
            .filter(AgentVersion.agent_id == agent.id)
            .order_by(AgentVersion.version_number.desc())
            .first()
        )
        next_ver_num = (latest_ver.version_number + 1) if latest_ver else 1

        snapshot = AgentVersion(
            agent_id=agent.id,
            version_number=next_ver_num,
            name=agent.name,
            description=agent.description,
            agent_type=agent.agent_type,
            role=agent.role,
            capabilities=agent.capabilities,
            model_config_json=agent.model_config_json,
            tools_config=agent.tools_config,
            change_summary=change_summary,
            is_active=agent.is_active,
        )

        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot

    @staticmethod
    def apply_proposal(
        db: Session,
        user_id: uuid.UUID,
        proposal_id: uuid.UUID,
    ) -> Tuple[ImprovementProposal, Optional[AgentVersion]]:
        proposal = db.query(ImprovementProposal).filter(
            ImprovementProposal.id == proposal_id,
            ImprovementProposal.user_id == user_id,
        ).first()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Improvement proposal not found.",
            )

        if proposal.status == "applied":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proposal has already been applied.",
            )

        new_version: Optional[AgentVersion] = None

        if proposal.agent_id:
            agent = db.query(Agent).filter(
                Agent.id == proposal.agent_id,
                Agent.owner_id == user_id,
            ).first()

            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target agent for proposal not found.",
                )

            # 1. Create version snapshot before applying changes
            VersionManager.create_agent_snapshot(
                db=db,
                agent=agent,
                change_summary=f"Pre-application snapshot for proposal '{proposal.title}'",
            )

            # 2. Parse and apply updates
            try:
                changes = json.loads(proposal.proposed_changes)
                updates = changes.get("updates", {})
            except Exception:
                updates = {}

            if "add_capabilities" in updates:
                current_caps = agent.capabilities.split(",") if agent.capabilities else []
                current_caps = [c.strip() for c in current_caps if c.strip()]
                for cap in updates["add_capabilities"]:
                    if cap not in current_caps:
                        current_caps.append(cap)
                agent.capabilities = ", ".join(current_caps)

            if "prompt_suffix" in updates:
                agent.description = (agent.description or "") + updates["prompt_suffix"]

            if "model_config_json" in updates:
                agent.model_config_json = updates["model_config_json"]

            if "tools_config" in updates:
                agent.tools_config = updates["tools_config"]

            # 3. Create version snapshot after applying changes
            new_version = VersionManager.create_agent_snapshot(
                db=db,
                agent=agent,
                change_summary=f"Applied proposal '{proposal.title}'",
            )

            proposal.status = "applied"
            proposal.applied_version = new_version.version_number

        else:
            proposal.status = "applied"

        db.commit()
        db.refresh(proposal)

        return proposal, new_version

    @staticmethod
    def rollback_agent_version(
        db: Session,
        user_id: uuid.UUID,
        agent_id: uuid.UUID,
        target_version_number: int,
    ) -> Tuple[Agent, AgentVersion]:
        agent = db.query(Agent).filter(
            Agent.id == agent_id,
            Agent.owner_id == user_id,
        ).first()

        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found.",
            )

        target_version = db.query(AgentVersion).filter(
            AgentVersion.agent_id == agent_id,
            AgentVersion.version_number == target_version_number,
        ).first()

        if not target_version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {target_version_number} not found for agent.",
            )

        # Restore agent fields to target version state
        agent.name = target_version.name
        agent.description = target_version.description
        agent.agent_type = target_version.agent_type
        agent.role = target_version.role
        agent.capabilities = target_version.capabilities
        agent.model_config_json = target_version.model_config_json
        agent.tools_config = target_version.tools_config
        agent.is_active = target_version.is_active

        # Create new version snapshot capturing rollback
        rollback_snapshot = VersionManager.create_agent_snapshot(
            db=db,
            agent=agent,
            change_summary=f"Rollback to version {target_version_number}",
        )

        db.commit()
        db.refresh(agent)
        return agent, rollback_snapshot

