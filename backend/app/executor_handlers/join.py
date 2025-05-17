from app.executor_handlers.base import BaseOperationHandler
from app.command_types import EditOperation
from app.executor_types import ExecutionResult

class JoinOperationHandler(BaseOperationHandler):
    def can_handle(self, operation: EditOperation) -> bool:
        return operation.type == "JOIN"

    def execute(self, operation: EditOperation, executor) -> ExecutionResult:
        first_clip = operation.target
        second_clip = operation.parameters.get("second")
        effect = operation.parameters.get("effect")
        if not first_clip or not second_clip:
            return ExecutionResult(False, "Missing one or both clip names for JOIN operation.")
        track_type = operation.parameters.get("track_type", "video")
        track_index = operation.parameters.get("track_index")
        if track_index is None:
            # Try to find the track index for either first_clip or second_clip
            found_index = executor.find_track_index_for_clip(first_clip, track_type)
            if found_index is None:
                found_index = executor.find_track_index_for_clip(second_clip, track_type)
            if found_index is None:
                return ExecutionResult(False, f"Neither '{first_clip}' nor '{second_clip}' found in any {track_type} track.")
            track_index = found_index
        else:
            track_index = int(track_index)
        result = executor.timeline.join_clips(first_clip, second_clip, track_type=track_type, track_index=track_index)
        effect_msg = f" with effect '{effect}'" if effect else ""
        return ExecutionResult(result, f"Joined {first_clip} and {second_clip}{effect_msg}: {result}") 