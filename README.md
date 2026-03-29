# Agentic Software Debugger & Documenter

A multi-agent pipeline that detects issues in Python source, applies fixes with validation, and writes a Markdown debug report. Built with [Google ADK](https://google.github.io/adk-docs/) and Gemini.

## What it does

1. **Bug detection** — Static analysis (AST) plus an optional Gemini pass that merges and refines findings for the fixer.
2. **Fix loop** — A **Fixer** agent edits the file; a **Loop** orchestrator re-runs validation and retries (up to a configured maximum) while errors remain and progress is possible.
3. **Documentation** — A **Documentation** agent produces a Markdown report from the bug report, loop outcome, and final code.

Validation uses the **Linting** package (`validator` + rules), not only syntax checks.

## Requirements

- Python 3.10+
- `pip install -r requirements.txt` (includes `google-adk`, `python-dotenv`, `pytest`, etc.)
- **Google Gemini API key** (see Setup)

## Setup

```bash
git clone <your-repo-url> SP202
cd SP202
pip install -r requirements.txt
```

Create a `.env` file in the project root (next to `requirements.txt`):

```env
GOOGLE_API_KEY=your_api_key_here
```

Use `KEY=value` with no spaces around `=`. Agents load this via `python-dotenv`.

## Usage

From the repository root:

```bash
python Orchestration/controller.py path/to/your_file.py
```

### Options

| Flag | Meaning |
|------|---------|
| `--doc-output PATH` | Write the Markdown report to this path instead of the default. |
| `--llm-doc-format` | Optional LLM pass to polish the generated Markdown. |
| `--no-llm-detection` | Skip Gemini for detection; AST findings only (no merge/review call). |
| `--json` | Print the full `PipelineState` as JSON instead of a short summary. |

**Default report:** `<directory_of_source>/reports/<source_stem>_debug_report.md` (the `reports` folder is created as needed).

### Exit code

- `0` — Pipeline finished with status `DONE` or `PARTIAL`.
- `1` — Hard failure (e.g. missing file, detection error, loop `ERROR`).

## Project layout

```text
SP202/
├── Agents/
│   ├── Baseagent.py       # ADK + Gemini wiring
│   ├── Detector.py        # AST + optional Gemini merge
│   ├── Documentation.py   # Markdown report
│   ├── Fixer.py           # Deterministic + LLM fixes
│   ├── Loop.py            # Fix → validate → retry
│   └── test_*.py
├── Documentation/         # Course design PDFs (if present)
├── Linting/
│   ├── rules.py
│   ├── validator.py
│   └── test_validator.py
├── Orchestration/
│   ├── controller.py      # CLI
│   ├── pipeline.py        # run_pipeline()
│   └── state.py           # PipelineState
├── reports/               # Generated reports (example / local)
├── bad_code_sample.py
├── requirements.txt
└── README.md
```

## Orchestration

| Module | Role |
|--------|------|
| `Orchestration/controller.py` | Parses CLI args, calls `run_pipeline`, prints summary or JSON, sets process exit code (`0` for `DONE` / `PARTIAL`, else `1`). |
| `Orchestration/pipeline.py` | Single entry `run_pipeline`: validate path → add `Agents/` and `Linting/` to `sys.path` → detection → `LoopAgent.run_loop` with `validate_source` → `DocumentationAgent.document_run`. |
| `Orchestration/state.py` | `PipelineState` dataclass: bug report, loop result, documentation result, errors; `finish(status)` sets final status and timestamps. |

**Pipeline stages**

1. Read source; run **BugDetectionAgent** (`audit_file`). On failure → `ERROR`.
2. Run **LoopAgent** with the same file path, the detection `bug_report`, and `Linting.validator.validate_source`.
3. Run **DocumentationAgent** (`document_run`). Doc failures are recorded but do not always abort the whole run.

**Final status:** `DONE` when the loop ends in an acceptable state and documentation status is `DOCUMENTED`; `ERROR` if the loop reports `ERROR`; otherwise often `PARTIAL`.

## Agents

All LLM agents subclass **BaseAgent** (`Baseagent.py`): loads root `.env`, requires `GOOGLE_API_KEY`, builds an ADK `Agent` + `Runner`, exposes `run(prompt) -> str` (sync wrapper over async execution). Default model: `gemini-2.5-flash`.

### Detector (`Detector.py`)

- **DetectorEngine** — Non-LLM `ast` walk: mutable defaults, `eval`/`exec`, likely hardcoded secrets, bare `except`, `global`, unsafe `open()` heuristic, `snake_case`, etc. Returns a `bug_report`-shaped dict (`status`, `critical_count`, `findings` with line, type, severity, diagnosis, neutralization).
- **BugDetectionAgent** — Runs `DetectorEngine`, then optionally Gemini to compare with AST findings, merge/dedupe, and add misses. **`audit_file(filepath, *, use_gemini_review=True)`** returns `ast_report`, `bug_report` (what Fixer uses), `gemini_review` metadata, and optional `formatted_summary`. If Gemini is off or JSON merge fails, `bug_report` falls back to the AST report.

### Fixer (`Fixer.py`)

- **FixerEngine** — Deterministic passes: mutable defaults → `None`; bare `except` → `except Exception:`; `== None` / `!= None` → `is` / `is not`. **`apply_all()`** returns fixed source and a `fix_log`.
- **FixerAgent** — **`fix_file(filepath, bug_report, iteration)`**: deterministic fixes first, then LLM for remaining findings. **`fix_and_save`** writes `<stem>_fixed.py` (helper; the pipeline uses `fix_file` via the loop). `MAX_ITERATIONS = 3`. Status values include `FIX_ATTEMPTED`, `NO_ISSUES`, `ERROR`, `MAX_ITERATIONS_REACHED`. The model’s fenced code block is extracted as the fixed source.

### Loop (`Loop.py`)

- **`LoopAgent.run_loop(filepath, bug_report, validate_fn)`** — Backs up the original to `*.bak`, repeatedly calls `FixerAgent.fix_file`, writes result to the original path, runs `validate_fn` (from the pipeline: full linter). Stops on **`CLEAN`** (no validation errors), **`NO_IMPROVEMENT`** (error count not decreasing), **`MAX_ITERATIONS_REACHED`**, or fixer **`ERROR`**. After a failed validation, rebuilds `bug_report` from linter output so the next iteration targets current validator findings. Without `validate_fn`, falls back to syntax-only parsing (not used from `pipeline.py`).

### Documentation (`Documentation.py`)

**Role:** Produce a Markdown report for a single run: file path, loop outcome, detector findings, per-iteration fix log, and both final and original code.

**Main API:** `document_run(source_path, bug_report, loop_result, original_code=None, output_path=None, use_llm_formatter=False)`

**Flow:**

1. Read the current file from disk (so the report stays aligned if the path was edited).
2. **`build_markdown(...)`** — Deterministic sections; no LLM required for the base report.
3. Optionally **`_polish_markdown`** via `BaseAgent.run` when `use_llm_formatter=True`.
4. **`write_report`** persists the file and creates parent directories as needed.

**Default output:** `<directory_containing_source>/reports/<source_stem>_debug_report.md` (overridden by CLI `--doc-output`).

**Return value:** A `DocumentResult`-shaped dict — `status` (`DOCUMENTED` | `ERROR`), `markdown`, `output_path`, and on failure an `error` string. The **`DocumentResult`** / **`DocumentResultError`** `TypedDict`s in `Documentation.py` describe the shape.

## Tests

```bash
pytest
```

Run from the repo root; tests live under `Agents/` and `Linting/`.

## Status

Work in progress — behavior and CLI may change as the course project evolves.
