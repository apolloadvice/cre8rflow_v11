import re
from src.command_handlers.base import BaseCommandHandler
from src.command_types import EditOperation

ORDINALS = [
    "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"
]
ordinal_pattern = r"(?P<ordinal>(" + "|".join(ORDINALS) + r"|\d+(st|nd|rd|th)))"
target_pattern = rf"(?:the )?(?P<target>(last clip|first clip|clip named [\w_\-]+|clip\w+|audio\w+|subtitle\w+|effect\w+|{ordinal_pattern}(?: (?P<ref_track_type>video|audio|subtitle|effect))? clip))"

class TrimCommandHandler(BaseCommandHandler):
    def match(self, command_text: str) -> bool:
        trim_pattern = re.compile(rf"trim(?: (?:the )?(?:start of )?)?(?:the )?{target_pattern}?(?: (?:to|at) (?P<timestamp>\d{{1,2}}:\d{{2}}|\d+))?", re.I)
        return bool(trim_pattern.match(command_text))

    def parse(self, command_text: str) -> EditOperation:
        trim_pattern = re.compile(rf"trim(?: (?:the )?(?:start of )?)?(?:the )?{target_pattern}?(?: (?:to|at) (?P<timestamp>\d{{1,2}}:\d{{2}}|\d+))?", re.I)
        trim_match = trim_pattern.match(command_text)
        if trim_match:
            target = trim_match.group("target")
            timestamp = trim_match.group("timestamp")
            params = {}
            reference_type = None
            if target:
                t = target.lower()
                if t in ["last clip", "first clip"]:
                    reference_type = "positional"
                elif t.startswith("clip named"):
                    reference_type = "named"
                elif trim_match.group("ordinal"):
                    reference_type = "ordinal"
                    params["ordinal"] = trim_match.group("ordinal")
                    if trim_match.group("ref_track_type"):
                        params["ref_track_type"] = trim_match.group("ref_track_type")
                        params["track_type"] = trim_match.group("ref_track_type")
            if timestamp:
                params["timestamp"] = timestamp
            # Infer track_type from target name
            if target:
                if t.startswith("audio"):
                    params["track_type"] = "audio"
                elif t.startswith("subtitle"):
                    params["track_type"] = "subtitle"
                elif t.startswith("effect"):
                    params["track_type"] = "effect"
            if reference_type:
                params["reference_type"] = reference_type
            return EditOperation(type_="TRIM", target=target, parameters=params)
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text}) 