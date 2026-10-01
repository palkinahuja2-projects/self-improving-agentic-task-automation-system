import json
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.self_improvement import ExecutionEvaluation, ImprovementProposal
from app.schemas.self_improvement import ProposalCreateRequest
from app.self_improvement.feedback import FeedbackAnalysisEngine


class ImprovementStrategyEngine:
    @staticmethod
    def generate_proposal(
        db: Session,
        user_id: uuid.UUID,
        req: ProposalCreateRequest,
    ) -> ImprovementProposal:
        evaluation = db.query(ExecutionEvaluation).filter(
            ExecutionEvaluation.id == req.evaluation_id,
            ExecutionEvaluation.user_id == user_id,
        ).first()

        if not evaluation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Execution evaluation not found.",
            )

        category, explanation, diagnostic = FeedbackAnalysisEngine.analyze_feedback(evaluation)

        title = f"Improvement Proposal ({category.capitalize()}) for {evaluation.target_type.capitalize()}"
        description = (
            f"Automated strategy generated based on evaluation score {evaluation.score:.1f}/100.0. "
            f"{explanation}"
        )

        proposed_changes_dict = {
            "category": category,
            "target_type": evaluation.target_type,
            "target_id": str(evaluation.target_id),
            "diagnostic": diagnostic,
            "updates": {},
        }

        if category == "capability":
            proposed_changes_dict["updates"]["add_capabilities"] = ["error_resilience", "robust_parsing"]
        elif category == "prompt":
            proposed_changes_dict["updates"]["prompt_suffix"] = (
                "\n[IMPROVEMENT RULE]: Ensure structured output validation and error checking."
            )
        elif category == "model_config":
            proposed_changes_dict["updates"]["model_config_json"] = json.dumps({
                "temperature": 0.2,
                "max_tokens": 2048,
                "model": "gpt-4o-mini",
            })
        else:
            proposed_changes_dict["updates"]["tools_config"] = json.dumps([
                "web_search",
                "python_interpreter",
            ])

        proposal = ImprovementProposal(
            user_id=user_id,
            evaluation_id=evaluation.id,
            agent_id=req.agent_id,
            workflow_id=req.workflow_id,
            category=category,
            title=title,
            description=description,
            proposed_changes=json.dumps(proposed_changes_dict),
            status="proposed",
        )

        db.add(proposal)
        db.commit()
        db.refresh(proposal)

        return proposal

