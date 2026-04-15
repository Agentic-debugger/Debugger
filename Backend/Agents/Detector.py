from Baseagent import BaseAgent
# abstract syntax trees it conversts python code into a tree structure so as to find patterns without execution
import ast
import json
from pathlib import Path
import re


class DetectorEngine:
    """this class is the rule engine for a linter or security scanner — 
    it identifies patterns like hardcoded secrets and unsafe file handling purely through AST traversal,
     without ever executing the code. from line 13 to line 45 are the rule helpers."""

    _SECRET_NAME_SUBSTRINGS = ("password", "secret", "token", "key")

    @staticmethod
    def _name_suggests_secret(identifier: str) -> bool:
        lower = identifier.lower()
        return any(s in lower for s in DetectorEngine._SECRET_NAME_SUBSTRINGS)

    @staticmethod
    def _is_string_or_bytes_literal(value: ast.expr) -> bool:
        return isinstance(value, ast.Constant) and isinstance(value.value, (str, bytes))

    @staticmethod
    def _is_bare_open_call(node: ast.AST) -> bool:
        return (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "open"
        )

    @staticmethod
    def _open_calls_as_with_context_exprs(tree: ast.AST) -> set[int]:
        """Line numbers of `open(...)` used directly as a with/async-with context expression."""
        safe: set[int] = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.With, ast.AsyncWith)):
                for item in node.items:
                    ctx = item.context_expr
                    if DetectorEngine._is_bare_open_call(ctx):
                        ln = getattr(ctx, "lineno", None)
                        if ln is not None:
                            safe.add(ln)
        return safe
    # initialzes the report for the detector engine
    def __init__(self, source_code: str):
        self.source = source_code
        self.report = {
            "status": "CLEAN",
            "critical_count": 0,
            "findings": []
        }
    # a method that adds findings to the list whenever a rule is violated and adds lines to make sure gemini can view and correct the lines using logic
    def add_findings(self, line, category, diagnosis, neutralization, severity="Warning"):
        if severity == "Error":
            self.report["status"] = "FLAGGED"
            self.report["critical_count"] += 1

        self.report["findings"].append({
            "line": line,
            "type": category,
            "severity": severity,
            "diagnosis": diagnosis,
            "neutralization": neutralization
        })
        
    def analyze(self):
        try:
            tree = ast.parse(self.source)
        except SyntaxError as e:
            self.add_findings(e.lineno, "Syntax Violation", e.msg, 
                             f"Fix syntax near: {e.text.strip() if e.text else 'EOF'}", "Error")
            return self.report

        open_in_with = self._open_calls_as_with_context_exprs(tree)

        for node in ast.walk(tree):
            # Logic: Mutable Defaults
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        self.add_findings(node.lineno, "Logic Flaw", 
                                         f"Mutable default in '{node.name}'", 
                                         "Use 'None' as default.", "Warning")
            
            # Security: eval/exec
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id in ['eval', 'exec']:
                    self.add_findings(node.lineno, "Security Risk", 
                                     f"Use of {node.func.id}", 
                                     "Use literal_eval or refactor logic.", "Error")

            # Security: likely hardcoded secret (literal assigned to suspicious name)
            if isinstance(node, ast.Assign):
                if self._is_string_or_bytes_literal(node.value):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and self._name_suggests_secret(target.id):
                            self.add_findings(
                                node.lineno,
                                "Security Risk",
                                f"Possible hardcoded secret in '{target.id}'",
                                "Load from environment or a secrets manager (e.g. os.environ).",
                                "Error",
                            )

            # Security: bare except
            if isinstance(node, ast.ExceptHandler) and node.type is None:
                self.add_findings(
                    node.lineno,
                    "Security Risk",
                    "Bare except catches BaseException (e.g. KeyboardInterrupt, SystemExit).",
                    "Use 'except Exception as e:' (or a narrower type) intentionally.",
                    "Error",
                )

            # Maintainability: global
            if isinstance(node, ast.Global):
                names = ", ".join(node.names)
                self.add_findings(
                    node.lineno,
                    "Maintainability Issue",
                    f"Global variable usage: {names}",
                    "Encapsulate state in a class or pass explicitly.",
                    "Warning",
                )

            # API misuse: open() not used as with-context (heuristic)
            if self._is_bare_open_call(node) and node.lineno not in open_in_with:
                self.add_findings(
                    node.lineno,
                    "API Misuse",
                    "open() used outside a with/async with context (file may not close).",
                    "Use 'with open(...) as f:' (or assign to a context manager).",
                    "Error",
                )

            # Style: snake_case
            if isinstance(node, ast.FunctionDef) and not re.match(r'^[a-z_][a-z0-9_]*$', node.name):
                self.add_findings(node.lineno, "Style Issue", 
                                 f"Function '{node.name}' is not snake_case", 
                                 "Rename to lowercase_with_underscores.", "Warning")

        return self.report


