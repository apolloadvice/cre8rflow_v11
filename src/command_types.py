from typing import Optional, Dict, Any

class EditOperation:
    """
    Structured representation of a video editing command.
    """
    def __init__(self, type_: str, target: Optional[str] = None, parameters: Optional[Dict[str, Any]] = None):
        self.type = type_
        self.target = target
        self.parameters = parameters or {} 