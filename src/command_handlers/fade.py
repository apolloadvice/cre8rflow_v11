import re
from src.command_handlers.base import BaseCommandHandler
from src.command_types import EditOperation

class FadeCommandHandler(BaseCommandHandler):
    def match(self, command_text: str) -> bool:
        fade_pattern = re.compile(
            r"fade (?P<direction>in|out)(?: (?P<target>audio|clip\w+|timeline|video|track\d+))?(?: (?:at|from) (?P<start>\d{1,2}:\d{2}|\d+s?))?(?: to (?P<end>\d{1,2}:\d{2}|\d+s?))?",
            re.I
        )
        return bool(fade_pattern.match(command_text))

    def parse(self, command_text: str) -> EditOperation:
        fade_pattern = re.compile(
            r"fade (?P<direction>in|out)(?: (?P<target>audio|clip\w+|timeline|video|track\d+))?(?: (?:at|from) (?P<start>\d{1,2}:\d{2}|\d+s?))?(?: to (?P<end>\d{1,2}:\d{2}|\d+s?))?",
            re.I
        )
        fade_match = fade_pattern.match(command_text)
        if fade_match:
            direction = fade_match.group("direction")
            target = fade_match.group("target")
            start = fade_match.group("start")
            end = fade_match.group("end")
            params = {"direction": direction}
            if target:
                params["target"] = target
            if start:
                params["start"] = start
            if end:
                params["end"] = end
            return EditOperation(type_="FADE", parameters=params)
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text}) 