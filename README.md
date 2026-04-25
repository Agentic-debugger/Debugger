# Agentic Software Debugger & Documenter

A multi-agent pipeline that detects issues in Python source, applies fixes with validation, and writes a Markdown debug report. Built with [Google ADK](https://google.github.io/adk-docs/) and Gemini. Includes a Next.js frontend and a FastAPI backend.

## What it does

1. **Bug detection** — Static analysis (AST) plus an optional Gemini pass that merges and refines findings for the fixer.
2. **Fix loop** — A **Fixer** agent edits the file; a **Loop** orchestrator re-runs validation and retries (up to a configured maximum) while errors remain and progress is possible.
3. **Documentation** — A **Documentation** agent produces a Markdown report from the bug report, loop outcome, and final code.

Validation uses the **Linting** package (`validator` + rules), not only syntax checks.

## Requirements

- Python 3.10+
- Node.js 18+
- `pip install -r requirements.txt` (inside `Backend/`) — includes `google-adk`, `fastapi`, `uvicorn`, `python-dotenv`, `pytest`, etc.
- **Google Gemini API key** (see Setup)

## Setup

```bash
git clone <your-repo-url> SP202
cd SP202
```

### Backend

```bash
cd Backend
python -m venv .venv
.venv/Scripts/activate       # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file inside `Backend/`:

```env
GOOGLE_API_KEY=your_api_key_here
```

### Frontend

```bash
cd Frontend
npm install
```

## Running

### Backend (FastAPI server)

```bash
cd Backend
.venv/Scripts/activate
uvicorn Orchestration.controller:app --reload
```

Server runs at `http://localhost:8000`.

### Frontend (Next.js)

```bash
cd Frontend
npm run dev
```

App runs at `http://localhost:3000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/run` | Upload a `.py` file and stream pipeline progress (NDJSON) |
| `GET` | `/history` | List all completed runs |
| `GET` | `/results/{run_id}` | Full result for a run |
| `GET` | `/results/{run_id}/report` | Markdown or HTML report (`?format=md` or `?format=html`) |
| `DELETE` | `/history/{run_id}` | Remove a run from history |

### `/run` form fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `file` | file | required | Python source file to analyse |
| `use_gemini_detection` | bool | `true` | Enable Gemini merge/review pass |
| `use_llm_doc_format` | bool | `false` | Polish the Markdown report with an LLM |
| `max_iterations` | int | `3` | Maximum fix-validate retry iterations |

## CLI Usage (alternative to the server)

```bash
cd Backend
.venv/Scripts/activate
python -m Orchestration.controller path/to/your_file.py
```

### Options

| Flag | Meaning |
|------|---------|
| `--doc-output PATH` | Write the Markdown report to this path instead of the default. |
| `--llm-doc-format` | Optional LLM pass to polish the generated Markdown. |
| `--no-llm-detection` | Skip Gemini for detection; AST findings only. |
| `--json` | Print the full `PipelineState` as JSON instead of a short summary. |

Exit code `0` — `DONE` or `PARTIAL`; `1` — hard failure.

## Project Layout

```text
SP202/
├── Backend/
│   ├── Agents/
│   │   ├── Baseagent.py       # ADK + Gemini wiring
│   │   ├── Detector.py        # AST + optional Gemini merge
│   │   ├── Documentation.py   # Markdown report
│   │   ├── Fixer.py           # Deterministic + LLM fixes
│   │   ├── Loop.py            # Fix → validate → retry
│   │   └── test_*.py
│   ├── Linting/
│   │   ├── rules.py
│   │   ├── validator.py
│   │   └── test_validator.py
│   ├── Orchestration/
│   │   ├── controller.py      # FastAPI server + CLI entry point
│   │   ├── pipeline.py        # run_pipeline()
│   │   └── state.py           # PipelineState dataclass
│   ├── .venv/
│   ├── bad_code_sample.py
│   └── requirements.txt
├── Frontend/
│   ├── app/
│   │   ├── page.tsx           # Main upload + pipeline UI
│   │   ├── history/page.tsx   # Run history
│   │   ├── results/[id]/page.tsx  # Result detail
│   │   └── layout.tsx
│   └── package.json
└── README.md
```

## Orchestration

| Module | Role |
|--------|------|
| `Orchestration/controller.py` | FastAPI app + CLI fallback. Streams pipeline progress via NDJSON, stores results in memory, exposes history/result/report endpoints. |
| `Orchestration/pipeline.py` | Single entry `run_pipeline`: validate path → add `Agents/` and `Linting/` to `sys.path` → detection → `LoopAgent.run_loop` → `DocumentationAgent.document_run`. |
| `Orchestration/state.py` | `PipelineState` dataclass: bug report, loop result, documentation result, errors; `finish(status)` sets final status and timestamps. |

## Agents

All LLM agents subclass **BaseAgent** (`Baseagent.py`): loads root `.env`, requires `GOOGLE_API_KEY`, builds an ADK `Agent` + `Runner`, exposes `run(prompt) -> str`. Default model: `gemini-2.5-flash`.

### Detector
- **DetectorEngine** — AST walk: mutable defaults, `eval`/`exec`, hardcoded secrets, bare `except`, `global`, unsafe `open()`, `snake_case`, etc.
- **BugDetectionAgent** — Runs `DetectorEngine`, then optionally Gemini to merge/dedupe. Falls back to AST report if Gemini is off or JSON merge fails.

### Fixer
- **FixerEngine** — Deterministic passes: mutable defaults → `None`; bare `except` → `except Exception:`; `== None` → `is None`.
- **FixerAgent** — Deterministic fixes first, then LLM for remaining findings. `MAX_ITERATIONS = 3`.

### Loop
- **`LoopAgent.run_loop`** — Backs up original to `*.bak`, repeatedly calls `FixerAgent.fix_file`, writes result, runs the validator. Stops on `CLEAN`, `NO_IMPROVEMENT`, `MAX_ITERATIONS_REACHED`, or fixer `ERROR`.

### Documentation
- **`document_run`** — Deterministic Markdown sections; optional LLM polish pass. Default output: `<source_dir>/reports/<stem>_debug_report.md`.

## Tests

```bash
cd Backend
pytest
```

## Conclusion

The preliminary results demonstrate that a hybrid multi-agent approach — combining deterministic AST analysis with LLM-powered reasoning — is viable for automated Python code repair and documentation. The system successfully detects, categorizes, and fixes the majority of common bug categories in a single pipeline run with no manual intervention.

The two-pass detection model (AST + LLM merge) reduces both false positives and false negatives. The deterministic-first fixing strategy reduces API cost while preserving coverage for complex issues. The `NO_IMPROVEMENT` termination on `eval()`/`exec()` bugs confirms the system correctly recognizes its own repair limits — an important safety property for an autonomous agent.

**Future Work:** Expand rule coverage (unused imports, type hints, shadowed builtins), introduce multi-file support, improve the loop's ability to distinguish structurally unresolvable bugs, and add an end-to-end integration test for `pipeline.py`.
