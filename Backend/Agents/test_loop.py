"""
test_loop.py — smoke tests for LoopAgent orchestration behavior.

Run from Agents/:
    python test_loop.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from Loop import LoopAgent


class StubFixer:
    MAX_ITERATIONS = 3

    def __init__(self, responses):
        self.responses = responses

    def fix_file(self, filepath, bug_report, iteration=1):
        response = self.responses[iteration - 1]
        return {
            "status": response["status"],
            "iteration": iteration,
            "fixed_code": response["code"],
            "fix_log": response.get("fix_log", []),
            "llm_response": "stub",
        }


def test_loop_clean():
    fixer = StubFixer([
        {"status": "FIX_ATTEMPTED", "code": "def f(x):\n    return x\n"},
    ])
    loop = LoopAgent(fixer_agent=fixer, max_iterations=3)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write("def f(x):\nreturn x\n")
        tmp_path = tmp.name

    try:
        result = loop.run_loop(tmp_path, {"findings": []})
        if result["status"] == "CLEAN" and result["iteration"] == 1:
            print("PASS: loop exits CLEAN on first valid fix")
            return True
        print(f"FAIL: expected CLEAN/1, got {result['status']}/{result['iteration']}")
        return False
    finally:
        os.unlink(tmp_path)


def test_loop_no_improvement():
    fixer = StubFixer([
        {"status": "FIX_ATTEMPTED", "code": "def f(\n"},  # 1 syntax error
        {"status": "FIX_ATTEMPTED", "code": "def g(\n"},  # still 1 syntax error
    ])
    loop = LoopAgent(fixer_agent=fixer, max_iterations=3)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write("print('x')\n")
        tmp_path = tmp.name

    try:
        result = loop.run_loop(tmp_path, {"findings": []})
        if result["status"] == "NO_IMPROVEMENT" and result["iteration"] == 2:
            print("PASS: loop exits on NO_IMPROVEMENT when error count does not decrease")
            return True
        print(f"FAIL: expected NO_IMPROVEMENT/2, got {result['status']}/{result['iteration']}")
        return False
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("=" * 50)
    print("LoopAgent Test Suite")
    print("=" * 50)

    ok1 = test_loop_clean()
    ok2 = test_loop_no_improvement()

    print("\n" + "=" * 50)
    print("PASS" if ok1 and ok2 else "FAIL")
