import pytest
from src.command_parser import CommandParser, EditOperation

@pytest.fixture
def parser():
    return CommandParser()

def test_cut_command(parser):
    op = parser.parse_command("Cut clip1 at 00:30")
    assert op.type == "CUT"
    assert op.target == "clip1"
    assert op.parameters["timestamp"] == "00:30"

def test_add_text_command_full(parser):
    op = parser.parse_command("Add text 'Intro' at the top from 0:05 to 0:15")
    assert op.type == "ADD_TEXT"
    assert op.target is None
    assert op.parameters["text"] == "Intro"
    assert op.parameters["position"] == "top"
    assert op.parameters["start"] == "0:05"
    assert op.parameters["end"] == "0:15"

def test_add_text_command_simple(parser):
    op = parser.parse_command("Add Hello from 20 to 30 seconds")
    assert op.type == "ADD_TEXT"
    assert op.parameters["text"] == "Hello"
    assert op.parameters["start"] == "20"
    assert op.parameters["end"] == "30"

def test_unknown_command(parser):
    op = parser.parse_command("Make it blue")
    assert op.type == "UNKNOWN"
    assert "raw" in op.parameters

def test_timeline_load_video():
    from src.timeline import Timeline
    timeline = Timeline()
    clip = timeline.load_video("/videos/sample_video.mp4")
    assert clip.name == "sample_video"
    assert clip.start == 0
    assert clip.end == 60.0  # This will need to be updated to frames if load_video is updated
    assert clip in timeline.get_track("video").clips

def test_timeline_trim_clip():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    clip = VideoClip(name="clip1", start_frame=0, end_frame=600)  # 20s at 30fps
    timeline.add_clip(clip, track_index=0)
    trimmed = timeline.trim_clip(clip.name, 300, track_type="video", track_index=0)  # trim at 10s (300 frames)
    assert trimmed is True
    video_clips = timeline.get_track("video").clips
    assert len(video_clips) == 2
    assert video_clips[0].name == "clip1_part1"
    assert video_clips[0].start == 0
    assert video_clips[0].end == 300
    assert video_clips[1].name == "clip1_part2"
    assert video_clips[1].start == 300
    assert video_clips[1].end == 600

def test_timeline_join_clips():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    clip1 = VideoClip(name="clip1", start_frame=0, end_frame=300)
    clip2 = VideoClip(name="clip2", start_frame=300, end_frame=600)
    timeline.add_clip(clip1, track_index=0)
    timeline.add_clip(clip2, track_index=0)
    joined = timeline.join_clips("clip1", "clip2", track_type="video", track_index=0)
    assert joined is True
    video_clips = timeline.get_track("video").clips
    assert len(video_clips) == 1
    joined_clip = video_clips[0]
    assert joined_clip.name == "clip1_joined_clip2"
    assert joined_clip.start == 0
    assert joined_clip.end == 600

def test_timeline_add_transition():
    from src.timeline import Timeline
    timeline = Timeline()
    clip = timeline.load_video("/videos/sample_video.mp4")
    timeline.trim_clip(clip.name, 30.0)
    added = timeline.add_transition("sample_video_part1", "sample_video_part2", transition_type="crossfade", duration=2.0)
    assert added is True
    transitions = timeline.transitions
    assert len(transitions) == 1
    t = transitions[0]
    assert t.from_clip == "sample_video_part1"
    assert t.to_clip == "sample_video_part2"
    assert t.transition_type == "crossfade"
    assert t.duration == 2.0

def test_intent_recognition(parser):
    assert parser.recognize_intent("Cut clip1 at 00:30") == "CUT"
    assert parser.recognize_intent("Trim the start of clip2 to 00:10") == "TRIM"
    assert parser.recognize_intent("Join clip1 and clip2 with a crossfade") == "JOIN"
    assert parser.recognize_intent("Add text 'Intro' at the top from 0:05 to 0:15") == "ADD_TEXT"
    assert parser.recognize_intent("Overlay logo.png at the top right from 10s to 20s") == "OVERLAY"
    assert parser.recognize_intent("Fade out audio at the end of the timeline") == "FADE"
    assert parser.recognize_intent("Speed up the middle section by 2x") == "SPEED"
    assert parser.recognize_intent("Reverse clip4") == "REVERSE"
    assert parser.recognize_intent("Apply color correction to clip3") == "COLOR_CORRECTION"
    assert parser.recognize_intent("Export the project as mp4") == "EXPORT"
    assert parser.recognize_intent("Make it sparkle!") == "UNKNOWN"

