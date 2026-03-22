"""
test_fixer.py — Smoke test for FixerAgent + FixerEngine

Run from the Agents/ folder:
    python test_fixer.py
"""

import sys
import os
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from Fixer import FixerAgent, FixerEngine


# ── Sample buggy code that matches what DetectorEngine catches ──────────────
BUGGY_CODE = '''\
def add_item(value, items=[]):
    items.append(value)
    return items

def fetch_data(url):
    try:
        result = get(url)
    except:
        pass
    return result

def checkValue(x):
    if x == None:
        return "empty"
    return x
'''

EXPECTED_FIXES = [
    ("Mutable Default Fix", "items=None"),
    ("Bare Except Fix",     "except Exception:"),
    ("None Comparison Fix", "is None"),
]

MOCK_BUG_REPORT = {
    "status": "FLAGGED",
    "critical_count": 0,
    "findings": [
        {"line": 1,  "type": "Logic Flaw",   "severity": "Warning", "diagnosis": "Mutable default in 'add_item'",        "neutralization": "Use None as default."},
        {"line": 7,  "type": "Style Issue",  "severity": "Warning", "diagnosis": "Bare except clause",                   "neutralization": "Use except Exception:"},
        {"line": 11, "type": "Style Issue",  "severity": "Warning", "diagnosis": "Equality check against None",          "neutralization": "Use is None."},
        {"line": 11, "type": "Style Issue",  "severity": "Warning", "diagnosis": "Function 'checkValue' not snake_case", "neutralization": "Rename to check_value."},
    ]
}


def test_fixer_engine_deterministic():
    """FixerEngine should fix mutable defaults, bare excepts, and None comparisons without any API call."""
    engine = FixerEngine(BUGGY_CODE)
    fixed, fix_log = engine.apply_all()

    print(f"  Fixes logged: {len(fix_log)}")
    for entry in fix_log:
        print(f"    [{entry['type']}] {entry['description']}")

    passed = True
    for fix_type, expected_text in EXPECTED_FIXES:
        if expected_text in fixed:
            print(f"  PASS: '{expected_text}' found in fixed code")
        else:
            print(f"  FAIL: '{expected_text}' NOT found in fixed code")
            passed = False

    return passed


def test_fixer_agent_no_findings():
    """FixerAgent should return NO_ISSUES cleanly when bug report has no findings."""
    agent = FixerAgent()

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write("def hello():\n    return 'world'\n")
        tmp_path = f.name

    try:
        result = agent.fix_file(tmp_path, {"findings": []}, iteration=1)
        if result["status"] == "NO_ISSUES":
            print("  PASS: Correctly returned NO_ISSUES for clean code")
            return True
        else:
            print(f"  FAIL: Expected NO_ISSUES, got {result['status']}")
            return False
    finally:
        os.unlink(tmp_path)


def test_fixer_agent_max_iterations():
    """FixerAgent should refuse to run past MAX_ITERATIONS."""
    agent = FixerAgent()

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(BUGGY_CODE)
        tmp_path = f.name

    try:
        result = agent.fix_file(tmp_path, MOCK_BUG_REPORT, iteration=4)
        if result["status"] == "MAX_ITERATIONS_REACHED":
            print("  PASS: Correctly blocked iteration 4 (max is 3)")
            return True
        else:
            print(f"  FAIL: Expected MAX_ITERATIONS_REACHED, got {result['status']}")
            return False
    finally:
        os.unlink(tmp_path)


def test_fixer_agent_full(use_llm=True):
    """Full integration test — runs deterministic fixes + LLM fix on buggy code."""
    agent = FixerAgent()

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(BUGGY_CODE)
        tmp_path = f.name

    try:
        result = agent.fix_file(tmp_path, MOCK_BUG_REPORT, iteration=1)
        print(f"  Status  : {result['status']}")
        print(f"  Iteration: {result['iteration']}")
        print(f"  Det. fixes: {len(result['fix_log'])}")
        if result["fixed_code"]:
            print(f"  Fixed code preview:\n{'─'*40}")
            print(result["fixed_code"][:400])
            print("─" * 40)
            return True
        else:
            print("  FAIL: No fixed code returned")
            return False
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("=" * 50)
    print("FixerAgent Test Suite")
    print("=" * 50)

    print("\n[1] FixerEngine — deterministic fixes (no API)...")
    test_fixer_engine_deterministic()

    print("\n[2] FixerAgent — no findings / clean file...")
    test_fixer_agent_no_findings()

    print("\n[3] FixerAgent — iteration cap enforcement...")
    test_fixer_agent_max_iterations()

    print("\n[4] FixerAgent — full run with LLM (requires API key)...")
    test_fixer_agent_full()

    print("\n" + "=" * 50)
    print("Done.")
