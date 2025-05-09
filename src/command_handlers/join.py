import re
from src.command_handlers.base import BaseCommandHandler
from src.command_types import EditOperation

class JoinCommandHandler(BaseCommandHandler):
    def match(self, command_text: str) -> bool:
        join_pattern = re.compile(r"join (?P<first>clip\w+|audio\w+|subtitle\w+|effect\w+) and (?P<second>clip\w+|audio\w+|subtitle\w+|effect\w+)(?: with a (?P<effect>\w+))?", re.I)
        return bool(join_pattern.match(command_text))

    def parse(self, command_text: str) -> EditOperation:
        join_pattern = re.compile(r"join (?P<first>clip\w+|audio\w+|subtitle\w+|effect\w+) and (?P<second>clip\w+|audio\w+|subtitle\w+|effect\w+)(?: with a (?P<effect>\w+))?", re.I)
        join_match = join_pattern.match(command_text)
        if join_match:
            first = join_match.group("first")
            second = join_match.group("second")
            effect = join_match.group("effect")
            params = {"second": second}
            if effect:
                params["effect"] = effect
            # Infer track_type from first or second
            if (first and first.lower().startswith("audio")) or (second and second.lower().startswith("audio")):
                params["track_type"] = "audio"
            elif (first and first.lower().startswith("subtitle")) or (second and second.lower().startswith("subtitle")):
                params["track_type"] = "subtitle"
            elif (first and first.lower().startswith("effect")) or (second and second.lower().startswith("effect")):
                params["track_type"] = "effect"
            return EditOperation(type_="JOIN", target=first, parameters=params)
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text}) 