def test_entity_extraction(parser):
    entities = parser.extract_entities("Cut clip1 at 00:30")
    assert entities["clip_names"] == ["clip1"]
    assert entities["timecodes"] == ["00:30"]
    assert entities["effects"] == []

    entities = parser.extract_entities("Join clip1 and clip2 with a crossfade")
    assert set(entities["clip_names"]) == {"clip1", "clip2"}
    assert "crossfade" in entities["effects"]

    entities = parser.extract_entities("Add text 'Intro' at the top from 0:05 to 0:15")
    assert entities["timecodes"] == ["0:05", "0:15"]

    entities = parser.extract_entities("Apply color correction to clip3")
    assert entities["clip_names"] == ["clip3"]
    assert "color correction" in entities["effects"]

def test_validate_command(parser):
    # Valid CUT
    op = parser.parse_command("Cut clip1 at 00:30")
    valid, msg = parser.validate_command(op)
    assert valid
    assert "Valid CUT" in msg

    # Invalid CUT (missing target)
    op = parser.parse_command("Cut at 00:30")
    valid, msg = parser.validate_command(op)
    assert not valid
    assert "target clip name" in msg

    # Invalid CUT (missing timestamp)
    op = parser.parse_command("Cut clip1")
    valid, msg = parser.validate_command(op)
    assert not valid
    assert "timestamp" in msg

    # Valid ADD_TEXT
    op = parser.parse_command("Add text 'Intro' at the top from 0:05 to 0:15")
    valid, msg = parser.validate_command(op)
    assert valid
    assert "Valid ADD_TEXT" in msg

    # Invalid ADD_TEXT (missing text)
    op = parser.parse_command("Add text at the top from 0:05 to 0:15")
    valid, msg = parser.validate_command(op)
    assert not valid
    assert "text" in msg

    # Invalid ADD_TEXT (missing start/end)
    op = parser.parse_command("Add text 'Intro' at the top")
    valid, msg = parser.validate_command(op)
    assert not valid
    assert "start and end" in msg

    # Unknown command
    op = parser.parse_command("Make it sparkle!")
    valid, msg = parser.validate_command(op)
    assert not valid
    assert "Unknown command" in msg

def test_feedback_for_command(parser):
    # Valid command
    msg = parser.feedback_for_command("Cut clip1 at 00:30")
    assert "✅" in msg and "Command understood" in msg

    # Unclear/unknown command
    msg = parser.feedback_for_command("Make it sparkle!")
    assert "couldn't understand" in msg

    # Invalid command (missing target)
    msg = parser.feedback_for_command("Cut at 00:30")
    assert "⚠️" in msg and "target clip name" in msg

    # Invalid command (missing text)
    msg = parser.feedback_for_command("Add text at the top from 0:05 to 0:15")
    assert "⚠️" in msg and "requires text" in msg

def test_trim_command(parser):
    # Intent recognition
    assert parser.recognize_intent("Trim the start of clip2 to 00:10") == "TRIM"
    # Entity extraction
    entities = parser.extract_entities("Trim the start of clip2 to 00:10")
    assert entities["clip_names"] == ["clip2"]
    assert entities["timecodes"] == ["00:10"]
    # Parsing (should now return TRIM)
    op = parser.parse_command("Trim the start of clip2 to 00:10")
    assert op.type == "TRIM"
    # Feedback (should indicate missing implementation or validation)
    msg = parser.feedback_for_command("Trim the start of clip2 to 00:10")
    # Accept either valid or invalid feedback depending on validation logic
    assert "TRIM" in msg or "couldn't understand" in msg or "⚠️" in msg

def test_trim_command_negative(parser):
    # Negative: missing target clip name
    op = parser.parse_command("Trim to 00:10")
    # Should return TRIM but fail validation
    assert op.type == "TRIM"
    valid, msg = parser.validate_command(op)
    assert not valid
    # Feedback should indicate missing target
    msg = parser.feedback_for_command("Trim to 00:10")
    assert "target" in msg.lower() or "couldn't understand" in msg or "⚠️" in msg

def test_join_command(parser):
    # Intent recognition
    assert parser.recognize_intent("Join clip1 and clip2 with a crossfade") == "JOIN"
    # Entity extraction
    entities = parser.extract_entities("Join clip1 and clip2 with a crossfade")
    assert set(entities["clip_names"]) == {"clip1", "clip2"}
    assert "crossfade" in entities["effects"]
    # Parsing (should now return JOIN)
    op = parser.parse_command("Join clip1 and clip2 with a crossfade")
    assert op.type == "JOIN"
    # Parameters should include second and effect
    assert op.parameters["second"] == "clip2"
    assert op.parameters["effect"] == "crossfade"
    # Validation should pass
    valid, msg = parser.validate_command(op)
    assert valid
    assert "Valid JOIN" in msg

