from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from app.command_parser import CommandParser
from app.command_executor import CommandExecutor
from app.timeline import Timeline
from .schemas import CommandRequest, CommandResponse
import logging
from supabase import create_client, Client
import os

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
    supabase.table(SUPABASE_TABLE).upsert(upsert_payload).execute()

@router.post("/command", response_model=CommandResponse)
async def apply_command(payload: CommandRequest):
    """
    Receives an NLP command and the storage path of the asset.
    Loads or creates a Timeline, parses the command, mutates the timeline, and returns the updated timeline.
    """
    logging.info("NLP command %s for %s", payload.command, payload.asset_path)
    # 1. Load timeline from DB or create new
    timeline_dict = load_timeline_from_db(payload.asset_path)
    if timeline_dict:
        timeline = Timeline.from_dict(timeline_dict)
    else:
        timeline = Timeline()
        timeline.load_video(payload.asset_path)
    # 2. Parse and execute command
    parser = CommandParser()
    operation = parser.parse_command(payload.command)
    executor = CommandExecutor(timeline)
    exec_result = executor.execute(operation, command_text=payload.command)
    # 3. Save updated timeline to DB
    save_timeline_to_db(payload.asset_path, timeline.to_dict())
    # 4. Return updated timeline
    return {
        "status": "ok",
        "applied": True,
        "timeline": timeline.to_dict(),
        "message": getattr(exec_result, 'message', "Command applied."),
        "logs": getattr(exec_result, 'logs', []),
    } 