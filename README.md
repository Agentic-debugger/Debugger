# (WIP) Agentic Software Debugger & Documenter

_A multi-agent debugging and documentation system built with Google ADK_

## Features

- **Bug Detection Agent:** identifies syntax, logic, and style issues in Python code
- **Fixer Agent:** proposes and applies code fixes
- **LoopAgent:** validates fixes using a linter and retries up to 3 times if issues persist
- **Documentation Agent:** generates Markdown documentation for the final code
- **Trace Logging:** records agent decisions and tool usage for transparency

## How It Works

1. Provide a Python file via CLI
2. The Bug Detection Agent analyzes the code and identifies issues
3. The Fixer Agent proposes and applies fixes iteratively, with validation from the LoopAgent
4. Once the code is clean, the Documentation Agent generates Markdown documentation
5. Outputs the corrected code and documentation to the user

## Installation

### Requirements

- Python 3.10+
- Google ADK
- Google Gemini API key

### Setup

```
git clone https://github.com/Agentic-debugger/Debugger
cd Debugger
pip install -r requirements.txt
```

Create a `.env` file in the root directory and add your Google Gemini API key:

```
GOOGLE_API_KEY = your_api_key_here
```

## Repository Structure

```text
Debugger/
├── Agents/
│   ├── Baseagent.py
│   ├── Detector.py
│   ├── Documentation.py
│   ├── Fixer.py
│   └── Loop.py
│
├── Linting/
│   ├── rules.py
│   └── validator.py
│
├── Orchestration/
│   ├── controller.py
│   ├── pipeline.py
│   └── state.py
│
├── Documentation/
│   ├── SP-202 - Red - Agentic SWD - REQUIREMENTS.pdf
│   ├── SP-202 - Red - Agentic SWD - DESIGN.pdf
│   └── SP-202 Red Agentic SWD Project Plan.pdf
│
├── main.py
├── README.md
├── requirements.txt
└── .gitignore
```
