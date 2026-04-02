from typing import Any, Literal

from pydantic import BaseModel, Field


class DataExportRequest(BaseModel):
    format: Literal["json"] = "json"
    include_transactions: bool = True
    include_users: bool = True
    include_user_credentials: bool = False


class DataImportRequest(BaseModel):
    payload: dict[str, Any]
    mode: Literal["merge", "replace"] = "merge"
    strict: bool = True
    include_transactions: bool = True
    include_users: bool = True


class ImportIssue(BaseModel):
    code: str
    message: str
    severity: Literal["error", "warning"]
    entity: str | None = None
    field: str | None = None
    key: str | None = None


class DataImportSummary(BaseModel):
    mode: str
    strict: bool
    app_schema_version_detected: str | None = None
    entity_counts: dict[str, int]


class DataImportActions(BaseModel):
    create: dict[str, int]
    update: dict[str, int]
    noop: dict[str, int]


class DataImportDryRunResponse(BaseModel):
    ok: bool
    summary: DataImportSummary
    actions: DataImportActions
    warnings: list[ImportIssue]
    errors: list[ImportIssue]


class DataImportCommitResponse(BaseModel):
    ok: bool
    import_id: str
    summary: dict[str, dict[str, int]]
    warnings: list[ImportIssue]
