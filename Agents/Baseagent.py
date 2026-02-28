from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from dotenv import load_dotenv
import os
import asyncio

# grab env file that contains api key
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)


class BaseAgent:
    def __init__(self, name: str, instructions: str, model: str = "gemini-2.0-flash"):
        """
        Base agent class that all specialized agents inherit from.

        Args:
            name: A descriptive name for this agent.
            instructions: The system prompt / behavior instructions for this agent.
            model: The Gemini model string to use (default: gemini-1.5-flash).
        """
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY not found in environment. "
                "Make sure your .env file contains GOOGLE_API_KEY=your_key_here"
            )

        self.name = name
        self.model = model

        # ADK reads GOOGLE_API_KEY from environment automatically — do NOT pass it here
        self.agent = Agent(
            model=model,
            name=name,
            description=f"Agent responsible for: {name}",
            instruction=instructions,
        )

        self.session_service = InMemorySessionService()
        self.runner = Runner(
            agent=self.agent,
            app_name=name,
            session_service=self.session_service,
        )

    async def run_async(self, prompt: str) -> str:
        """
        Async execution method — required because ADK session service is async.

        Args:
            prompt: The user message to send to the agent.

        Returns:
            The agent's response as a plain string.
        """
        print(f"[*] Executing Agent: {self.name}")
        try:
            # create_session is async in ADK
            session = await self.session_service.create_session(
                app_name=self.name,
                user_id="system",
            )

            message = types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )

            response_text = ""
            async for event in self.runner.run_async(
                user_id="system",
                session_id=session.id,
                new_message=message,
            ):
                if event.is_final_response() and event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            response_text += part.text

            return response_text if response_text else "[No response generated]"

        except Exception as e:
            return f"Error in {self.name}: {str(e)}"

    def run(self, prompt: str) -> str:
        """
        Synchronous wrapper around run_async.
        Lets other agents call agent.run() without needing to know about async.

        Args:
            prompt: The user message to send to the agent.

        Returns:
            The agent's response as a plain string.
        """
        return asyncio.run(self.run_async(prompt))