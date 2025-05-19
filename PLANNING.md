# NLP Video Editor Project Planning

## Current Status (2024-06-14)
- UI components for asset upload, timeline, and command input are present but not fully connected.
- Asset upload lacks persistent storage and metadata extraction (duration, resolution, etc.).
- Timeline drag-and-drop is incomplete; timeline does not visually represent clip duration or allow proper placement.
- Command parsing is basic; lacks robust NLP, error handling, and feedback.
- No visible processing feedback or step-by-step user guidance.
- Edits are not actually applied to timeline data or video; no real video processing or timeline update.
- Timeline and video playback do not update after edits; no real-time preview of changes.
- Minimal error/confirmation messages; no user guidance for failed or ambiguous actions.

## Limitations (2024-06-14)
- Workflow is incomplete: user can upload a video and type a command, but cannot fully realize the described editing scenario.
- Missing metadata and drag-and-drop support stop the flow early.
- NLP command parsing is rudimentary, limiting understanding of user instructions.
- No visible feedback during processing, making the system feel unresponsive.
- Edits are not actually applied, so the video and timeline don't update as expected.

## Roadmap & Next Steps (2024-06-14)
- Implement persistent asset management and metadata extraction
- Complete drag-and-drop and timeline clip creation with correct scaling
- Integrate robust NLP parser and map commands to timeline actions
- Add user feedback mechanisms (processing, confirmation, error)
- Implement timeline data updates and video processing backend
- Enable real-time timeline and video updates after edits
- Improve error handling and user guidance throughout the app
- Implement central state management for UI/backend sync
- Add asynchronous processing for video edits to avoid UI blocking

## UX/Feedback & Architectural Challenges (2024-06-14)
- Need for asynchronous processing for video edits (to avoid UI blocking)
- Centralized state management for UI and backend sync
- Error handling and user guidance for ambiguous or failed actions
- Step-by-step feedback, confirmation dialogs, and error messages as core UX features

## Intended End-to-End Workflow (2024-06-14)
1. Asset Upload: User uploads a video to an asset library; system extracts and stores metadata (duration, resolution, etc.).
2. Timeline Placement: User drags and drops video onto a timeline track, creating a clip with correct duration.
3. NLP Command: User enters a natural-language command (e.g., "cut from 00:05 to 00:10").
4. Processing Feedback: System provides visible feedback (e.g., "thinking...", step-by-step interpretation).
5. Apply Edit: Edit is applied to the timeline and video.
6. Real-Time Update: Timeline and video playback update immediately to reflect the edit.

**Current State:** Steps 1-3 are partially present (UI only); steps 4-6 are not functional.

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
  - Moving clips between tracks/positions (MOVE command, context-aware)

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

## Context Awareness & Natural Time Expressions (2024-06-13)
- All major commands (CUT, TRIM, JOIN, OVERLAY, FADE, ADD_TEXT) now support:
  - Contextual pronouns ("it", "that", "this", etc.)
  - Natural time expressions ("thirty seconds", "halfway through", etc.)
- Future commands (MOVE, DUPLICATE, DELETE, REPLACE, etc.) should follow this pattern for consistency and user experience.

- Improve natural language flexibility and context understanding
  - [x] Context awareness and natural time expressions for all major commands (2024-06-13)
  - [ ] Add context/time support for future commands (MOVE, DUPLICATE, DELETE, REPLACE, etc.)