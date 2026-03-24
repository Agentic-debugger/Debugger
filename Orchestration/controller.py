import argparse
import json

from pipeline import run_pipeline


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
