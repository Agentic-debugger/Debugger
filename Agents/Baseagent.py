from google.adk.agents import Agent
from dotenv import load_dotenv
import os

load_dotenv()



class Basegent:
    def __init__(self,name,instructions,model="gemini-1.5-pro"):

            self.api_key=os.getenv("google_api_key")
            # self.apikey enables the api key to stay in the memory rather than using a local variable that way if there is a need to reinitialize the key is still there but there are also ways we could do it with local variable just stating 
            # Also aids multiple agent flexibility 
            # can also be helpful for debugging e.g print(agent.api_key) 
            # jsut better for initializations
            if not self.api_key:
                  raise ValueError("Api key is not found in enviroment")
            
            self.name=name

            self.agent = Agent(
                model=model,
                description=name,
                instructions=instructions,
                api_key=self.api_key

            )

    def run(self, prompt):
            """Standard execution method for all agents: this is the logic every single agent will be following basically it is making our code a lot cleaner """
            print(f"[*] Executing Agebt: {self.name}")
            try:
                # ADK's agent.run handles the logic and communication with Gemini
                response = self.agent.run(prompt)
                # Depending on ADK version, response might be an object or string
                # If it's an object, you might need response.text or similar
                return response
            except Exception as e:
                return f"Error in {self.name}: {str(e)}"