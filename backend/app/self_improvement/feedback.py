import json
from typing import Any, Dict, List, Tuple

from app.models.self_improvement import ExecutionEvaluation


class FeedbackAnalysisEngine:
    @staticmethod
    def analyze_feedback(evaluation: ExecutionEvaluation) -> Tuple[str, str, Dict[str, Any]]:
        weaknesses: List[Dict[str, Any]] = []
        if evaluation.weaknesses:
            try:
                weaknesses = json.loads(evaluation.weaknesses)
            except Exception:
                weaknesses = []

        primary_category = "prompt"
        root_cause_explanation = "Standard prompt refinement recommended."
        diagnostic_payload: Dict[str, Any] = {
            "evaluation_id": str(evaluation.id),
            "score": evaluation.score,
            "detected_issues": [w.get("type") for w in weaknesses],
        }

        # Analyze weakness patterns to determine primary category & cause
        has_failure = any(w.get("type") == "execution_failure" for w in weaknesses)
        has_errors = any(w.get("type") == "errors_detected" for w in weaknesses)
        has_latency = any(w.get("type") == "high_latency" for w in weaknesses)
        has_quality = any(w.get("type") in ("suboptimal_output", "reviewer_rejection") for w in weaknesses)

        if has_failure or has_errors:
            primary_category = "capability"
            root_cause_explanation = (
                "Execution errors or task failure detected. The agent lacks specialized capabilities "
                "or requires enhanced error-handling guidance."
            )
            diagnostic_payload["action"] = "add_capabilities"
            diagnostic_payload["suggested_capabilities"] = ["error_resilience", "robust_parsing"]

        elif has_quality:
            primary_category = "prompt"
            root_cause_explanation = (
                "Suboptimal output or quality reviewer rejection detected. Prompt instructions require "
                "more structured output constraints and explicit formatting rules."
            )
            diagnostic_payload["action"] = "refine_prompt"
            diagnostic_payload["suggested_prompt_addition"] = (
                "Ensure output is thoroughly validated, precise, and contains no missing fields."
            )

        elif has_latency:
            primary_category = "model_config"
            root_cause_explanation = (
                "High latency detected. Recommended tuning model temperature or switching to a faster model configuration."
            )
            diagnostic_payload["action"] = "tune_model_config"
            diagnostic_payload["suggested_config"] = {"temperature": 0.3, "max_tokens": 1024}

        else:
            primary_category = "tools"
            root_cause_explanation = (
                "Performance is satisfactory but tool utilization can be optimized for higher accuracy."
            )
            diagnostic_payload["action"] = "optimize_tools"
            diagnostic_payload["suggested_tools"] = ["web_search", "code_executor"]

        return primary_category, root_cause_explanation, diagnostic_payload