def _normalize_severity(value: str) -> str:
    s = (value or "").strip().lower()
    if s in ("critical", "error"):
        return "Error"
    return "Warning"


def _normalize_finding(entry: dict) -> dict:
    line = entry.get("line")
    try:
        line = int(line)
    except (TypeError, ValueError):
        line = 0
    return {
        "line": line,
        "type": str(entry.get("type", "Issue")),
        "severity": _normalize_severity(str(entry.get("severity", "Warning"))),
        "diagnosis": str(entry.get("diagnosis", "")),
        "neutralization": str(entry.get("neutralization", "")),
    }


def _finalize_bug_report(findings: list[dict]) -> dict:
    findings = [_normalize_finding(f) for f in findings]
    critical = sum(1 for f in findings if f.get("severity") == "Error")
    return {
        "status": "FLAGGED" if any(f["severity"] == "Error" for f in findings) else "CLEAN",
        "critical_count": critical,
        "findings": findings,
    }


def _extract_json_object(text: str) -> dict | None:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    candidate = m.group(1).strip() if m else text
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None


class BugDetectionAgent(BaseAgent):
    def __init__(self):
        instructions = """Role: You are a Senior Forensic Security & Logic Auditor. Your mission is to detect bugs, logic flaws, and security vulnerabilities with zero-tolerance for hallucinations.

When asked for structured JSON in a user message, follow that schema exactly and output only valid JSON in a ```json code block."""
        super().__init__(name="detection_Agent", instructions=instructions)

    def _build_ast_comparison_prompt(self, source_code: str, ast_findings_json: str) -> str:
        return f"""You are performing a dual review: static AST rules vs your own analysis.

## AST findings (from automated pattern matching)
```json
{ast_findings_json}
```

## Full Python source under review
```python
{source_code}
```

## Your tasks
1. Independently review the source for security risks, logic bugs, API misuse, and maintainability issues.
2. For each AST finding: confirm it is real, refine diagnosis/neutralization if needed, or reject it as a false positive (explain in rejected_ast).
3. Add any issues the AST pass missed.
4. Produce merged_findings: the single deduplicated list of issues that should be fixed. Use the same shape as AST items: line, type, severity (Error or Warning only), diagnosis, neutralization. Line numbers must refer to the source above.

## Output (required)
Reply with ONLY a JSON object in a ```json code block, no other prose. Schema:
{{
  "comparison_summary": "Brief narrative: how AST vs your review agree or differ.",
  "merged_findings": [
    {{"line": <int>, "type": "<string>", "severity": "Error"|"Warning", "diagnosis": "<string>", "neutralization": "<string>"}}
  ],
  "rejected_ast": [
    {{"line": <int>, "reason": "<why this AST hit is invalid or acceptable>"}}
  ]
}}
If there are no issues after review, use an empty merged_findings array."""

    def _call_llm(self, prompt: str) -> str:
        return self.run(prompt)

    def _parse_comparison_json(self, raw: str) -> tuple[dict | None, str | None]:
        parsed = _extract_json_object(raw)
        if parsed is None:
            return None, "Could not parse JSON from Gemini response."
        if not isinstance(parsed, dict):
            return None, "Parsed JSON is not an object."
        return parsed, None

    def _gemini_ast_comparison(
        self, source_code: str, ast_report: dict
    ) -> tuple[dict | None, str, str | None]:
        """
        Ask Gemini to review the code, compare against AST findings, return merged JSON.

        Returns:
            (parsed dict or None, raw model text, parse_error or None)
        """
        ast_findings_json = json.dumps(ast_report["findings"], indent=2)
        prompt = self._build_ast_comparison_prompt(source_code, ast_findings_json)
        raw = self._call_llm(prompt)
        parsed, parse_err = self._parse_comparison_json(raw)
        if parse_err:
            return None, raw, parse_err
        return parsed, raw, None

    def audit_file(
        self,
        filepath: str,
        *,
        use_gemini_review: bool = True,
    ) -> dict:
        """
        Run AST detection, have Gemini review the code and merge with AST results.

        Returns:
            {
                "error": str | None,
                "ast_report": {"status", "critical_count", "findings"},
                "bug_report": merged report for FixerAgent (Gemini merge or AST-only),
                "gemini_review": {
                    "comparison_summary": str | None,
                    "rejected_ast": list,
                    "raw_response": str | None,
                    "parse_error": str | None,
                },
                "formatted_summary": str | None,  # comparison_summary for backward compatibility
            }
        """
        empty_report = {"status": "CLEAN", "critical_count": 0, "findings": []}
        path = Path(filepath)
        if not path.exists():
            return {
                "error": f"Error: {filepath} not found",
                "ast_report": empty_report,
                "bug_report": empty_report,
                "gemini_review": {
                    "comparison_summary": None,
                    "rejected_ast": [],
                    "raw_response": None,
                    "parse_error": None,
                },
                "formatted_summary": None,
            }

        code = path.read_text()
        engine = DetectorEngine(code)
        ast_report = engine.analyze()

        gemini_review = {
            "comparison_summary": None,
            "rejected_ast": [],
            "raw_response": None,
            "parse_error": None,
        }

        if not use_gemini_review:
            return {
                "error": None,
                "ast_report": ast_report,
                "bug_report": ast_report,
                "gemini_review": gemini_review,
                "formatted_summary": None,
            }

        parsed, raw_text, parse_err = self._gemini_ast_comparison(code, ast_report)
        gemini_review["raw_response"] = raw_text

        if parse_err:
            gemini_review["parse_error"] = parse_err
            return {
                "error": None,
                "ast_report": ast_report,
                "bug_report": ast_report,
                "gemini_review": gemini_review,
                "formatted_summary": None,
            }

        merged = parsed.get("merged_findings")
        if not isinstance(merged, list):
            gemini_review["parse_error"] = "Missing or invalid merged_findings array."
            return {
                "error": None,
                "ast_report": ast_report,
                "bug_report": ast_report,
                "gemini_review": gemini_review,
                "formatted_summary": None,
            }

        rejected = parsed.get("rejected_ast")
        if isinstance(rejected, list):
            gemini_review["rejected_ast"] = rejected

        summary = parsed.get("comparison_summary")
        if isinstance(summary, str):
            gemini_review["comparison_summary"] = summary

        bug_report = _finalize_bug_report(merged)
        formatted = summary
        if summary and rejected:
            formatted = f"{summary}\n\nRejected AST items: {json.dumps(rejected, indent=2)}"
        elif rejected and not summary:
            formatted = f"Rejected AST items: {json.dumps(rejected, indent=2)}"

        return {
            "error": None,
            "ast_report": ast_report,
            "bug_report": bug_report,
            "gemini_review": gemini_review,
            "formatted_summary": formatted,
        }
        