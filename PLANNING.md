# NLP Video Editor Project Planning

## Current Status (2024-06-10)
- Core data structures (timeline, tracks, clips, effects, transitions) are robust, extensible, and fully tested.
- Compound/nested clips are supported, with recursive timeline operations (trim, join, remove, move, transitions).
- Serialization/deserialization is robust, versioned, and extensible (supports custom subclasses).
- Command parsing, validation, and execution are robust and tested for all major command types.
- **Parser and executor are now fully extensible and handler/plugin-based (2024-06-11).**
- **Group/compound (batch) operations (e.g., group cut) are now implemented and tested (2024-06-11).**
- **Planned:** Improved natural language flexibility, referencing by content/position, and user-facing features (UI, undo/redo, batch/group operations).

## Roadmap & Next Steps (2024-06-11)
- Improve natural language flexibility and context understanding
  - Planned basic NLP enhancements for MVP:
    - Command synonyms/variations (e.g., "split", "divide", "slice" for "cut")
    - Natural references (e.g., "this clip", "the clip before that one")
    - Context awareness (e.g., "now trim it")
    - Natural time expressions (e.g., "thirty seconds", "halfway through")
    - Combined commands (e.g., "cut and join")
  - **Experimental: Integrate LLM (GPT) for NLP command parsing (OpenAI API, fallback to pattern-based parsing)**
- **Planned: Implement ffmpeg-based export/rendering pipeline for timeline (primary backend for video processing)**
  - All timeline operations (cut, trim, join, transitions, text, etc.) will be rendered using ffmpeg for speed and flexibility
  - MoviePy is optional and can be used for prototyping or preview only
- Add referencing by content/position (e.g., "last clip", "clip with music")
- Develop user-facing features: UI, undo/redo, batch/group operations, timeline visualization

## Current User-Facing Limitations
- Pattern-based command parsing (not true semantic NLP yet; LLM-based parsing is experimental)
- Limited natural language flexibility (commands must follow specific patterns unless using LLM)
- No support for referencing clips by content or position
- No custom effect/transition creation via natural language
- Limited error recovery and suggestions

## Project Overview

The NLP Video Editor is a specialized tool that enables users to edit video clips using natural language commands. Acting as a "cursor for video editing," this tool will interpret user instructions and apply corresponding editing actions to videos on a timeline, significantly reducing the manual workload of traditional video editing.

## Project Scope

### Core Functionality
- Natural language command interpretation for video editing actions
- Command execution on video timeline
- Basic video editing operations:
  - Cutting/trimming
  - Joining/merging clips
  - Applying transitions
  - Adjusting speed
  - Adding text/captions
  - Basic color correction
  - Audio adjustments

### User Experience
- Command input interface (text field)
- Command feedback system
- Visual timeline representation
- Preview window
- Command history

### Out of Scope (Initial Version)
- Advanced effects and compositing
- Motion graphics templates
- Multi-user collaboration
- Complex AI-generated content

## Technical Architecture

### Frontend
- **Framework Options:**
  - React.js with TypeScript (recommended for UI responsiveness)
  - Electron (for desktop application)
- **Video Processing:**
  - WebAssembly for browser-based video manipulation
  - FFmpeg.wasm for video transcoding and processing
  - MoviePy and ffmpeg-python for core editing operations
  - Video loading functionality is now implemented (mocked duration, file name as clip name)
  - Clip trimming (cutting), joining, and basic transition operations are now implemented and demoed
- **UI Components:**
  - Timeline view with zooming capabilities
  - Command input area with suggestions
  - Video preview panel
  - Resource browser

### Backend
- **NLP Processing:**
  - Fine-tuned language model for video editing domain
  - Command parser to convert natural language to editing operations
  - Intent recognition system
- **Video Processing Engine:**
  - Non-destructive editing layer
  - Video encoding/decoding
  - Frame-accurate editing
- **Optional Server Components:**
  - API for more intensive processing
  - Cloud storage for projects

### Data Flow
1. User inputs natural language command
2. NLP system interprets command into structured editing intent
3. Command validator checks feasibility
4. Editing engine applies changes to timeline
5. Timeline and preview update with changes
6. Command and result are stored in history