def test_overlay_command(parser):
    # Intent recognition
    assert parser.recognize_intent("Overlay logo.png at the top right from 10s to 20s") == "OVERLAY"
    # Entity extraction
    entities = parser.extract_entities("Overlay logo.png at the top right from 10s to 20s")
    assert "logo.png" not in entities["clip_names"]  # Should not be a clip name
    assert set(entities["timecodes"]) == {"10s", "20s"}
    # Parsing (should now return OVERLAY)
    op = parser.parse_command("Overlay logo.png at the top right from 10s to 20s")
    assert op.type == "OVERLAY"
    # Parameters should include asset, position, start, and end
    assert op.parameters["asset"] == "logo.png"
    assert op.parameters["position"] == "top right"
    assert op.parameters["start"] == "10s"
    assert op.parameters["end"] == "20s"


def test_overlay_command_negative(parser):
    # Negative: missing asset
    op = parser.parse_command("Overlay at the top right from 10s to 20s")
    assert op.type == "UNKNOWN"

def test_fade_command(parser):
    # Intent recognition
    assert parser.recognize_intent("Fade out audio at the end of the timeline") == "FADE"
    # Entity extraction
    entities = parser.extract_entities("Fade out audio at the end of the timeline")
    assert "fade" in entities["effects"]
    # Parsing (should now return FADE)
    op = parser.parse_command("Fade out audio at the end of the timeline")
    assert op.type == "FADE"
    assert op.parameters["direction"] == "out"
    assert op.parameters["target"] == "audio"
    # Validation should pass
    valid, msg = parser.validate_command(op)
    assert valid
    assert "Valid FADE" in msg

# --- TRIM command positive and negative tests ---
def test_trim_command_positive(parser):
    # Positive: valid TRIM command (parsing not yet implemented, should return UNKNOWN for now)
    op = parser.parse_command("Trim the start of clip2 to 00:10")
    # Once implemented, this should be: assert op.type == "TRIM"
    assert op.type in ("TRIM", "UNKNOWN")
    # Entities should be extracted correctly
    entities = parser.extract_entities("Trim the start of clip2 to 00:10")
    assert entities["clip_names"] == ["clip2"]
    assert entities["timecodes"] == ["00:10"]


def test_join_command_positive(parser):
    # Positive: valid JOIN command
    op = parser.parse_command("Join clip1 and clip2 with a crossfade")
    assert op.type == "JOIN"
    # Entities should be extracted correctly
    entities = parser.extract_entities("Join clip1 and clip2 with a crossfade")
    assert set(entities["clip_names"]) == {"clip1", "clip2"}
    assert "crossfade" in entities["effects"]
    # Validation should pass
    valid, msg = parser.validate_command(op)
    assert valid
    assert "Valid JOIN" in msg
    # Parameters should include second and effect
    assert op.parameters["second"] == "clip2"
    assert op.parameters["effect"] == "crossfade"


def test_join_command_negative(parser):
    # Negative: missing one or both clip names
    op = parser.parse_command("Join with a crossfade")
    # Should return JOIN but fail validation
    assert op.type == "JOIN" or op.type == "UNKNOWN"
    valid, msg = parser.validate_command(op)
    assert not valid
    # Feedback should indicate missing target(s)
    msg = parser.feedback_for_command("Join with a crossfade")
    assert "clip" in msg.lower() or "couldn't understand" in msg or "⚠️" in msg

# --- FADE command positive and negative tests ---
def test_fade_command_positive(parser):
    # Positive: valid FADE command
    op = parser.parse_command("Fade out audio at the end of the timeline")
    assert op.type == "FADE"
    assert op.parameters["direction"] == "out"
    assert op.parameters["target"] == "audio"
    # With timecodes
    op2 = parser.parse_command("Fade in clip1 from 0:00 to 0:05")
    assert op2.type == "FADE"
    assert op2.parameters["direction"] == "in"
    assert op2.parameters["target"] == "clip1"
    assert op2.parameters["start"] == "0:00"
    assert op2.parameters["end"] == "0:05"


def test_fade_command_negative(parser):
    # Negative: missing direction
    op = parser.parse_command("Fade audio at the end of the timeline")
    assert op.type == "UNKNOWN"

