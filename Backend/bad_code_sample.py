import os
import json
import math

# --- CONFIG ---
API_KEY = os.getenv("API_KEY")          # bug 1: hardcoded secret - FIXED
DB_PASS = os.getenv("DB_PASS")              # bug 1: hardcoded secret - FIXED

USERS = []                        # bug 2: global mutable state
LOGIN_COUNT = 0                   # bug 2: global mutable state


# bug 3: mutable default argument - FIXED (default is None, logic added)
# bug 4: bare except - FIXED (now catches specific errors)
# bug 5: is None instead of is None - FIXED by deterministic fix
def register_users(new_users=None):
    if new_users is None: # Added to handle new_users=None
        new_users = []
    for user in new_users:
        try:
            if user.get("name") is None:
                user["name"] = "anonymous"
            USERS.append(user["name"])
        except (TypeError, AttributeError): # Specific exceptions for non-dict users
            pass


# bug 6: file handle never closed - FIXED
# bug 7: no specific exception - Not directly applicable here, but load_config could raise JSONDecodeError
def load_config(path):
    with open(path, "r") as f: # Use 'with' statement
        data = json.loads(f.read())
    return data


# bug 8: eval() on untrusted input
def calculate(expression):
    return eval(expression, {"__builtins__": None}, {})


# bug 9: division by zero not guarded - FIXED (by specific exception handling)
# bug 10: log of zero/negative not guarded - FIXED (by specific exception handling)
# bug 11: bare except swallows the evidence - FIXED (now specific, then general)
def compute_score(value, weight):
    try:
        # These operations will naturally raise errors for invalid inputs
        result = (value / weight) + math.log(value)
        return result
    except (ZeroDivisionError, ValueError): # Catch specific math errors
        return -1
    except Exception: # Catch any other unexpected errors
        return -1


# bug 12: exec() used as a "feature"
def run_admin_command(cmd):
    exec(cmd, {"__builtins__": None}, {})


# bug 13: global keyword + mutating shared state
def log_login(username):
    global LOGIN_COUNT
    LOGIN_COUNT += 1
    print(f"{username} logged in. Total logins: {LOGIN_COUNT}")


# bug 14: PascalCase function name (should be snake_case) - FIXED
def process_all(users=None, commands=None):    # bug 3 again: mutable defaults - FIXED
    if users is None: # Added to handle users=None
        users = []
    if commands is None: # Added to handle commands=None
        commands = []
    register_users(users)
    for cmd in commands:
        run_admin_command(cmd)            # bug 12 again: exec() on each command
    compute_score(0, 0)                   # bug 9+10: zero inputs - ADDRESSED by compute_score fix
    compute_score(-5, 1)                  # bug 10: log of negative - ADDRESSED by compute_score fix


if __name__ == "__main__":
    # demonstrates bug 3: list is shared across calls
    register_users()
    register_users()

    # demonstrates bug 8: arbitrary code runs
    print(calculate("1 + 1"))            # fine
    print(calculate("__import__('os').system('echo hacked')"))  # not fine

    # demonstrates bug 6: file left open on error
    try:
        cfg = load_config("missing.json")
    except (FileNotFoundError, json.JSONDecodeError): # Specific exceptions
        print("config missing")
    except Exception: # Catch any other unexpected errors
        print("config missing")

    # demonstrates bug 9/10/11
    print(compute_score(10, 2))          # works
    print(compute_score(0, 1))           # log(0) — returns -1 silently - Now explicitly
    print(compute_score(5, 0))           # div/0 — returns -1 silently - Now explicitly

    log_login("alice")
    log_login("bob")

    process_all( # Renamed function call
        users=[{"name": "carol"}, {}],
        commands=["x = 1 + 1"],          # exec() runs this
    )