## Development Approach

### Phase 1: Proof of Concept
- Implement basic NLP command parsing
- Create simplified timeline interface
- Support fundamental operations (cut, trim, join)
- Build basic feedback system

### Phase 2: Core Functionality
- Expand command vocabulary
- Implement all core editing operations
- Improve UI/UX based on testing
- Optimize performance

### Phase 3: Refinement
- Add command suggestions
- Implement command history and undo/redo
- Enhance error handling and user guidance
- Add export options

## Technology Stack Recommendations

### NLP Processing
- **Options:**
  - Hugging Face Transformers (BERT, RoBERTa, etc.)
  - OpenAI API (GPT models)
  - Local models like Llama or Mistral (open-source)
  - Custom trained model on video editing commands

### Video Processing
- **Libraries:**
  - FFmpeg (via ffmpeg-python, primary backend for video processing)
  - MoviePy (optional, for prototyping/preview only)
  - FFmpeg.wasm for browser-based transcoding (future)
  - WebCodecs API (for modern browsers)
  - MLT Framework

### Frontend
- React.js + TypeScript
- Redux or Context API for state management
- Styled-components or Tailwind CSS

### Development Tools
- Jest for testing
- ESLint for code quality
- GitHub Actions for CI/CD

## Testing Strategy

### Unit Testing
- Command parsing accuracy
- Editing operation correctness
- Timeline manipulation

### User Testing
- Command naturalness
- Editing efficiency compared to traditional methods
- Learning curve measurements

## Challenges and Considerations

### Technical Challenges
- Accurate parsing of ambiguous commands
- Performance optimization for video processing
- Managing complex timeline operations
- Cross-platform compatibility

### UX Challenges
- Training users to phrase commands effectively
- Providing helpful feedback for unsuccessful commands
- Balancing NLP flexibility with predictable behavior

## Success Metrics

- Command interpretation accuracy rate
- Task completion time compared to traditional editors
- User satisfaction scores
- Learning curve duration

## Future Expansion Possibilities

- Voice command support
- AI-suggested edits based on content
- Template-based editing
- Multi-language support
- Plugin system for extensibility
- Mobile version

### Technical Architecture

- **NLP:** Initial implementation uses spaCy for command parsing, with regex and custom intent classification for fallback. Now supports 'add text' commands with time and position extraction, and improved parsing for full clip names. Parser unit tests are in place and passing.
- **Video Processing:** MoviePy and ffmpeg-python will be evaluated and used for core editing operations. Video loading functionality is now implemented (mocked duration, file name as clip name). Clip trimming (cutting), joining, and basic transition operations are now implemented and demoed.
- **Code Structure:** Modular Python code, following project rules for separation, testing, and documentation.

### Documentation
- Command structure and examples are documented in `docs/command_structure.md` and `docs/command_examples.md`.

### NLP Library/Service Selection
- The project uses **spaCy** for entity extraction and tokenization, and **regex** for high-precision command pattern matching and intent recognition.
- This approach is lightweight, fast, and easy to maintain for a well-defined command set.
- If more flexible or ambiguous command parsing is needed in the future, the system can be extended with **Hugging Face Transformers** (for ML-based intent classification) or **Rasa NLU** (for conversational/intent/entity extraction).

## Timeline Data Structure Design Principles

- **Multiple Track Types:** Supports multiple video, audio, subtitle, and effects tracks for flexible editing.
- **Sequential Clips:** Clips on the same track are sequential (non-overlapping) for simplicity; compound/nested clips planned for future phases.
- **Transitions as Objects:** Transitions are represented as dedicated objects connecting clips, not as clip properties.
- **Effects as Clip Properties:** Effects (e.g., speed, color correction) are stored as properties of clips.
- **Frame-Based Timing:** All timing is stored internally as frames (integer) for precision, with support for variable frame rates. UI accepts/displays both seconds and frames.
- **JSON Serialization:** Timeline structure is easily serializable to JSON for project saving/loading, with a version field for backward compatibility.
- **Extensibility:** Base classes/interfaces for tracks, clips, and effects allow for future extension and plugin support.

*Implementation will proceed incrementally, starting with the core data structures and expanding as needed.*