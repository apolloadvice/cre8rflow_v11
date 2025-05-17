from app.executor_handlers.base import BaseOperationHandler
from app.command_types import EditOperation
from app.executor_types import ExecutionResult

class CutOperationHandler(BaseOperationHandler):
    def can_handle(self, operation: EditOperation) -> bool:
        return operation.type == "CUT"

    def execute(self, operation: EditOperation, executor) -> ExecutionResult:
        clip_name = operation.target
        # timestamp is expected to be in frames already
        timestamp_frames = operation.parameters.get("timestamp")
        if not clip_name or timestamp_frames is None:
            return ExecutionResult(False, "Missing clip name or timestamp for CUT operation.")
        frame_rate = executor.timeline.frame_rate
        track_type = operation.parameters.get("track_type", "video")
        track_index = operation.parameters.get("track_index")
        if track_index is None:
            found_index = executor.find_track_index_for_clip(clip_name, track_type)
            if found_index is None:
                return ExecutionResult(False, f"Clip '{clip_name}' not found in any {track_type} track.")
            track_index = found_index
        else:
            track_index = int(track_index)
        result = executor.timeline.trim_clip(clip_name, timestamp_frames, track_type=track_type, track_index=track_index)
        return ExecutionResult(result, f"Cut operation on {clip_name} at {timestamp_frames} frames: {result}") 