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

# Request model for adding a clip
class AddClipRequest(BaseModel):
    name: str
    start: float  # in seconds
    end: float    # in seconds
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

@router.post("/timeline/add_clip")
def add_clip(req: AddClipRequest):
    # Find the appropriate track
    track = next((t for t in timeline.tracks if t.track_type == req.track_type), None)
    if not track:
        raise HTTPException(status_code=400, detail=f"Track type '{req.track_type}' not found.")
    # Check for name collision
    if any(c.name == req.name for c in track.clips):
        raise HTTPException(status_code=400, detail=f"Clip with name '{req.name}' already exists in {req.track_type} track.")
    # Add the clip
    from app.timeline import VideoClip, Effect
    if req.track_type == "video":
        clip = VideoClip(
            name=req.name,
            start_frame=int(req.start * timeline.frame_rate),
            end_frame=int(req.end * timeline.frame_rate)
        )
    elif req.track_type == "effect":
        clip = Effect(effect_type=req.name, params={}, start=int(req.start * timeline.frame_rate), end=int(req.end * timeline.frame_rate))
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported track type: {req.track_type}")
    track.clips.append(clip)
    return {"success": True, "message": f"Clip '{req.name}' added to {req.track_type} track.", "timeline": timeline.to_dict()} 