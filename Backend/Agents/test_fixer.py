"""
test_fixer.py — Smoke test for FixerAgent + FixerEngine

Run from the Agents/ folder:
    python test_fixer.py
"""

import sys
import os
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from Fixer import FixerAgent, FixerEngine

BAD_CODE_SAMPLE = os.path.join(os.path.dirname(__file__), '..', "bad_code_sample.py")

# ── Bug report matching what BugDetectionAgent.audit_file() would produce ───
# Mirrors the nested output shape from Detector
MOCK_DETECTOR_OUTPUT = {
    "error": None,
    "ast_report": {
        "status": "FLAGGED",
        "critical_count": 2,
        "findings": []
    },
    "bug_report": {
        "status": "FLAGGED",
        "critical_count": 2,
        "findings": [
            {
                "line": 27,
                "type": "Security Risk",
                "severity": "Error",
                "diagnosis": "Bare except catches BaseException (e.g. KeyboardInterrupt, SystemExit).",
                "neutralization": "Use 'except Exception as e:' or a narrower type intentionally."
            },
            {
                "line": 33,
                "type": "Logic Flaw",
                "severity": "Warning",
                "diagnosis": "os.getenv() used as a default argument — evaluated once at definition time, not per call.",
                "neutralization": "Use None as default and call os.getenv() inside the function body."
            },
            {
                "line": 4,
                "type": "Security Risk",
                "severity": "Error",
                "diagnosis": "Possible hardcoded secret in 'API_KEY' — assigned from os.getenv but name suggests sensitive data.",
                "neutralization": "Load from environment or a secrets manager."
            },
        ]
    },
    "gemini_review": {
        "comparison_summary": "AST and Gemini agree on bare except and default arg issues.",
        "rejected_ast": [],
        "raw_response": None,
        "parse_error": None,
    },
    "formatted_summary": "AST and Gemini agree on bare except and default arg issues."
}


def _make_temp_copy(source_path: str) -> str:
    """Copy bad_code_sample.py to a temp file so the original is never modified."""
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False)
    tmp.close()
    shutil.copy2(source_path, tmp.name)
    return tmp.name


# ── Test 1: FixerEngine deterministic fixes on bad_code_sample ──────────────
def test_fixer_engine_on_sample():
    """
    FixerEngine should catch the bare except in bad_code_sample.py
    without any API call.
    """
    print("  Reading bad_code_sample.py...")
    with open(BAD_CODE_SAMPLE, 'r') as f:
        source = f.read()

    engine = FixerEngine(source)
    fixed, fix_log = engine.apply_all()

    print(f"  Fixes logged: {len(fix_log)}")
    for entry in fix_log:
        print(f"    [{entry['type']}] {entry['description']}")

    passed = True

    if "except Exception:" in fixed:
        print("  PASS: bare except is handled in fixed code")
    else:
        print("  FAIL: bare except not found in fixed output")
        passed = False

    # os.getenv default arg is beyond deterministic rules — needs LLM
    if "def another_issue(token=os.getenv" in fixed:
        print("  NOTE: os.getenv default arg left for LLM fixer (expected — beyond deterministic rules)")

    return passed


# ── Test 2: extract_bug_report handles nested detector output ────────────────
def test_extract_bug_report():
    """
    FixerAgent.extract_bug_report() should correctly unpack the nested
    BugDetectionAgent.audit_file() output and return the inner bug_report.
    """
    agent = FixerAgent()
    extracted = agent.extract_bug_report(MOCK_DETECTOR_OUTPUT)

    if "findings" in extracted and extracted["status"] == "FLAGGED":
        print(f"  PASS: extracted bug_report with {len(extracted['findings'])} findings")
        return True
    else:
        print(f"  FAIL: unexpected extracted result: {extracted}")
        return False


# ── Test 3: fix_file with clean nested detector output ──────────────────────
def test_fix_file_no_issues():
    """
    fix_file() should handle a clean bug_report (no findings) gracefully
    using the nested detector output shape.
    """
    agent = FixerAgent()
    tmp_path = _make_temp_copy(BAD_CODE_SAMPLE)

    clean_detector_output = {
        "error": None,
        "ast_report": {"status": "CLEAN", "critical_count": 0, "findings": []},
        "bug_report": {"status": "CLEAN", "critical_count": 0, "findings": []},
        "gemini_review": {
            "comparison_summary": None,
            "rejected_ast": [],
            "raw_response": None,
            "parse_error": None
        },
        "formatted_summary": None
    }

    try:
        result = agent.fix_file(tmp_path, clean_detector_output, iteration=1)
        if result["status"] == "NO_ISSUES":
            print("  PASS: correctly returned NO_ISSUES for clean detector output")
            return True
        else:
            print(f"  FAIL: expected NO_ISSUES, got {result['status']}")
            return False
    finally:
        os.unlink(tmp_path)


# ── Test 4: iteration cap enforced with nested output ───────────────────────
def test_iteration_cap():
    """Iteration cap should trigger regardless of detector output shape."""
    agent = FixerAgent()
    tmp_path = _make_temp_copy(BAD_CODE_SAMPLE)

    try:
        result = agent.fix_file(tmp_path, MOCK_DETECTOR_OUTPUT, iteration=4)
        if result["status"] == "MAX_ITERATIONS_REACHED":
            print("  PASS: iteration cap enforced at iteration 4")
            return True
        else:
            print(f"  FAIL: expected MAX_ITERATIONS_REACHED, got {result['status']}")
            return False
    finally:
        os.unlink(tmp_path)


# ── Test 5: full LLM fix run on bad_code_sample ─────────────────────────────
def test_full_fix_on_sample():
    """
    Full integration test — passes bad_code_sample.py through the complete
    FixerAgent pipeline using the real nested detector output shape.
    Requires a valid API key.
    """
    agent = FixerAgent()
    tmp_path = _make_temp_copy(BAD_CODE_SAMPLE)

    try:
        result = agent.fix_file(tmp_path, MOCK_DETECTOR_OUTPUT, iteration=1)

        print(f"  Status    : {result['status']}")
        print(f"  Iteration : {result['iteration']}")
        print(f"  Det. fixes: {len(result['fix_log'])}")
        for fix in result['fix_log']:
            print(f"    [{fix['type']}] {fix['description']}")

        if result["fixed_code"]:
            print(f"  Fixed code preview:\n{'─'*40}")
            print(result["fixed_code"][:1200])
            print("─" * 40)
            return True
        else:
            print(f"  FAIL: no fixed code returned — {result.get('llm_response', '')[:200]}")
            return False
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    if not os.path.exists(BAD_CODE_SAMPLE):
        print(f"ERROR: bad_code_sample.py not found at {BAD_CODE_SAMPLE}")
        sys.exit(1)

    print("=" * 50)
    print("FixerAgent Test Suite (bad_code_sample.py)")
    print("=" * 50)

    print("\n[1] FixerEngine — deterministic fixes on bad_code_sample...")
    test_fixer_engine_on_sample()

    print("\n[2] extract_bug_report — nested detector output unpacking...")
    test_extract_bug_report()

    print("\n[3] fix_file — clean detector output / no findings...")
    test_fix_file_no_issues()

    print("\n[4] fix_file — iteration cap with nested output...")
    test_iteration_cap()

    print("\n[5] Full LLM fix run on bad_code_sample (requires API key)...")
    test_full_fix_on_sample()

    print("\n" + "=" * 50)
    print("Done.")