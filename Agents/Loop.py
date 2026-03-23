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

        validator = validate_fn or self._validate_python
        previous_error_count = None
        history = []

        for iteration in range(1, self.max_iterations + 1):
            fix_result = self.fixer.fix_file(filepath, bug_report, iteration=iteration)
            status = fix_result.get("status")

            if status in ("ERROR", "MAX_ITERATIONS_REACHED"):
                return {
                    "status": status,
                    "iteration": iteration,
                    "final_code": fix_result.get("fixed_code"),
                    "history": history,
                    "last_fix_result": fix_result,
                }

            fixed_code = fix_result.get("fixed_code")
            if fixed_code is None:
                return {
                    "status": "ERROR",
                    "iteration": iteration,
                    "final_code": None,
                    "history": history,
                    "last_fix_result": fix_result,
                    "error": "Fixer returned no code output.",
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
                }

            if previous_error_count is not None and current_error_count >= previous_error_count:
                return {
                    "status": "NO_IMPROVEMENT",
                    "iteration": iteration,
                    "final_code": fixed_code,
                    "history": history,
                    "last_fix_result": fix_result,
                }

            previous_error_count = current_error_count

        # Loop ended without zero errors.
        return {
            "status": "MAX_ITERATIONS_REACHED",
            "iteration": self.max_iterations,
            "final_code": path.read_text(),
            "history": history,
        }