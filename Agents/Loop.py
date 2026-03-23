from pathlib import Path
import ast

from Fixer import FixerAgent


class LoopAgent:
    """
    Orchestrates iterative fixing with a validation gate between iterations.

    Flow:
        - call FixerAgent.fix_file(...)
        - validate resulting code
        - retry only if errors remain and count improves
        - stop on clean result, no improvement, or max iterations
    """

    def __init__(self, fixer_agent: FixerAgent | None = None, max_iterations: int | None = None):
        self.fixer = fixer_agent or FixerAgent()
        self.max_iterations = max_iterations or self.fixer.MAX_ITERATIONS

    def _validate_python(self, source_code: str) -> list[dict]:
        """
        Lightweight validation fallback when no linter/validator module is wired.
        Returns an empty list if valid, or one syntax finding if invalid.
        Limitation: this only catches parse-time failures, not semantic/runtime defects.
        """
        try:
            ast.parse(source_code)
            return []
        except SyntaxError as exc:
            return [{
                "line": exc.lineno or 0,
                "code": "SYNTAX_ERROR",
                "message": exc.msg,
            }]

    def _build_bug_report_from_validation(self, validation_errors: list[dict]) -> dict:
        """Convert validator output into the FixerAgent bug_report shape."""
        findings = []
        for err in validation_errors:
            line = err.get("line", 0)
            code = err.get("code", "VALIDATION_ERROR")
            message = err.get("message", "Validation error")
            findings.append({
                "line": line,
                "type": code,
                "severity": "Error",
                "diagnosis": message,
                "neutralization": "Resolve the reported validation error.",
            })

        return {
            "status": "FLAGGED" if findings else "CLEAN",
            "critical_count": len(findings),
            "findings": findings,
        }

    def run_loop(self, filepath: str, bug_report: dict, validate_fn=None) -> dict:
        """
        Run iterative fix/validate loop for a file.

        Args:
            filepath: Path to file to fix in-place across iterations.
            bug_report: Detection report used by FixerAgent.
            validate_fn: Optional callable taking source_code and returning list[dict] errors.

        Returns:
            Dict with loop status, iteration count, latest code, and validation details.
        """
        path = Path(filepath)
        if not path.exists():
            return {
                "status": "ERROR",
                "iteration": 0,
                "error": f"{filepath} not found",
                "final_code": None,
                "history": []
            }

        original_code = path.read_text()
        backup_path = path.with_name(path.name + ".bak")
        backup_path.write_text(original_code)

        validator = validate_fn or self._validate_python
        validation_mode = "external_validator" if validate_fn else "syntax_only"
        syntax_only_warning = (
            "No validate_fn provided; using syntax-only fallback validation."
            if validate_fn is None else None
        )

        fixer_cap = getattr(self.fixer, "MAX_ITERATIONS", self.max_iterations)
        effective_max = min(self.max_iterations, fixer_cap)
        previous_error_count = None
        current_bug_report = bug_report
        history = []

        for iteration in range(1, effective_max + 1):
            fix_result = self.fixer.fix_file(filepath, current_bug_report, iteration=iteration)
            status = fix_result.get("status")

            if status in ("ERROR", "MAX_ITERATIONS_REACHED"):
                path.write_text(original_code)
                return {
                    "status": status,
                    "iteration": iteration,
                    "final_code": fix_result.get("fixed_code"),
                    "history": history,
                    "last_fix_result": fix_result,
                    "backup_path": str(backup_path),
                    "max_iterations_used": effective_max,
                    "validation_mode": validation_mode,
                    "warning": syntax_only_warning,
                }

            fixed_code = fix_result.get("fixed_code")
            if fixed_code is None:
                path.write_text(original_code)
                return {
                    "status": "ERROR",
                    "iteration": iteration,
                    "final_code": None,
                    "history": history,
                    "last_fix_result": fix_result,
                    "error": "Fixer returned no code output.",
                    "backup_path": str(backup_path),
                    "max_iterations_used": effective_max,
                    "validation_mode": validation_mode,
                    "warning": syntax_only_warning,
                }

            # Persist for next iteration context.
            path.write_text(fixed_code)

            validation_errors = validator(fixed_code)
            current_error_count = len(validation_errors)
            history.append({
                "iteration": iteration,
                "fix_status": status,
                "error_count": current_error_count,
                "errors": validation_errors,
                "fix_log": fix_result.get("fix_log", []),
            })

            if current_error_count == 0:
                return {
                    "status": "CLEAN",
                    "iteration": iteration,
                    "final_code": fixed_code,
                    "history": history,
                    "last_fix_result": fix_result,
                    "backup_path": str(backup_path),
                    "max_iterations_used": effective_max,
                    "validation_mode": validation_mode,
                    "warning": syntax_only_warning,
                }

            if previous_error_count is not None and current_error_count >= previous_error_count:
                return {
                    "status": "NO_IMPROVEMENT",
                    "iteration": iteration,
                    "final_code": fixed_code,
                    "history": history,
                    "last_fix_result": fix_result,
                    "backup_path": str(backup_path),
                    "max_iterations_used": effective_max,
                    "validation_mode": validation_mode,
                    "warning": syntax_only_warning,
                }

            previous_error_count = current_error_count
            current_bug_report = self._build_bug_report_from_validation(validation_errors)

        # Loop ended without zero errors.
        return {
            "status": "MAX_ITERATIONS_REACHED",
            "iteration": effective_max,
            "final_code": path.read_text(),
            "history": history,
            "backup_path": str(backup_path),
            "max_iterations_used": effective_max,
            "validation_mode": validation_mode,
            "warning": syntax_only_warning,
        }