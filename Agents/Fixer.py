from Baseagent import BaseAgent
import ast
import re
from pathlib import Path


class FixerEngine:
    """
    Rule-based engine that applies deterministic fixes before sending to the LLM.
    Mirrors the DetectorEngine pattern — fast, no API calls, no hallucinations.
    """

    def __init__(self, source_code: str):
        self.source = source_code
        self.lines = source_code.splitlines()
        self.fix_log = []

    def log_fix(self, line: int, fix_type: str, description: str):
        self.fix_log.append({
            "line": line,
            "type": fix_type,
            "description": description
        })

    def fix_mutable_defaults(self, source: str) -> str:
        """
        Replace mutable default arguments ([], {}, set()) with None.
        Matches the mutable default detection in DetectorEngine.
        """
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return source  # Can't fix what won't parse

        # We work on lines directly since ast gives us line numbers
        lines = source.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        line_idx = default.lineno - 1
                        original = lines[line_idx]

                        # Replace =[] ={}  =set() with =None on that line
                        fixed = re.sub(r'=\s*(\[\]|\{\}|set\(\))', '=None', original)
                        if fixed != original:
                            lines[line_idx] = fixed
                            self.log_fix(
                                default.lineno,
                                "Mutable Default Fix",
                                f"Replaced mutable default in '{node.name}' with None"
                            )

        return "\n".join(lines)

    def fix_bare_except(self, source: str) -> str:
        """
        Replace bare `except:` with `except Exception:` to avoid swallowing all errors.
        """
        fixed, count = re.subn(r'\bexcept\s*:', 'except Exception:', source)
        if count:
            self.log_fix(0, "Bare Except Fix", f"Replaced {count} bare except clause(s) with 'except Exception:'")
        return fixed

    def fix_equality_to_none(self, source: str) -> str:
        """
        Replace `== None` with `is None` and `!= None` with `is not None`.
        PEP 8 compliance — matches style checks in DetectorEngine.
        """
        fixed = re.sub(r'==\s*None', 'is None', source)
        fixed, count = re.subn(r'!=\s*None', 'is not None', fixed)
        original_count = len(re.findall(r'==\s*None', source))
        total = original_count + count
        if total:
            self.log_fix(0, "None Comparison Fix", f"Replaced {total} None comparison(s) with identity checks")
        return fixed

    def apply_all(self) -> tuple[str, list]:
        """
        Run all deterministic fixers in sequence.

        Returns:
            Tuple of (fixed_source_code, fix_log)
        """
        code = self.source
        code = self.fix_mutable_defaults(code)
        code = self.fix_bare_except(code)
        code = self.fix_equality_to_none(code)
        return code, self.fix_log


