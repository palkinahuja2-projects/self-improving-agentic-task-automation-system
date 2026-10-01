from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.self_improvement import (
    AgentVersion,
    ExecutionEvaluation,
    ImprovementProposal,
    PerformanceExperiment,
)
from app.models.user import User
from app.schemas.self_improvement import (
    AgentVersionResponse,
    EvaluationCreateRequest,
    EvaluationResponse,
    ExperimentResponse,
    ExperimentRunRequest,
    ProposalCreateRequest,
    ProposalResponse,
)
from app.self_improvement.evaluator import EvaluationEngine
from app.self_improvement.experiment import ExperimentRunner
from app.self_improvement.strategy import ImprovementStrategyEngine
from app.self_improvement.versioning import VersionManager

router = APIRouter(
    prefix="/self-improvement",
    tags=["Self-Improvement System"],
)


@router.post(
    "/evaluate",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
)
def evaluate_execution(
    req: EvaluationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvaluationResponse:
    """Evaluate performance of a task, workflow, or multi-agent execution."""
    return EvaluationEngine.evaluate_execution(
        db=db, user_id=current_user.id, req=req
    )


@router.get(
    "/evaluations/{target_id}",
    response_model=List[EvaluationResponse],
)
def get_evaluations_by_target(
    target_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[EvaluationResponse]:
    """Retrieve evaluation history for a target task, workflow, or execution."""
    evals = db.query(ExecutionEvaluation).filter(
        ExecutionEvaluation.target_id == target_id,
        ExecutionEvaluation.user_id == current_user.id,
    ).order_by(ExecutionEvaluation.created_at.desc()).all()

    if not evals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No evaluations found for target.",
        )
    return evals


@router.post(
    "/proposals",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_proposal(
    req: ProposalCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProposalResponse:
    """Generate an automated improvement proposal based on an execution evaluation."""
    return ImprovementStrategyEngine.generate_proposal(
        db=db, user_id=current_user.id, req=req
    )


@router.get(
    "/proposals",
    response_model=List[ProposalResponse],
)
def list_proposals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ProposalResponse]:
    """List all improvement proposals generated for the user."""
    return db.query(ImprovementProposal).filter(
        ImprovementProposal.user_id == current_user.id,
    ).order_by(ImprovementProposal.created_at.desc()).all()


@router.post(
    "/proposals/{proposal_id}/apply",
    response_model=ProposalResponse,
)
def apply_proposal(
    proposal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProposalResponse:
    """Apply an improvement proposal to an agent or workflow, recording a new version snapshot."""
    proposal, _ = VersionManager.apply_proposal(
        db=db, user_id=current_user.id, proposal_id=proposal_id
    )
    return proposal


@router.post(
    "/agents/{agent_id}/rollback/{target_version}",
    response_model=AgentVersionResponse,
)
def rollback_agent_version(
    agent_id: UUID,
    target_version: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentVersionResponse:
    """Rollback an agent's configuration to a previous version snapshot."""
    _, version_snapshot = VersionManager.rollback_agent_version(
        db=db,
        user_id=current_user.id,
        agent_id=agent_id,
        target_version_number=target_version,
    )
    return version_snapshot


@router.get(
    "/agents/{agent_id}/versions",
    response_model=List[AgentVersionResponse],
)
def list_agent_versions(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AgentVersionResponse]:
    """List all historical version snapshots for a specified agent."""
    versions = db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent_id,
    ).order_by(AgentVersion.version_number.desc()).all()

    if not versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No versions found for agent.",
        )
    return versions


@router.post(
    "/experiments/run",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_experiment(
    req: ExperimentRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """Run a controlled performance experiment comparing baseline vs candidate metrics."""
    return ExperimentRunner.run_experiment(
        db=db, user_id=current_user.id, req=req
    )

