from typing import Literal, TypedDict


Severity = Literal["Error", "Warning", "Info"]


class RuleSpec(TypedDict):
    severity: Severity
    diagnosis: str
    neutralization: str


RULES: dict[str, RuleSpec] = {
    # Correctness
    "SYNTAX_ERROR": {
        "severity": "Error",
        "diagnosis": "Python syntax error detected.",
        "neutralization": "Fix parser-reported syntax issue.",
    },
    "MUTABLE_DEFAULT": {
        "severity": "Warning",
        "diagnosis": "Mutable default argument detected.",
        "neutralization": "Use None as default and initialize inside function.",
    },
    # Style
    "BARE_EXCEPT": {
        "severity": "Warning",
        "diagnosis": "Bare except clause catches too broadly.",
        "neutralization": "Use except Exception: or a specific exception type.",
    },
    "NONE_COMPARISON": {
        "severity": "Warning",
        "diagnosis": "Equality comparison with None detected.",
        "neutralization": "Use `is None` / `is not None` identity checks.",
    },
    "NON_SNAKE_CASE_FUNCTION": {
        "severity": "Warning",
        "diagnosis": "Function name is not snake_case.",
        "neutralization": "Rename function to lowercase_with_underscores.",
    },
    # Security
    "EVAL_EXEC_USAGE": {
        "severity": "Error",
        "diagnosis": "eval/exec usage is a security risk.",
        "neutralization": "Replace with safer parsing or explicit logic.",
    },
    # Growth backlog (not yet emitted by validator)
    "UNUSED_IMPORT": {
        "severity": "Info",
        "diagnosis": "Imported symbol is never used.",
        "neutralization": "Remove unused import or use the symbol.",
    },
    "SHADOWED_BUILTIN": {
        "severity": "Warning",
        "diagnosis": "Variable/function shadows a Python builtin.",
        "neutralization": "Rename symbol to avoid shadowing builtin names.",
    },
    "MISSING_RETURN_TYPE": {
        "severity": "Info",
        "diagnosis": "Function is missing a return type annotation.",
        "neutralization": "Add explicit return type where appropriate.",
    },
    "PRINT_STATEMENT": {
        "severity": "Info",
        "diagnosis": "Print statement found in source.",
        "neutralization": "Use structured logging for production code.",
    },
}
