from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class PipelineState:
    source_path: str
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    finished_at: str | None = None
    status: str = "INIT"

    original_code: str = ""
    bug_report: dict[str, Any] = field(default_factory=dict)
    loop_result: dict[str, Any] = field(default_factory=dict)
    documentation_result: dict[str, Any] = field(default_factory=dict)

    errors: list[str] = field(default_factory=list)

    def finish(self, status: str) -> None:
        self.status = status
        self.finished_at = datetime.utcnow().isoformat() + "Z"