class FixerAgent(BaseAgent):
    """
    The Fixer Agent takes a bug report from BugDetectionAgent and the original
    source code, applies deterministic fixes first via FixerEngine, then uses
    the LLM to handle any remaining issues that require reasoning.

    Designed to slot into the SequentialAgent pipeline:
        BugDetectionAgent → FixerAgent → Validator (linter) → DocumentationAgent
    """

    MAX_ITERATIONS = 3  

    def __init__(self):
        instructions = """Role: You are a Precision Code Surgeon. Your job is to apply minimal, surgical fixes to buggy Python code.

Protocol: You will receive:
1. The original Python source code
2. A bug report listing specific issues with line numbers and severities

Your Rules:
- Fix ONLY the issues listed in the bug report. Do not refactor unrelated code.
- Preserve the original logic, variable names, and structure as much as possible.
- Never remove existing functionality unless it is itself the bug.
- If a bug cannot be safely fixed without understanding broader context, note it clearly.

Output Format (Required):
[FIXES_APPLIED]: List each fix made, with the line number and what changed.
[FIXED_CODE]: The complete corrected Python source code, enclosed in triple backticks.
[REMAINING_ISSUES]: Any issues from the report you could not fix, and why.
[CONFIDENCE]: High / Medium / Low — how confident you are the fixes are correct."""

        super().__init__(name="fixer_agent", instructions=instructions)
        self.iteration = 0

    def _extract_code_from_response(self, response: str) -> str:
        """
        Pull out just the code block from the LLM's formatted response.
        Looks for ```python ... ``` or ``` ... ``` blocks.
        """
        # Try ```python first, then plain ```
        match = re.search(r'```python\s*(.*?)```', response, re.DOTALL)
        if not match:
            match = re.search(r'```\s*(.*?)```', response, re.DOTALL)
        if match:
            return match.group(1).strip()
        return response  # Fall back to full response if no code block found

    def fix_file(self, filepath: str, bug_report: dict, iteration: int = 1) -> dict:
        """
        Main entry point. Applies deterministic fixes first, then LLM fixes.

        Args:
            filepath: Path to the Python file to fix.
            bug_report: The structured report from BugDetectionAgent.
            iteration: Current loop iteration (tracked by LoopAgent / pipeline).

        Returns:
            Dict with keys: fixed_code, fix_log, llm_response, iteration, status
        """
        self.iteration = iteration

        if iteration > self.MAX_ITERATIONS:
            return {
                "status": "MAX_ITERATIONS_REACHED",
                "iteration": iteration,
                "fixed_code": None,
                "fix_log": [],
                "llm_response": "Max iteration limit reached. Returning best available output."
            }

        # --- Load source ---
        path = Path(filepath)
        if not path.exists():
            return {
                "status": "ERROR",
                "iteration": iteration,
                "fixed_code": None,
                "fix_log": [],
                "llm_response": f"Error: {filepath} not found"
            }

        source = path.read_text()

        print(f"[*] Fixer Agent — Iteration {iteration}/{self.MAX_ITERATIONS}")

        # --- Step 1: Deterministic fixes (no API call) ---
        engine = FixerEngine(source)
        deterministic_fixed, fix_log = engine.apply_all()

        print(f"    Deterministic fixes applied: {len(fix_log)}")

        # --- Step 2: LLM fixes for remaining / complex issues ---
        findings = bug_report.get("findings", [])

        if not findings:
            return {
                "status": "NO_ISSUES",
                "iteration": iteration,
                "fixed_code": deterministic_fixed,
                "fix_log": fix_log,
                "llm_response": "No issues found in bug report — no LLM fix needed."
            }

        prompt = f"""Here is the Python source code after deterministic fixes have been applied:

```python
{deterministic_fixed}
```

Bug report from the detection agent:
{findings}

Deterministic fixes already applied:
{fix_log}

Iteration: {iteration} of {self.MAX_ITERATIONS}

Please apply fixes for any remaining issues in the bug report that were not already handled."""

        llm_response = self.run(prompt)
        fixed_code = self._extract_code_from_response(llm_response)

        return {
            "status": "FIX_ATTEMPTED",
            "iteration": iteration,
            "fixed_code": fixed_code,
            "fix_log": fix_log,
            "llm_response": llm_response
        }

    def fix_and_save(self, filepath: str, bug_report: dict, iteration: int = 1) -> dict:
        """
        Runs fix_file() and writes the fixed code back to disk if successful.

        Args:
            filepath: Path to the Python file to fix.
            bug_report: The structured report from BugDetectionAgent.
            iteration: Current loop iteration.

        Returns:
            Same dict as fix_file(), with an added 'saved_to' key if written.
        """
        result = self.fix_file(filepath, bug_report, iteration)

        if result["fixed_code"] and result["status"] in ("FIX_ATTEMPTED", "NO_ISSUES"):
            output_path = Path(filepath).with_stem(Path(filepath).stem + "_fixed")
            output_path.write_text(result["fixed_code"])
            result["saved_to"] = str(output_path)
            print(f"    Fixed code saved to: {output_path}")

        return result