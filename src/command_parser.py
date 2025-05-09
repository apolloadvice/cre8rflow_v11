import re
from typing import Optional, Dict, Any
import spacy
from src.command_types import EditOperation
from src.command_handlers.cut import CutCommandHandler
from src.command_handlers.trim import TrimCommandHandler
from src.command_handlers.join import JoinCommandHandler
from src.command_handlers.add_text import AddTextCommandHandler
from src.command_handlers.overlay import OverlayCommandHandler
from src.command_handlers.fade import FadeCommandHandler
from src.command_handlers.group_cut import GroupCutCommandHandler

class CommandParser:
    """
    Parses natural language video editing commands into structured operations.

    Uses NLP techniques to extract:
    - Command intent (cut, join, speed, etc.)
    - Target clips
    - Parameters (timestamps, speeds, etc.)
    - Modifiers (transitions, effects)
    """
    # Synonym mapping for extensibility
    INTENT_SYNONYMS = {
        "CUT": ["cut", "split", "divide", "slice"],
        "TRIM": ["trim"],
        "JOIN": ["join"],
        "ADD_TEXT": ["add text"],
        "OVERLAY": ["overlay"],
        "FADE": ["fade"],
        "SPEED": ["speed up", "slow down"],
        "REVERSE": ["reverse"],
        "COLOR_CORRECTION": ["color correction"],
        "EXPORT": ["export"],
    }

    def __init__(self):
        """
        Initialize the parser with spaCy and any custom resources.
        """
        self.nlp = spacy.blank("en")  # Use blank for now; can load 'en_core_web_sm' if available
        # Handler registry for extensibility
        self.handlers = []
        self.register_handler(GroupCutCommandHandler())
        self.register_handler(CutCommandHandler())
        self.register_handler(TrimCommandHandler())
        self.register_handler(JoinCommandHandler())
        self.register_handler(AddTextCommandHandler())
        self.register_handler(OverlayCommandHandler())
        self.register_handler(FadeCommandHandler())
        # TODO: Register other handlers as they are refactored

    def register_handler(self, handler):
        self.handlers.append(handler)

    def parse_command(self, command_text: str) -> EditOperation:
        """
        Parse a natural language command into a structured edit operation.

        Args:
            command_text (str): The natural language command

        Returns:
            EditOperation: Structured representation of the command
        """
        # Use handler registry
        for handler in self.handlers:
            if handler.match(command_text):
                return handler.parse(command_text)
        # Fallback to legacy logic for commands not yet refactored
        # TODO: Add more patterns and spaCy-based parsing
        # Improved add text pattern: captures only the intended text, avoids 'at' as text, allows missing text
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
        # TODO: Add more patterns and spaCy-based parsing
        # Fallback: return unknown operation
        return EditOperation(type_="UNKNOWN", parameters={"raw": command_text})

    def recognize_intent(self, command_text: str) -> str:
        """
        Recognize the intent of a command using regex patterns and synonyms.

        Args:
            command_text (str): The natural language command

        Returns:
            str: The detected intent (e.g., 'CUT', 'TRIM', 'JOIN', etc.), or 'UNKNOWN'
        """
        for intent, synonyms in self.INTENT_SYNONYMS.items():
            for synonym in synonyms:
                # For multi-word synonyms, require word boundary or start
                if re.search(rf"\\b{re.escape(synonym)}\\b", command_text, re.I):
                    # Special case: 'fade' must be followed by 'in' or 'out' for FADE
                    if intent == "FADE" and not re.search(r"fade (in|out)", command_text, re.I):
                        continue
                    # Special case: 'add text' must match as a phrase
                    if intent == "ADD_TEXT" and not re.search(r"add text ", command_text, re.I):
                        continue
                    return intent
        return "UNKNOWN"

    def extract_entities(self, command_text: str) -> Dict[str, Any]:
        """
        Extract entities such as timecodes, clip names, and effects from a command string.

        Args:
            command_text (str): The natural language command

        Returns:
            Dict[str, Any]: Dictionary with keys 'timecodes', 'clip_names', 'effects'
        """
        entities = {
            "timecodes": [],
            "clip_names": [],
            "effects": []
        }
        # Extract timecodes (mm:ss or seconds)
        timecode_pattern = re.compile(r"\b(\d{1,2}:\d{2}|\d{1,4}(?:s| seconds)?)\b", re.I)
        entities["timecodes"] = [m.group(1) for m in timecode_pattern.finditer(command_text)]
        # Extract clip names (e.g., 'clip1', 'intro_clip', 'clip2')
        clip_pattern = re.compile(r"\bclip\w+\b", re.I)
        entities["clip_names"] = [m.group(0) for m in clip_pattern.finditer(command_text)]
        # Extract effects (e.g., 'crossfade', 'fade', 'dissolve', 'color correction')
        effects = []
        effect_patterns = [
            (r"\bcrossfade\b", "crossfade"),
            (r"\bfade\b", "fade"),
            (r"\bdissolve\b", "dissolve"),
            (r"\bcolor correction\b", "color correction"),
            (r"\bblur\b", "blur"),
            (r"\breverse\b", "reverse"),
            (r"\bspeed up\b", "speed up"),
            (r"\bslow down\b", "slow down"),
        ]
        for pattern, effect in effect_patterns:
            if re.search(pattern, command_text, re.I):
                effects.append(effect)
        entities["effects"] = effects
        return entities

    def validate_command(self, operation: EditOperation) -> (bool, str):
        """
        Validate a parsed EditOperation to ensure all required fields are present.

        Args:
            operation (EditOperation): The operation to validate

        Returns:
            (bool, str): Tuple of (is_valid, message)
        """
        if operation.type == "CUT":
            if not operation.target:
                return False, "CUT command requires a target clip name."
            if "timestamp" not in operation.parameters:
                return False, "CUT command requires a timestamp."
            return True, "Valid CUT command."
        if operation.type == "TRIM":
            if not operation.target:
                return False, "TRIM command requires a target clip name."
            if "timestamp" not in operation.parameters:
                return False, "TRIM command requires a timestamp."
            return True, "Valid TRIM command."
        if operation.type == "ADD_TEXT":
            if "text" not in operation.parameters or not operation.parameters["text"]:
                return False, "ADD_TEXT command requires text."
            if "start" not in operation.parameters or "end" not in operation.parameters:
                return False, "ADD_TEXT command requires start and end times."
            return True, "Valid ADD_TEXT command."
        if operation.type == "JOIN":
            if not operation.target:
                return False, "JOIN command requires a first clip name."
            if "second" not in operation.parameters or not operation.parameters["second"]:
                return False, "JOIN command requires a second clip name."
            # Effect is optional
            return True, "Valid JOIN command."
        if operation.type == "OVERLAY":
            if "asset" not in operation.parameters or not operation.parameters["asset"]:
                return False, "OVERLAY command requires an asset (e.g., image or video file)."
            # Position, start, and end are optional
            return True, "Valid OVERLAY command."
        if operation.type == "FADE":
            if "direction" not in operation.parameters or not operation.parameters["direction"]:
                return False, "FADE command requires a direction (in or out)."
            if "target" not in operation.parameters or not operation.parameters["target"]:
                return False, "FADE command requires a target (audio, clip name, etc.)."
            # start and end are optional
            return True, "Valid FADE command."
        # Add more command type validations as needed
        if operation.type == "UNKNOWN":
            return False, "Unknown command type."
        return True, "Valid command."

    def feedback_for_command(self, command_text: str) -> str:
        """
        Provide user-friendly feedback for unclear or invalid commands.

        Args:
            command_text (str): The natural language command

        Returns:
            str: Feedback message for the user
        """
        operation = self.parse_command(command_text)
        is_valid, message = self.validate_command(operation)
        if is_valid:
            return f"✅ Command understood: {operation.type}. {message}"
        # Provide specific feedback for common unclear/invalid cases
        if operation.type == "UNKNOWN":
            return "❌ Sorry, I couldn't understand that command. Please check your syntax or refer to the command guide."
        return f"⚠️ Command issue: {message}"