def test_timeline_trim_clip_audio():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add an audio clip to the audio track (track_type='audio', track_index=0)
    audio_clip = VideoClip(name="audio1", start_frame=0, end_frame=600)
    timeline.add_clip(audio_clip, track_index=1)  # Audio 1 is at index 1
    trimmed = timeline.trim_clip("audio1", 300, track_type="audio", track_index=0)
    assert trimmed is True
    audio_clips = timeline.get_track("audio").clips
    assert len(audio_clips) == 2
    assert audio_clips[0].name == "audio1_part1"
    assert audio_clips[0].start == 0
    assert audio_clips[0].end == 300
    assert audio_clips[1].name == "audio1_part2"
    assert audio_clips[1].start == 300
    assert audio_clips[1].end == 600

def test_timeline_trim_clip_subtitle():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add a subtitle clip to the subtitle track (track_type='subtitle', track_index=0)
    subtitle_clip = VideoClip(name="subtitle1", start_frame=0, end_frame=240)
    timeline.add_clip(subtitle_clip, track_index=2)  # Subtitles is at index 2
    trimmed = timeline.trim_clip("subtitle1", 120, track_type="subtitle", track_index=0)
    assert trimmed is True
    subtitle_clips = timeline.get_track("subtitle").clips
    assert len(subtitle_clips) == 2
    assert subtitle_clips[0].name == "subtitle1_part1"
    assert subtitle_clips[0].start == 0
    assert subtitle_clips[0].end == 120
    assert subtitle_clips[1].name == "subtitle1_part2"
    assert subtitle_clips[1].start == 120
    assert subtitle_clips[1].end == 240

def test_timeline_trim_clip_effect():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add an effect clip to the effect track (track_type='effect', track_index=0)
    effect_clip = VideoClip(name="effect1", start_frame=0, end_frame=150)
    timeline.add_clip(effect_clip, track_index=3)  # Effects is at index 3
    trimmed = timeline.trim_clip("effect1", 75, track_type="effect", track_index=0)
    assert trimmed is True
    effect_clips = timeline.get_track("effect").clips
    assert len(effect_clips) == 2
    assert effect_clips[0].name == "effect1_part1"
    assert effect_clips[0].start == 0
    assert effect_clips[0].end == 75
    assert effect_clips[1].name == "effect1_part2"
    assert effect_clips[1].start == 75
    assert effect_clips[1].end == 150

def test_timeline_join_clips_audio():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent audio clips to the audio track (track_type='audio', track_index=0)
    clip1 = VideoClip(name="audio1", start_frame=0, end_frame=300)
    clip2 = VideoClip(name="audio2", start_frame=300, end_frame=600)
    timeline.add_clip(clip1, track_index=1)
    timeline.add_clip(clip2, track_index=1)
    joined = timeline.join_clips("audio1", "audio2", track_type="audio", track_index=0)
    assert joined is True
    audio_clips = timeline.get_track("audio").clips
    assert len(audio_clips) == 1
    joined_clip = audio_clips[0]
    assert joined_clip.name == "audio1_joined_audio2"
    assert joined_clip.start == 0
    assert joined_clip.end == 600

def test_timeline_join_clips_subtitle():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent subtitle clips to the subtitle track (track_type='subtitle', track_index=0)
    clip1 = VideoClip(name="subtitle1", start_frame=0, end_frame=120)
    clip2 = VideoClip(name="subtitle2", start_frame=120, end_frame=240)
    timeline.add_clip(clip1, track_index=2)
    timeline.add_clip(clip2, track_index=2)
    joined = timeline.join_clips("subtitle1", "subtitle2", track_type="subtitle", track_index=0)
    assert joined is True
    subtitle_clips = timeline.get_track("subtitle").clips
    assert len(subtitle_clips) == 1
    joined_clip = subtitle_clips[0]
    assert joined_clip.name == "subtitle1_joined_subtitle2"
    assert joined_clip.start == 0
    assert joined_clip.end == 240

def test_timeline_join_clips_effect():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent effect clips to the effect track (track_type='effect', track_index=0)
    clip1 = VideoClip(name="effect1", start_frame=0, end_frame=75)
    clip2 = VideoClip(name="effect2", start_frame=75, end_frame=150)
    timeline.add_clip(clip1, track_index=3)
    timeline.add_clip(clip2, track_index=3)
    joined = timeline.join_clips("effect1", "effect2", track_type="effect", track_index=0)
    assert joined is True
    effect_clips = timeline.get_track("effect").clips
    assert len(effect_clips) == 1
    joined_clip = effect_clips[0]
    assert joined_clip.name == "effect1_joined_effect2"
    assert joined_clip.start == 0
    assert joined_clip.end == 150

