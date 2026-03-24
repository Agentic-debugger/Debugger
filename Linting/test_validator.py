"""
test_validator.py — quick smoke tests for validator output format.

Run from project root:
    python Linting/test_validator.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from Linting.validator import validate_source


BUGGY = """\
def BadFunction(items=[]):
    eval("print('x')")
    try:
        return items
    except:
        pass
    if items == None:
        return []
    return items
"""


def test_validator_findings():
    errors = validate_source(BUGGY)
    codes = {e["code"] for e in errors}
    expected = {
        "MUTABLE_DEFAULT",
        "NON_SNAKE_CASE_FUNCTION",
        "EVAL_EXEC_USAGE",
        "BARE_EXCEPT",
        "NONE_COMPARISON",
    }

    missing = expected - codes
    if missing:
        print(f"FAIL: missing expected codes: {sorted(missing)}")
        return False

    required_fields = {"line", "code", "severity", "message", "neutralization"}
    for entry in errors:
        if not required_fields.issubset(entry.keys()):
            print(f"FAIL: malformed entry: {entry}")
            return False

    print(f"PASS: validator returned {len(errors)} findings with expected shape")
    return True


if __name__ == "__main__":
    ok = test_validator_findings()
    print("PASS" if ok else "FAIL")
