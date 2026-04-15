import ast
import re

from Linting.rules import RULES, RuleSpec


def _build_error(line: int, code: str, message: str | None = None) -> dict:
    spec: RuleSpec = RULES.get(
        code,
        {
            "severity": "Error",
            "diagnosis": "Validation error.",
            "neutralization": "Apply a safe fix.",
        },
    )
    return {
        "line": line,
        "code": code,
        "severity": spec["severity"],
        "message": message or spec["diagnosis"],
        "neutralization": spec["neutralization"],
    }


def validate_source(source_code: str) -> list[dict]:
    """
    Validate Python source and return normalized lint errors.

    Output shape is designed to plug into LoopAgent.run_loop(validate_fn=...).
    """
    errors: list[dict] = []

    try:
        tree = ast.parse(source_code)
    except SyntaxError as exc:
        return [_build_error(exc.lineno or 0, "SYNTAX_ERROR", exc.msg)]

    lines = source_code.splitlines()

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Mutable defaults
            for default in node.args.defaults:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    errors.append(_build_error(node.lineno, "MUTABLE_DEFAULT"))

            # snake_case check
            if not re.match(r"^[a-z_][a-z0-9_]*$", node.name):
                errors.append(_build_error(node.lineno, "NON_SNAKE_CASE_FUNCTION"))

        # eval/exec check
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in ("eval", "exec"):
                errors.append(_build_error(node.lineno, "EVAL_EXEC_USAGE"))

    # Text scans for issues easier to catch lexically
    for idx, line in enumerate(lines, start=1):
        if re.search(r"\bexcept\s*:", line):
            errors.append(_build_error(idx, "BARE_EXCEPT"))
        if re.search(r"==\s*None|!=\s*None", line):
            errors.append(_build_error(idx, "NONE_COMPARISON"))

    return errors
