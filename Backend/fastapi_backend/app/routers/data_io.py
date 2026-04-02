from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_manager
from ..schemas_data_io import (
    DataExportRequest,
    DataImportCommitResponse,
    DataImportDryRunResponse,
    DataImportRequest,
)
from ..services.data_io_service import (
    apply_import_merge,
    build_export_snapshot,
    dry_run_import,
    log_data_io_event,
)

router = APIRouter(prefix="/data", tags=["data_io"])


@router.post("/export")
def export_data(
    payload: DataExportRequest,
    db: Session = Depends(get_db),
    manager=Depends(require_manager),
) -> dict:
    if payload.format != "json":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only json export is supported")

    snapshot = build_export_snapshot(
        db=db,
        current_user=manager,
        include_transactions=payload.include_transactions,
        include_users=payload.include_users,
        include_user_credentials=payload.include_user_credentials,
    )

    log_data_io_event(
        db=db,
        acting_user=manager,
        operation="export",
        details={
            "format": payload.format,
            "include_transactions": payload.include_transactions,
            "include_users": payload.include_users,
            "include_user_credentials": payload.include_user_credentials,
            "entity_counts": snapshot.get("meta", {}).get("entity_counts", {}),
        },
    )
    db.commit()

    return snapshot


@router.post("/import/dry-run", response_model=DataImportDryRunResponse)
def import_data_dry_run(
    payload: DataImportRequest,
    _manager=Depends(require_manager),
) -> DataImportDryRunResponse:
    result = dry_run_import(payload=payload.payload, mode=payload.mode, strict=payload.strict)
    return DataImportDryRunResponse.model_validate(result)


@router.post("/import/commit", response_model=DataImportCommitResponse)
def import_data_commit(
    payload: DataImportRequest,
    db: Session = Depends(get_db),
    manager=Depends(require_manager),
) -> DataImportCommitResponse:
    if payload.mode == "replace":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Replace mode is not enabled yet")

    dry_run_result = dry_run_import(payload=payload.payload, mode=payload.mode, strict=payload.strict)
    if dry_run_result["errors"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Import validation failed")

    try:
        summary, warnings = apply_import_merge(
            db=db,
            payload=payload.payload,
            include_users=payload.include_users,
            include_transactions=payload.include_transactions,
        )
        import_id = f"imp_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        log_data_io_event(
            db=db,
            acting_user=manager,
            operation="import_commit",
            details={
                "import_id": import_id,
                "mode": payload.mode,
                "strict": payload.strict,
                "include_users": payload.include_users,
                "include_transactions": payload.include_transactions,
                "summary": summary,
                "warning_count": len(warnings),
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return DataImportCommitResponse(
        ok=True,
        import_id=import_id,
        summary=summary,
        warnings=warnings,
    )
