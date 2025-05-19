from pydantic import BaseModel, constr

class CommandRequest(BaseModel):
    """
    Body expected by POST /api/command
    """
    asset_path: constr(strip_whitespace=True, min_length=5)
    command:   constr(strip_whitespace=True, min_length=1)

class CommandResponse(BaseModel):
    status: str  # "ok"
    applied: bool 