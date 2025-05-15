from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.command_parser import CommandParser
from app.command_executor import CommandExecutor
from app.timeline import Timeline

router = APIRouter()

# Request model for CUT
class CutRequest(BaseModel):
    clip_name: str
    timestamp: str  # Accepts time string or frames
    track_type: str = "video"

# In-memory timeline for demo (replace with persistent storage as needed)
timeline = Timeline()
parser = CommandParser()
executor = CommandExecutor(timeline)

@router.post("/timeline/cut")
def cut_clip(req: CutRequest):
    # Build command string for parser
    command = f"cut {req.clip_name} at {req.timestamp}"
    op = parser.parse_command(command)
    if op.type != "CUT":
        raise HTTPException(status_code=400, detail="Invalid CUT command.")
    op.parameters["track_type"] = req.track_type
    result = executor.execute(op)
    return {
        "success": result.success,
        "message": result.message,
        "timeline": timeline.to_dict()
    } 