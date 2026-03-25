from pathlib import Path
import sys

from state import PipelineState


def _ensure_project_import_paths(root: Path) -> None:
    """Allow importing modules that currently use flat local imports."""
    agents_path = str(root / "Agents")
    linting_path = str(root / "Linting")
    root_path = str(root)
    for path in (root_path, agents_path, linting_path):
        if path not in sys.path:
            sys.path.insert(0, path)


def run_pipeline(
    source_path: str,
    use_llm_doc_formatter: bool = False,
    documentation_output_path: str | None = None,
    use_gemini_detection_review: bool = True,
) -> PipelineState:
    """
    End-to-end run:
        BugDetectionAgent (AST + optional Gemini merge) -> LoopAgent(Fixer + validator) -> DocumentationAgent
    """
    source = Path(source_path)
    state = PipelineState(source_path=str(source))

    if not source.exists():
        state.errors.append(f"Source file not found: {source_path}")
        state.finish("ERROR")
        return state

    root = Path(__file__).resolve().parent.parent
    _ensure_project_import_paths(root)

    # Imports after path setup because existing agent modules use local imports.
    from Detector import BugDetectionAgent
    from Loop import LoopAgent
    from Documentation import DocumentationAgent
    from validator import validate_source

    try:
        state.original_code = source.read_text(encoding="utf-8")
    except OSError as exc:
        state.errors.append(str(exc))
        state.finish("ERROR")
        return state

    # 1) Detect: AST pass, then Gemini compares + merges findings for FixerAgent
    detection_agent = BugDetectionAgent()
    audit = detection_agent.audit_file(
        str(source), use_gemini_review=use_gemini_detection_review
    )
    if audit.get("error"):
        state.errors.append(audit["error"])
        state.finish("ERROR")
        return state
    state.ast_report = audit.get("ast_report", {})
    state.bug_report = audit["bug_report"]
    state.detection_formatted_summary = audit.get("formatted_summary")
    state.detection_gemini_review = audit.get("gemini_review") or {}

    # 2) Fix loop + validation
    loop = LoopAgent()
    state.loop_result = loop.run_loop(
        filepath=str(source),
        bug_report=state.bug_report,
        validate_fn=validate_source,
    )

    # 3) Documentation
    try:
        doc_agent = DocumentationAgent()
        state.documentation_result = doc_agent.document_run(
            source_path=str(source),
            bug_report=state.bug_report,
            loop_result=state.loop_result,
            original_code=state.original_code,
            output_path=documentation_output_path,
            use_llm_formatter=use_llm_doc_formatter,
        )
    except Exception as exc:  # keep pipeline output even if docs fail
        state.documentation_result = {
            "status": "ERROR",
            "markdown": None,
            "output_path": None,
            "error": str(exc),
        }
        state.errors.append(f"Documentation stage failed: {exc}")

    loop_status = state.loop_result.get("status", "UNKNOWN")
    doc_status = state.documentation_result.get("status", "UNKNOWN")
    if loop_status in ("CLEAN", "NO_IMPROVEMENT", "MAX_ITERATIONS_REACHED") and doc_status == "DOCUMENTED":
        state.finish("DONE")
    elif loop_status == "ERROR":
        state.errors.append("Loop stage returned ERROR.")
        state.finish("ERROR")
    else:
        state.finish("PARTIAL")

    return state
