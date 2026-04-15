"""
test_documentation.py — smoke test for DocumentationAgent markdown generation.

Run from Agents/:
    python test_documentation.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from Documentation import DocumentationAgent


def test_documentation_build_and_save():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write("def x():\n    return 1\n")
        src_path = tmp.name

    bug_report = {
        "status": "FLAGGED",
        "critical_count": 1,
        "findings": [
            {
                "line": 1,
                "type": "Style Issue",
                "severity": "Warning",
                "diagnosis": "Function name not descriptive",
                "neutralization": "Rename function",
            }
        ],
    }

    loop_result = {
        "status": "CLEAN",
        "iteration": 1,
        "validation_mode": "syntax_only",
        "warning": "No validate_fn provided; using syntax-only fallback validation.",
        "final_code": "def example_function():\n    return 1\n",
        "history": [
            {
                "iteration": 1,
                "fix_status": "FIX_ATTEMPTED",
                "error_count": 0,
                "fix_log": [
                    {"line": 1, "type": "Rename Fix", "description": "Renamed x to example_function"}
                ],
            }
        ],
    }

    try:
        agent = DocumentationAgent()
        result = agent.document_run(
            source_path=src_path,
            bug_report=bug_report,
            loop_result=loop_result,
            original_code="def x():\n    return 1\n",
            use_llm_formatter=False,
        )

        if result["status"] != "DOCUMENTED":
            print(f"FAIL: expected DOCUMENTED, got {result['status']}")
            return False

        md = result["markdown"]
        checks = [
            "# Debugging Run Documentation",
            "## Detected Issues",
            "## Applied Fixes by Iteration",
            "## Final Code",
            "example_function",
        ]
        missing = [c for c in checks if c not in md]
        if missing:
            print(f"FAIL: markdown missing expected content: {missing}")
            return False

        print(f"PASS: documentation generated at {result['output_path']}")
        return True
    finally:
        os.unlink(src_path)


if __name__ == "__main__":
    print("=" * 50)
    print("DocumentationAgent Test Suite")
    print("=" * 50)
    ok = test_documentation_build_and_save()
    print("\n" + "=" * 50)
    print("PASS" if ok else "FAIL")
