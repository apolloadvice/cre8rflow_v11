import re
from src.command_handlers.base import BaseCommandHandler
from src.command_types import EditOperation

class OverlayCommandHandler(BaseCommandHandler):
    def match(self, command_text: str) -> bool:
        overlay_pattern = re.compile(
            r"overlay (?P<asset>\S+)(?: at the (?P<position>[\w ]+?))?(?: from (?P<start>\d{1,2}:\d{2}|\d+s?)(?: to (?P<end>\d{1,2}:\d{2}|\d+s?))?)?$",
            re.I
        )
        return bool(overlay_pattern.match(command_text))

    def parse(self, command_text: str) -> EditOperation:
        overlay_pattern = re.compile(
            r"overlay (?P<asset>\S+)(?: at the (?P<position>[\w ]+?))?(?: from (?P<start>\d{1,2}:\d{2}|\d+s?)(?: to (?P<end>\d{1,2}:\d{2}|\d+s?))?)?$",
            re.I
        )
        overlay_match = overlay_pattern.match(command_text)
        if overlay_match:
            asset = overlay_match.group("asset")
            if not asset:
                return EditOperation(type_="UNKNOWN", parameters={"raw": command_text})
            position = overlay_match.group("position")
            start = overlay_match.group("start")
            end = overlay_match.group("end")
            params = {"asset": asset}
            if position:
                params["position"] = position.strip()
            if start:
                params["start"] = start
            if end:
                params["end"] = end
            return EditOperation(type_="OVERLAY", parameters=params)
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text}) 