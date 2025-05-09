import pytest
from src.command_parser import CommandParser

# Labeled dataset: (command, expected_entities)
# expected_entities is a dict with keys: clip_names, timecodes, effects
ENTITY_TEST_CASES = [
    ("Cut clip1 at 00:30", {"clip_names": ["clip1"], "timecodes": ["00:30"], "effects": []}),
    ("Trim the start of clip2 to 00:10", {"clip_names": ["clip2"], "timecodes": ["00:10"], "effects": []}),
    ("Join clip1 and clip2 with a crossfade", {"clip_names": ["clip1", "clip2"], "timecodes": [], "effects": ["crossfade"]}),
    ("Add text 'Intro' at the top from 0:05 to 0:15", {"clip_names": [], "timecodes": ["0:05", "0:15"], "effects": []}),
    ("Overlay logo.png at the top right from 10s to 20s", {"clip_names": [], "timecodes": ["10s", "20s"], "effects": []}),
    ("Fade out audio at the end of the timeline", {"clip_names": [], "timecodes": [], "effects": ["fade"]}),
    ("Apply color correction to clip3", {"clip_names": ["clip3"], "timecodes": [], "effects": ["color correction"]}),
    ("Export the project as mp4", {"clip_names": [], "timecodes": [], "effects": []}),
    ("Make it sparkle!", {"clip_names": [], "timecodes": [], "effects": []}),
    ("Cut at 00:30", {"clip_names": [], "timecodes": ["00:30"], "effects": []}),  # missing clip name
    ("Join with a crossfade", {"clip_names": [], "timecodes": [], "effects": ["crossfade"]}),  # missing clip names
]


def test_entity_extraction_accuracy():
    parser = CommandParser()
    correct = 0
    for command, expected in ENTITY_TEST_CASES:
        extracted = parser.extract_entities(command)
        # Compare sets for clip_names, timecodes, effects
        match = (
            set(extracted.get("clip_names", [])) == set(expected.get("clip_names", [])) and
            set(extracted.get("timecodes", [])) == set(expected.get("timecodes", [])) and
            set(extracted.get("effects", [])) == set(expected.get("effects", []))
        )
        if match:
            correct += 1
        else:
            print(f"Entity mismatch: '{command}'\n  Extracted: {extracted}\n  Expected: {expected}")
    accuracy = correct / len(ENTITY_TEST_CASES)
    print(f"Entity extraction accuracy: {accuracy:.2%} ({correct}/{len(ENTITY_TEST_CASES)})")
    # Assert at least 90% accuracy for now (adjust as needed)
    assert accuracy >= 0.9 