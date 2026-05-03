from pathlib import Path
import logging
from typing import Literal, TypedDict

from Baseagent import BaseAgent

logger = logging.getLogger(__name__)


class DocumentResult(TypedDict):
    status: Literal["DOCUMENTED", "ERROR"]
    markdown: str | None
    output_path: str | None


class DocumentResultError(DocumentResult):
    error: str
    error: str


class DocumentationAgent(BaseAgent):
    """
    Generates markdown documentation for a debugging/fixing run.
    """

    def __init__(self):
        instructions = """Role: You are a technical documentation specialist for a Python debugging pipeline.

Your task is to produce clear, structured markdown documentation of:
1) original issues,
2) fixes applied,
3) validation/loop outcome,
4) final corrected code.

Rules:
- Be concise and factual.
- Keep section headers stable and machine-readable.
- Do not invent changes not present in the provided metadata.
- If data is missing, state it explicitly."""
        super().__init__(name="documentation_agent", instructions=instructions)

    def _render_findings(self, bug_report: dict) -> str:
        findings = bug_report.get("findings", [])
        if not findings:
            return "- No findings were reported by the detector."

        lines = []
        for item in findings:
            line = item.get("line", "?")
            issue_type = item.get("type", "UNKNOWN")
            severity = item.get("severity", "Warning")
            diagnosis = item.get("diagnosis", "No diagnosis provided.")
            neutralization = item.get("neutralization", "No mitigation provided.")
            lines.append(
                f"- Line {line} | `{issue_type}` | {severity}: {diagnosis} "
                f"(Suggested: {neutralization})"
            )
        return "\n".join(lines)

    def _render_fix_log(self, loop_result: dict) -> str:
        history = loop_result.get("history", [])
        if not history:
            return "- No loop history available."

        lines = []
        for step in history:
            iteration = step.get("iteration", "?")
            fix_status = step.get("fix_status", "UNKNOWN")
            error_count = step.get("error_count", "?")
            lines.append(f"- Iteration {iteration}: status=`{fix_status}`, validation_errors={error_count}")

            for fix in step.get("fix_log", []):
                fix_line = fix.get("line", "?")
                fix_type = fix.get("type", "Fix")
                description = fix.get("description", "No description.")
                lines.append(f"  - line {fix_line}: `{fix_type}` — {description}")

        return "\n".join(lines)

    def build_markdown(
        self,
        source_path: str,
        original_code: str,
        final_code: str,
        bug_report: dict,
        loop_result: dict,
    ) -> str:
        """
        Deterministically build markdown documentation from pipeline artifacts.
        """
        loop_status = loop_result.get("status", "UNKNOWN")
        loop_iteration = loop_result.get("iteration", "?")
        validation_mode = loop_result.get("validation_mode", "unknown")
        warning = loop_result.get("warning")

        findings_md = self._render_findings(bug_report)
        fixes_md = self._render_fix_log(loop_result)

        warning_section = ""
        if warning:
            warning_section = f"\n## Validation Note\n\n- {warning}\n"

        return f"""# Debugging Run Documentation

## File

- Source: `{source_path}`

## Run Outcome

- Loop status: `{loop_status}`
- Iteration reached: `{loop_iteration}`
- Validation mode: `{validation_mode}`

{warning_section}## Detected Issues

{findings_md}

## Applied Fixes by Iteration

{fixes_md}

## Final Code

```python
{final_code}
```

## Original Code Snapshot

```python
{original_code}
```
"""

    def write_report(self, markdown: str, output_path: str) -> str:
        """Persist generated markdown to disk and return saved path."""
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(markdown)
        return str(out)

    def _polish_markdown(self, markdown: str) -> str:
        """Optional LLM pass that polishes wording without changing section structure."""
        prompt = f"""Polish this markdown while preserving all facts and section headers exactly.
Return markdown only.

{markdown}
"""
        polished = self.run(prompt)
        if isinstance(polished, str) and polished.strip():
            return polished

        logger.warning("LLM formatter returned empty/invalid response; using raw markdown")
        return markdown

    def document_run(
        self,
        source_path: str,
        bug_report: dict | None,
        loop_result: dict | None,
        original_code: str | None = None,
        output_path: str | None = None,
        use_llm_formatter: bool = False,
    ) -> DocumentResult | DocumentResultError:
        """
        Create markdown documentation for a run and optionally save it to disk.

        Args:
            source_path: Path of analyzed source code file.
            bug_report: Detection report dict.
            loop_result: Loop/fixer result dict.
            original_code: Optional original source snapshot.
            output_path: Optional markdown output path. Defaults to <source>_debug_report.md.
            use_llm_formatter: If True, asks model to lightly polish generated markdown.

        Returns:
            dict with keys: status, markdown, output_path.
        """
        bug_report = bug_report or {}
        loop_result = loop_result or {}

        source = Path(source_path)
        try:
            source_text = source.read_text()
        except OSError as exc:
            return {
                "status": "ERROR",
                "markdown": None,
                "output_path": None,
                "error": str(exc),
            }

        original_text = original_code if original_code is not None else source_text
        final_code = loop_result.get("final_code", source_text)

        markdown = self.build_markdown(
            source_path=source_path,
            original_code=original_text,
            final_code=final_code,
            bug_report=bug_report,
            loop_result=loop_result,
        )

        if use_llm_formatter:
            markdown = self._polish_markdown(markdown)

        if output_path is None:
            reports_dir = source.parent / "reports"
            output_path = str(reports_dir / f"{source.stem}_debug_report.md")

        try:
            saved_path = self.write_report(markdown, output_path)
        except OSError as exc:
            return {
                "status": "ERROR",
                "markdown": markdown,
                "output_path": None,
                "error": str(exc),
            }

        return {
            "status": "DOCUMENTED",
            "markdown": markdown,
            "output_path": saved_path,
        }