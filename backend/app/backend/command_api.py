from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel
from typing import List, Dict, Any
from app.command_parser import CommandParser
from app.command_executor import CommandExecutor
from app.timeline import Timeline
from .schemas import CommandRequest, CommandResponse
import logging
from supabase import create_client, Client
import os
import json
from app.llm_parser import parse_command_with_llm

logging.basicConfig(level=logging.DEBUG)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fgvyotgowmcwcphsctlc.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndnlvdGdvd21jd2NwaHNjdGxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTczMjU5MCwiZXhwIjoyMDYxMzA4NTkwfQ.3JXr_BUDFs0c2cvNog2-igf_UWQ2H7CAp3WJL_JJLSM")
SUPABASE_TABLE = "timelines"

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def load_timeline_from_db(asset_path: str):
    supabase = get_supabase_client()
    try:
        result = supabase.table(SUPABASE_TABLE).select("timeline_json").eq("asset_path", asset_path).single().execute()
        if result.data:
            return result.data["timeline_json"]
    except Exception as e:
        # If no row is found, just return None (expected for new assets)
        if hasattr(e, 'args') and e.args and 'PGRST116' in str(e.args[0]):
            return None
        # Otherwise, re-raise
        raise
    return None

def get_asset_duration(asset_path: str) -> float:
    """
    Fetch the duration (in seconds) for the asset from the assets table in Supabase.
    Returns None if not found or not available.
    """
    supabase = get_supabase_client()
    try:
        result = supabase.table("assets").select("duration").eq("path", asset_path).single().execute()
        if result.data and result.data.get("duration"):
            return float(result.data["duration"])
    except Exception as e:
        logging.warning(f"[get_asset_duration] Could not fetch duration for {asset_path}: {e}")
    return None

def save_timeline_to_db(asset_path: str, timeline_dict: dict):
    supabase = get_supabase_client()
    # Try to fetch the existing row's id
    result = supabase.table(SUPABASE_TABLE).select("id").eq("asset_path", asset_path).execute()
    upsert_payload = {
        "asset_path": asset_path,
        "timeline_json": timeline_dict,
        "updated_at": "now()"
    }
    if result.data and len(result.data) > 0 and "id" in result.data[0]:
        upsert_payload["id"] = result.data[0]["id"]
    try:
        logging.info(f"[save_timeline_to_db] Upserting timeline for asset_path={asset_path}. Payload keys: {list(upsert_payload.keys())}")
        logging.debug(f"[save_timeline_to_db] Timeline JSON: {json.dumps(timeline_dict)[:500]}... (truncated)")
        upsert_result = supabase.table(SUPABASE_TABLE).upsert(upsert_payload).execute()
        logging.info(f"[save_timeline_to_db] Upsert result: {upsert_result}")
    except Exception as e:
        logging.error(f"[save_timeline_to_db] Supabase upsert error: {e}")
        raise

@router.post("/command", response_model=CommandResponse)
async def apply_command(payload: CommandRequest):
    """
    Receives an NLP command and the storage path of the asset.
    Loads or creates a Timeline, parses the command, mutates the timeline, and returns the updated timeline.
    """
    logging.info(f"[apply_command] Received command: '{payload.command}' for asset_path: '{payload.asset_path}'")
    # 1. Load timeline from DB or create new
    timeline_dict = load_timeline_from_db(payload.asset_path)
    if timeline_dict:
        logging.debug(f"[apply_command] Loaded timeline from DB (truncated): {json.dumps(timeline_dict)[:500]}...")
        timeline = Timeline.from_dict(timeline_dict)
    else:
        logging.info(f"[apply_command] No timeline found for asset_path={payload.asset_path}, creating new timeline.")
        timeline = Timeline()
        duration = get_asset_duration(payload.asset_path)
        # Ensure duration is in seconds, and pass to load_video which expects seconds and converts to frames
        if duration is not None:
            timeline.load_video(payload.asset_path, duration_seconds=duration)
        else:
            timeline.load_video(payload.asset_path)
    # 2. Parse and execute command
    parser = CommandParser()
    operation = parser.parse_command(payload.command)
    logging.debug(f"[apply_command] Parsed operation: {operation.type}, target: {operation.target}, parameters: {operation.parameters}")
    executor = CommandExecutor(timeline)
    exec_result = executor.execute(operation, command_text=payload.command)
    logging.info(f"[apply_command] Execution result: success={exec_result.success}, message={exec_result.message}")
    # 3. Save updated timeline to DB
    try:
        logging.debug(f"[apply_command] Timeline after mutation (truncated): {json.dumps(timeline.to_dict())[:500]}...")
        save_timeline_to_db(payload.asset_path, timeline.to_dict())
    except Exception as e:
        logging.error(f"[apply_command] Error saving timeline to DB: {e}")
        raise
    # 4. Return updated timeline
    return {
        "status": "ok",
        "applied": True,
        "timeline": timeline.to_dict(),
        "message": getattr(exec_result, 'message', "Command applied."),
        "logs": getattr(exec_result, 'logs', []),
    } 

class ParseCommandRequest(BaseModel):
    command: str
    asset_path: str = None

class ParseCommandResponse(BaseModel):
    parsed: Any
    error: str = None

@router.post("/parseCommand", response_model=ParseCommandResponse)
async def parse_command(payload: ParseCommandRequest):
    """
    Receives a natural language command and returns the parsed intent JSON using the LLM parser.
    """
    logging.info(f"[parse_command] Received command: '{payload.command}'")
    duration = None
    if payload.asset_path:
        duration = get_asset_duration(payload.asset_path)
    if duration is None:
        duration = 60.0  # fallback default
    logging.info(f"[parse_command] Using duration={duration} for asset_path={payload.asset_path}")
    parsed, error = parse_command_with_llm(payload.command, duration=duration)
    # Clamp cut command times if present
    if parsed and isinstance(parsed, dict) and parsed.get("action") == "cut":
        start = parsed.get("start")
        end = parsed.get("end")
        # Clamp to [0, duration]
        if start is not None and end is not None:
            start = max(0, min(float(start), duration))
            end = max(0, min(float(end), duration))
            if start >= end:
                return ParseCommandResponse(parsed=None, error=f"Invalid cut range: start ({start}) must be less than end ({end}) and within video duration ({duration}s). Please rephrase your command.")
            parsed["start"] = start
            parsed["end"] = end
    if error:
        logging.warning(f"[parse_command] Error: {error}")
        return ParseCommandResponse(parsed=None, error=error)
    logging.info(f"[parse_command] Parsed result: {parsed}")
    return ParseCommandResponse(parsed=parsed) 

class UpdateAssetDurationRequest(BaseModel):
    asset_path: str
    duration: float

@router.post("/asset/updateDuration")
async def update_asset_duration(payload: UpdateAssetDurationRequest):
    """
    Upsert the duration for a given asset_path in the assets table.
    """
    supabase = get_supabase_client()
    try:
        upsert_payload = {"path": payload.asset_path, "duration": payload.duration}
        result = supabase.table("assets").upsert(upsert_payload).execute()
        return {"status": "ok", "updated": True}
    except Exception as e:
        logging.error(f"[update_asset_duration] Supabase upsert error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update asset duration.") 