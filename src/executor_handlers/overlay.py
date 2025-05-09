from src.executor_handlers.base import BaseOperationHandler
from src.command_types import EditOperation
from src.executor_types import ExecutionResult

class OverlayOperationHandler(BaseOperationHandler):
    def can_handle(self, operation: EditOperation) -> bool:
        return operation.type == "OVERLAY"

    def execute(self, operation: EditOperation, executor) -> ExecutionResult:
        asset = operation.parameters.get("asset")
        position = operation.parameters.get("position")
        start = operation.parameters.get("start")
        end = operation.parameters.get("end")
        msg = f"Overlay {asset}"
        if position:
            msg += f" at the {position}"
        if start and end:
            msg += f" from {start} to {end}"
        elif start:
            msg += f" starting at {start}"
        elif end:
            msg += f" ending at {end}"
        return ExecutionResult(True, msg) 