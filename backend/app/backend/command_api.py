from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from app.command_parser import CommandParser
from app.command_executor import CommandExecutor
from app.timeline import Timeline

router = APIRouter()

class CommandRequest(BaseModel):
    command: str
    timeline: Dict[str, Any]

class CommandResponse(BaseModel):
    result: str
    message: str
    logs: List[str] = []
    timeline: Dict[str, Any]

@router.post("/command", response_model=CommandResponse)
async def handle_command(request: CommandRequest):
    try:
        # 1. Parse the command
        parser = CommandParser()
        operation = parser.parse_command(request.command)
        # 2. Reconstruct the timeline
        timeline = Timeline.from_dict(request.timeline)
        # 3. Execute the operation
        executor = CommandExecutor(timeline)
        exec_result = executor.execute(operation, command_text=request.command)
        # 4. Return updated timeline and logs
        return CommandResponse(
            result="success" if getattr(exec_result, 'success', True) else "failure",
            message=getattr(exec_result, 'message', "Command executed."),
            logs=getattr(exec_result, 'logs', []),
            timeline=timeline.to_dict()
        )
    except Exception as e:
        return CommandResponse(
            result="failure",
            message=f"Error processing command: {str(e)}",
            logs=[],
            timeline=request.timeline
        ) 