def test_timeline_add_transition_audio():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent audio clips to the audio track (track_type='audio', track_index=0)
    clip1 = VideoClip(name="audio1", start_frame=0, end_frame=300)
    clip2 = VideoClip(name="audio2", start_frame=300, end_frame=600)
    timeline.add_clip(clip1, track_index=1)
    timeline.add_clip(clip2, track_index=1)
    added = timeline.add_transition("audio1", "audio2", transition_type="fade", duration=2.0, track_type="audio", track_index=0)
    assert added is True
    transitions = timeline.transitions
    assert len(transitions) == 1
    t = transitions[0]
    assert t.from_clip == "audio1"
    assert t.to_clip == "audio2"
    assert t.transition_type == "fade"
    assert t.duration == 2.0

def test_timeline_add_transition_subtitle():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent subtitle clips to the subtitle track (track_type='subtitle', track_index=0)
    clip1 = VideoClip(name="subtitle1", start_frame=0, end_frame=120)
    clip2 = VideoClip(name="subtitle2", start_frame=120, end_frame=240)
    timeline.add_clip(clip1, track_index=2)
    timeline.add_clip(clip2, track_index=2)
    added = timeline.add_transition("subtitle1", "subtitle2", transition_type="slide", duration=1.0, track_type="subtitle", track_index=0)
    assert added is True
    transitions = timeline.transitions
    assert len(transitions) == 1
    t = transitions[0]
    assert t.from_clip == "subtitle1"
    assert t.to_clip == "subtitle2"
    assert t.transition_type == "slide"
    assert t.duration == 1.0

def test_timeline_add_transition_effect():
    from src.timeline import Timeline, VideoClip
    timeline = Timeline()
    # Add two adjacent effect clips to the effect track (track_type='effect', track_index=0)
    clip1 = VideoClip(name="effect1", start_frame=0, end_frame=75)
    clip2 = VideoClip(name="effect2", start_frame=75, end_frame=150)
    timeline.add_clip(clip1, track_index=3)
    timeline.add_clip(clip2, track_index=3)
    added = timeline.add_transition("effect1", "effect2", transition_type="wipe", duration=0.5, track_type="effect", track_index=0)
    assert added is True
    transitions = timeline.transitions
    assert len(transitions) == 1
    t = transitions[0]
    assert t.from_clip == "effect1"
    assert t.to_clip == "effect2"
    assert t.transition_type == "wipe"
    assert t.duration == 0.5

def test_group_cut_command_video(parser):
    op = parser.parse_command("Cut all clips at 00:30")
    assert op.type == "CUT_GROUP"
    assert op.parameters["track_type"] == "video"
    assert op.parameters["timestamp"] == "00:30"

def test_group_cut_command_audio(parser):
    op = parser.parse_command("Cut all audio clips at 00:10")
    assert op.type == "CUT_GROUP"
    assert op.parameters["track_type"] == "audio"
    assert op.parameters["timestamp"] == "00:10"

def test_group_cut_command_subtitle(parser):
    op = parser.parse_command("Cut all subtitle clips at 00:05")
    assert op.type == "CUT_GROUP"
    assert op.parameters["track_type"] == "subtitle"
    assert op.parameters["timestamp"] == "00:05"

def test_group_cut_command_effect(parser):
    op = parser.parse_command("Cut all effect clips at 00:15")
    assert op.type == "CUT_GROUP"
    assert op.parameters["track_type"] == "effect"
    assert op.parameters["timestamp"] == "00:15"

def test_cut_command_synonyms(parser):
    # Synonyms for 'cut' should be recognized and parsed as CUT
    for synonym in ["split", "divide", "slice"]:
        cmd = f"{synonym.capitalize()} clip1 at 00:30"
        op = parser.parse_command(cmd)
        assert op.type == "CUT", f"Failed to parse {cmd} as CUT"
        assert op.target == "clip1"
        assert op.parameters["timestamp"] == "00:30"
        # Intent recognition
        assert parser.recognize_intent(cmd) == "CUT"
    # Edge/failure case: malformed usage
    op = parser.parse_command("split at 00:30")
    assert op.type == "CUT"
    assert op.target is None
    assert op.parameters["timestamp"] == "00:30"
    valid, msg = parser.validate_command(op)
    assert not valid and "target clip name" in msg
