import json
import uuid
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.self_improvement import ExecutionEvaluation
from app.schemas.self_improvement import EvaluationCreateRequest


class EvaluationEngine:
    @staticmethod
    def evaluate_execution(
        db: Session,
        user_id: uuid.UUID,
        req: EvaluationCreateRequest,
    ) -> ExecutionEvaluation:
        # Base score starts at 100.0
        score = 100.0
        weaknesses: List[Dict[str, Any]] = []

        # 1. Success / Failure Evaluation
        if not req.success:
            score -= 50.0
            weaknesses.append({
                "type": "execution_failure",
                "severity": "high",
                "message": "Execution marked as failed.",
            })

        # 2. Error Count Deduction
        if req.error_count > 0:
            penalty = min(30.0, req.error_count * 10.0)
            score -= penalty
            weaknesses.append({
                "type": "errors_detected",
                "severity": "medium",
                "message": f"Detected {req.error_count} execution errors.",
            })

        # 3. Retry Count Deduction
        if req.retry_count > 0:
            penalty = min(20.0, req.retry_count * 5.0)
            score -= penalty
            weaknesses.append({
                "type": "retries_exceeded",
                "severity": "medium",
                "message": f"Required {req.retry_count} retries.",
            })

        # 4. Latency Penalty
        if req.execution_time_ms > 5000:
            score -= 10.0
            weaknesses.append({
                "type": "high_latency",
                "severity": "low",
                "message": f"Execution time ({req.execution_time_ms:.1f}ms) exceeded 5000ms threshold.",
            })

        # 5. Output Quality & Reviewer Feedback
        output_quality = 80.0
        if req.output_text:
            if len(req.output_text.strip()) > 50:
                output_quality += 15.0
            if "error" in req.output_text.lower() or "failed" in req.output_text.lower():
                output_quality -= 25.0
                weaknesses.append({
                    "type": "suboptimal_output",
                    "severity": "medium",
                    "message": "Output payload contains failure keywords.",
                })
        else:
            output_quality = 30.0
            weaknesses.append({
                "type": "missing_output",
                "severity": "high",
                "message": "No output payload returned.",
            })

        if req.reviewer_feedback:
            if "PASSED" in req.reviewer_feedback:
                output_quality = min(100.0, output_quality + 10.0)
            elif "WARNING" in req.reviewer_feedback or "FAILED" in req.reviewer_feedback:
                output_quality = max(0.0, output_quality - 30.0)
                weaknesses.append({
                    "type": "reviewer_rejection",
                    "severity": "high",
                    "message": f"Quality reviewer issued warning or rejection: {req.reviewer_feedback}",
                })

        output_quality_score = max(0.0, min(100.0, output_quality))

        # Weight overall score: 70% execution metric score + 30% output quality score
        final_score = max(0.0, min(100.0, (score * 0.7) + (output_quality_score * 0.3)))

        feedback_summary = (
            f"Evaluation Score: {final_score:.1f}/100.0. "
            f"Success: {req.success}, Errors: {req.error_count}, Retries: {req.retry_count}, "
            f"Latency: {req.execution_time_ms:.1f}ms, Quality: {output_quality_score:.1f}/100.0. "
            f"Identified Weaknesses: {len(weaknesses)}."
        )

        evaluation = ExecutionEvaluation(
            user_id=user_id,
            target_type=req.target_type,
            target_id=req.target_id,
            score=round(final_score, 2),
            execution_time_ms=req.execution_time_ms,
            success=req.success,
            error_count=req.error_count,
            retry_count=req.retry_count,
            output_quality_score=round(output_quality_score, 2),
            weaknesses=json.dumps(weaknesses),
            feedback_summary=feedback_summary,
        )

        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)

        return evaluation

