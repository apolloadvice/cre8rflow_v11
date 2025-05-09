import re
from src.command_handlers.base import BaseCommandHandler
from src.command_types import EditOperation

class AddTextCommandHandler(BaseCommandHandler):
    def match(self, command_text: str) -> bool:
        add_text_pattern = re.compile(
            r"add (?:text )?(?:['\"]?(?P<text>[^'\"\s]+)['\"]?)?(?: at the (?P<position>\w+))?(?: from (?P<start>\d{1,2}:\d{2}|\d+)(?: to (?P<end>\d{1,2}:\d{2}|\d+))?)?",
            re.I
        )
        return bool(add_text_pattern.match(command_text))

    def parse(self, command_text: str) -> EditOperation:
        add_text_pattern = re.compile(
            r"add (?:text )?(?:['\"]?(?P<text>[^'\"\s]+)['\"]?)?(?: at the (?P<position>\w+))?(?: from (?P<start>\d{1,2}:\d{2}|\d+)(?: to (?P<end>\d{1,2}:\d{2}|\d+))?)?",
            re.I
        )
        match = add_text_pattern.match(command_text)
        if match:
            text = match.group("text")
            if not text or text.lower() == "at":
                text = None
            position = match.group("position")
            start = match.group("start")
            end = match.group("end")
            params = {}
            if text:
                params["text"] = text
            if position:
                params["position"] = position
            if start:
                params["start"] = start
            if end:
                params["end"] = end
            return EditOperation(type_="ADD_TEXT", parameters=params)
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text}) 