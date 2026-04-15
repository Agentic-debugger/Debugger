"""
test_baseagent.py — Quick smoke test for BaseAgent

Run from the Agents/ folder:
    python test_baseagent.py

Make sure your .env file in the project root has:
    GOOGLE_API_KEY=your_actual_key_here
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(__file__))
from Baseagent import BaseAgent


def test_env_var_missing():
    """Test that missing API key raises a clear error."""
    original = os.environ.pop("GOOGLE_API_KEY", None)
    try:
        agent = BaseAgent(name="TestAgent", instructions="You are helpful.")
        print("FAIL: Should have raised ValueError")
    except ValueError as e:
        print(f"PASS: Correctly raised ValueError — {e}")
    finally:
        if original:
            os.environ["GOOGLE_API_KEY"] = original


def test_agent_creation():
    """Test that the agent initializes without errors (requires valid API key)."""
    try:
        agent = BaseAgent(
            name="TestAgent",
            instructions="You are a helpful assistant. Keep responses very short.",
        )
        print(f"PASS: Agent '{agent.name}' created successfully")
        return agent
    except Exception as e:
        print(f"FAIL: Agent creation failed — {e}")
        return None


async def test_agent_run_async(agent):
    """Test that the agent can respond using run_async directly."""
    if agent is None:
        print("SKIP: test_agent_run skipped (agent not created)")
        return

    try:
        # Test the async method directly
        response = await agent.run_async("Say exactly: Hello from BaseAgent")
        if response and "[No response generated]" not in response and "Error" not in response:
            print(f"PASS: agent.run_async() responded — '{response.strip()[:80]}'")
        else:
            print(f"FAIL: Unexpected response — '{response}'")
    except Exception as e:
        print(f"FAIL: agent.run_async() raised an exception — {e}")


def test_agent_run_sync(agent):
    """Test the synchronous run() wrapper."""
    if agent is None:
        print("SKIP: test_agent_run_sync skipped (agent not created)")
        return

    try:
        response = agent.run("Reply with just the word: working")
        if response and "Error" not in response and "[No response" not in response:
            print(f"PASS: agent.run() responded — '{response.strip()[:80]}'")
        else:
            print(f"FAIL: Unexpected response — '{response}'")
    except Exception as e:
        print(f"FAIL: agent.run() raised an exception — {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("BaseAgent Test Suite")
    print("=" * 50)

    print("\n[1] Testing missing API key handling...")
    test_env_var_missing()

    print("\n[2] Testing agent creation...")
    agent = test_agent_creation()

    print("\n[3] Testing agent.run_async()...")
    asyncio.run(test_agent_run_async(agent))

    print("\n[4] Testing agent.run() sync wrapper...")
    test_agent_run_sync(agent)

    print("\n" + "=" * 50)
    print("Done.")