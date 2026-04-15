import argparse
import json
import queue
import threading
from dataclasses import asdict
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import FastAPI
from fastapi import File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
try:
    from .pipeline import run_pipeline
except ImportError:  # Allows `python controller.py` style execution
    from pipeline import run_pipeline


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RUNS: dict[str, dict] = {}


def _state_to_dict(state) -> dict:
    payload = asdict(state)
    payload["id"] = payload.get("id") or str(uuid4())
    payload["bug_report"] = payload.get("bug_report") or None
    payload["ast_report"] = payload.get("ast_report") or None
    payload["loop_result"] = payload.get("loop_result") or None
    payload["documentation_result"] = payload.get("documentation_result") or None
    return payload


@app.post("/run")
def run_endpoint(
    file: UploadFile = File(...),
    use_gemini_detection: bool = Form(True),
    use_llm_doc_format: bool = Form(False),
    max_iterations: int = Form(3),
):
    suffix = Path(file.filename or "source.py").suffix or ".py"
    try:
        raw = file.file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {exc}") from exc

    upload_name = file.filename

    def generate():
        q: queue.Queue = queue.Queue()

        def worker() -> None:
            try:
                with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp_path = Path(tmp.name)
                    tmp.write(raw)

                def progress_cb(ev: dict) -> None:
                    q.put(("progress", ev))

                state = run_pipeline(
                    source_path=str(tmp_path),
                    use_llm_doc_formatter=use_llm_doc_format,
                    use_gemini_detection_review=use_gemini_detection,
                    max_iterations=max_iterations,
                    progress_cb=progress_cb,
                )
                payload = _state_to_dict(state)
                run_id = str(uuid4())
                payload["id"] = run_id
                payload["source_path"] = upload_name or payload.get("source_path")
                RUNS[run_id] = payload
                q.put(("complete", payload))
            except Exception as exc:
                q.put(("error", str(exc)))

        threading.Thread(target=worker, daemon=True).start()
        while True:
            kind, data = q.get()
            if kind == "progress":
                yield json.dumps({"type": "progress", "progress": data}) + "\n"
            elif kind == "complete":
                yield json.dumps({"type": "complete", "state": data}) + "\n"
                return
            elif kind == "error":
                yield json.dumps({"type": "error", "message": data}) + "\n"
                return

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@app.get("/history")
def history_endpoint():
    def to_history_entry(run_id: str, run: dict) -> dict:
        loop_result = run.get("loop_result") or {}
        bug_report = run.get("bug_report") or {}
        filename = Path(run.get("source_path") or "").name
        return {
            "id": run_id,
            "filename": filename or "uploaded.py",
            "status": run.get("status", "ERROR"),
            "loop_status": loop_result.get("status"),
            "started_at": run.get("started_at"),
            "finished_at": run.get("finished_at"),
            "iteration_count": loop_result.get("iteration", 0),
            "critical_count": bug_report.get("critical_count", 0),
        }

    rows = [to_history_entry(run_id, run) for run_id, run in RUNS.items()]
    rows.sort(key=lambda row: row.get("started_at") or "", reverse=True)
    return JSONResponse(rows)


@app.get("/results/{run_id}")
def get_result_endpoint(run_id: str):
    run = RUNS.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return JSONResponse(run)


@app.delete("/history/{run_id}")
def delete_history_entry(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    del RUNS[run_id]
    return JSONResponse({"ok": True})


@app.get("/results/{run_id}/report")
def report_endpoint(run_id: str, format: str = "md"):
    run = RUNS.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    doc = run.get("documentation_result") or {}
    markdown = doc.get("markdown")
    if not markdown:
        raise HTTPException(status_code=404, detail="Report not available")

    if format == "md":
        return PlainTextResponse(markdown, media_type="text/markdown; charset=utf-8")
    if format == "html":
        html = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<title>SP202 Report</title></head><body><pre>"
            f"{markdown}"
            "</pre></body></html>"
        )
        return PlainTextResponse(html, media_type="text/html; charset=utf-8")

    raise HTTPException(status_code=400, detail="Unsupported report format")

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run SP202 agentic debugger pipeline.")
    parser.add_argument("source", help="Path to Python source file to process.")
    parser.add_argument(
        "--doc-output",
        default=None,
        help="Optional explicit markdown output path for documentation report.",
    )
    parser.add_argument(
        "--llm-doc-format",
        action="store_true",
        help="Enable optional LLM polish pass for markdown documentation.",
    )
    parser.add_argument(
        "--no-llm-detection",
        action="store_true",
        help="Skip Gemini review; use AST findings only (no API call for detection merge).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full pipeline state as JSON.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    state = run_pipeline(
        source_path=args.source,
        use_llm_doc_formatter=args.llm_doc_format,
        documentation_output_path=args.doc_output,
        use_gemini_detection_review=not args.no_llm_detection,
    )

    if args.json:
        print(json.dumps(state.__dict__, indent=2))
    else:
        print(f"Status: {state.status}")
        print(f"Source: {state.source_path}")
        print(f"Loop status: {state.loop_result.get('status')}")
        print(f"Documentation status: {state.documentation_result.get('status')}")
        doc_path = state.documentation_result.get("output_path")
        if doc_path:
            print(f"Documentation file: {doc_path}")
        if state.errors:
            print("Errors:")
            for err in state.errors:
                print(f" - {err}")

    return 0 if state.status in ("DONE", "PARTIAL") else 1


if __name__ == "__main__":
    raise SystemExit(main())
