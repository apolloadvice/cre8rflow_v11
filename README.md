# NLP Video Editor (Prototype)

This project is an NLP-based video editing tool that allows users to edit videos on a timeline using natural language commands.

## Current Status (2024-06-10)
- Core data structures (timeline, tracks, clips, effects, transitions) are robust, extensible, and fully tested.
- Compound/nested clips are supported, with recursive timeline operations (trim, join, remove, move, transitions).
- Serialization/deserialization is robust, versioned, and extensible (supports custom subclasses).
- Command parsing, validation, and execution are robust and tested for all major command types.
- **Parser and executor are now fully extensible and handler/plugin-based (2024-06-11).**
- **Group/compound (batch) operations (e.g., group cut) are now implemented and tested (2024-06-11).**

## Features
- Parse natural language commands (e.g., "Cut clip1 at 00:30")
- Represent video/audio clips on a timeline (with support for compound/nested clips)
- Map parsed commands to timeline operations (all operations work recursively)
- Modular Python codebase for easy extension (custom clips, effects, transitions)
- Robust, versioned JSON serialization/deserialization
- **Extensible command parser and executor (plugin/handler-based, easy addition of new command types, effects, transitions) (2024-06-11)**
- **Advanced/nested command support (e.g., group/batch operations like "cut all clips at 30s") is implemented and tested (2024-06-11)**
- **Command history, undo/redo, and session persistence (save/load) are implemented and fully tested (2024-06-12)**
- **Planned: Basic NLP enhancements for MVP:**
  - Command synonyms/variations (e.g., "split"/"divide"/"slice" for "cut")
  - Natural references (e.g., "this clip", "the clip before that one")
  - Context awareness (e.g., "now trim it")
  - Natural time expressions (e.g., "thirty seconds", "halfway through")
  - Combined commands (e.g., "cut and join")
- **Experimental: LLM (GPT) integration for NLP command parsing**
  - Use OpenAI API to parse and interpret natural language commands
  - Fallback to pattern-based parsing if LLM is ambiguous or fails
- **Planned: ffmpeg-based export/rendering pipeline for actual video editing**
  - All timeline operations (cut, trim, join, transitions, text, etc.) will be rendered using ffmpeg for speed and flexibility
  - MoviePy is optional and can be used for prototyping or preview only

## Tech Stack
- Python 3.8+
- [spaCy](https://spacy.io/) (NLP, entity extraction)
- Regex (command pattern matching and intent recognition)
- [ffmpeg-python](https://github.com/kkroening/ffmpeg-python) (primary backend for video processing)
- [MoviePy](https://zulko.github.io/moviepy/) (optional, for prototyping/preview only)
- (Optional, future) Hugging Face Transformers or Rasa for advanced intent classification

## Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd <repo-directory>
   ```
2. **Create a virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install spacy
   # For future video processing:
   pip install moviepy ffmpeg-python
   ```

## Running the Demo

The demo script shows how to parse and execute a sample command:

```bash
python src/demo.py
```

**Expected output:**
```
Loaded video: name=my_video, start=0.0, end=60.0
Trimmed my_video at 30s: True
Clip: name=my_video_part1, start=0.0, end=30.0
Clip: name=my_video_part2, start=30.0, end=60.0
Added transition between my_video_part1 and my_video_part2: True
Transition: crossfade from my_video_part1 to my_video_part2, duration=2.0
Joined my_video_part1 and my_video_part2: True
Clip: name=my_video_part1_joined_my_video_part2, start=0.0, end=60.0
Command: Cut clip1 at 00:30
Parsed Operation: type=CUT, target=clip1, parameters={'timestamp': '00:30'}
Execution Result: success=True, message=Cut operation on clip1 at 00:30

Command: Add text 'Introduction' at the top from 0:05 to 0:15
Parsed Operation: type=ADD_TEXT, target=None, parameters={'text': 'Introduction', 'position': 'top', 'start': '0:05', 'end': '0:15'}
Execution Result: success=True, message=Add text 'Introduction' with params {'text': 'Introduction', 'position': 'top', 'start': '0:05', 'end': '0:15'}
```

## Project Structure
- `src/command_parser.py` — NLP command parser
- `src/timeline.py` — Timeline and clip data structures
- `src/command_executor.py` — Command-to-edit bridge
- `src/demo.py` — Demo script

## Testing
Parser unit tests are included in `tests/test_command_parser.py` and all tests pass as of the latest update.

## Contributing
See `PLANNING.md` and `TASK.md` for architecture and task tracking.

## Supported Commands & Features
- Load a video file as a timeline clip (mocked duration)
- Trim (cut) a clip at a given timestamp
- Join two adjacent clips into one
- Add a transition (e.g., crossfade) between two adjacent clips
- Compound/nested clips: all timeline operations (trim, join, remove, move, transitions) work recursively
- Extensibility: custom clip/effect/transition subclasses are supported in serialization/deserialization
- `Cut clip1 at 00:30` (now supports full clip names)
- `Add text 'Introduction' at the top from 0:05 to 0:15` (improved text extraction)
- `Add Hello from 20 to 30 seconds`

## Extensibility
- The system is designed for easy extension:
  - Subclass `BaseClip`, `BaseEffect`, or `BaseTransition` to add new types
  - Custom subclasses are preserved through serialization/deserialization
  - See tests for examples of custom effect/clip support

## Command Structure & Examples

- See `docs/command_structure.md` for the syntax and structure of supported commands.
- See `docs/command_examples.md` for a dataset of example commands and their parsed outputs.

## Timeline Data Structure Design Principles

- **Multiple Track Types:** Supports multiple video, audio, subtitle, and effects tracks for flexible editing.
- **Sequential Clips:** Clips on the same track are sequential (non-overlapping) for simplicity; compound/nested clips planned for future phases.
- **Transitions as Objects:** Transitions are represented as dedicated objects connecting clips, not as clip properties.
- **Effects as Clip Properties:** Effects (e.g., speed, color correction) are stored as properties of clips.
- **Frame-Based Timing:** All timing is stored internally as frames (integer) for precision, with support for variable frame rates. UI accepts/displays both seconds and frames.
- **JSON Serialization:** Timeline structure is easily serializable to JSON for project saving/loading, with a version field for backward compatibility.
- **Extensibility:** Base classes/interfaces for tracks, clips, and effects allow for future extension and plugin support.

*Implementation will proceed incrementally, starting with the core data structures and expanding as needed.*

## What's Next
- Improve natural language flexibility and context understanding (see planned NLP enhancements above)
- **User-facing features: UI, command input, command history display, timeline visualization, undo/redo controls**
- **Planned: Implement ffmpeg-based export/rendering pipeline for timeline**
- Add referencing by content/position (e.g., "last clip", "clip with music")
- **Current limitations:**
  - Pattern-based command parsing (not true semantic NLP yet; LLM-based parsing is experimental)
  - Limited natural language flexibility (commands must follow specific patterns unless using LLM)
  - No support for referencing clips by content or position
  - No custom effect/transition creation via natural language
  - Limited error recovery and suggestions

---
*This is an early prototype. See `PLANNING.md` for roadmap and next steps.* 