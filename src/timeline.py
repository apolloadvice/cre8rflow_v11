from typing import List, Dict, Optional
import os
from enum import Enum
import json
from abc import ABC, abstractmethod

class TrackType(Enum):
    VIDEO = "video"
    AUDIO = "audio"
    SUBTITLE = "subtitle"
    EFFECT = "effect"

class BaseClip(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """
        Serialize this clip to a dictionary representation.
        Returns:
            dict: Serialized representation of the clip.
        """
        pass

    @staticmethod
    @abstractmethod
    def from_dict(data: dict) -> 'BaseClip':
        """
        Deserialize a clip from a dictionary representation.
        Args:
            data (dict): Serialized representation of the clip.
        Returns:
            BaseClip: The deserialized clip instance.
        """
        pass

    @abstractmethod
    def apply_effects(self) -> None:
        """
        Apply all effects to this clip (placeholder for future processing).
        """
        pass

class VideoClip(BaseClip):
    """
    Represents a video or audio clip on the timeline.
    start and end are in frames (integer), not seconds.
    """
    def __init__(self, name: str, start_frame: int, end_frame: int, track_type: str = "video"):
        self.name: str = name
        self.start: int = int(start_frame)  # in frames
        self.end: int = int(end_frame)      # in frames
        self.track_type: str = track_type
        self.effects: list = []  # List[Effect]

    def add_effect(self, effect: 'Effect') -> None:
        """
        Add an Effect to this clip.
        Args:
            effect (Effect): The effect to add.
        """
        self.effects.append(effect)

    def remove_effect(self, effect_type: str) -> None:
        """
        Remove all effects of the given type from this clip.
        Args:
            effect_type (str): The type of effect to remove.
        """
        self.effects = [e for e in self.effects if e.effect_type != effect_type]

    def as_seconds(self, timeline: 'Timeline') -> tuple:
        """
        Return (start_sec, end_sec) for this clip using the given timeline's frame rate.
        Args:
            timeline (Timeline): The timeline for frame rate reference.
        Returns:
            tuple: (start_sec, end_sec)
        """
        return (self.start / timeline.frame_rate, self.end / timeline.frame_rate)

    def to_dict(self) -> dict:
        """
        Serialize this VideoClip to a dictionary representation.
        Returns:
            dict: Serialized representation of the VideoClip.
        """
        return {
            "_type": self.__class__.__name__,
            "name": self.name,
            "start": self.start,
            "end": self.end,
            "track_type": self.track_type,
            "effects": [effect.to_dict() for effect in self.effects]
        }

    @staticmethod
    def from_dict(data: dict) -> 'VideoClip':
        """
        Deserialize a VideoClip (or subclass) from a dictionary representation.
        Args:
            data (dict): Serialized representation of the VideoClip.
        Returns:
            VideoClip: The deserialized VideoClip instance.
        """
        # Extensible: support custom subclasses via _type
        cls = globals().get(data.get("_type", "VideoClip"), VideoClip)
        clip = cls(
            name=data["name"],
            start_frame=data["start"],
            end_frame=data["end"],
            track_type=data.get("track_type", "video")
        )
        clip.effects = [Effect.from_dict(e) for e in data.get("effects", [])]
        return clip

    def apply_effects(self) -> None:
        """
        Apply all effects to this clip (placeholder for future processing).
        """
        for effect in self.effects:
            effect.apply(self)

class CompoundClip(BaseClip):
    """
    A clip that contains other clips (including other CompoundClips), allowing for grouped/nested editing.
    start and end are in frames (integer), and always reflect the bounds of all contained clips.
    """
    def __init__(self, name: str, start_frame: int, end_frame: int, track_type: str = "video", clips: Optional[list] = None):
        """
        Initialize a CompoundClip.
        Args:
            name (str): Name of the compound clip
            start_frame (int): Start frame (will be recalculated if clips are provided)
            end_frame (int): End frame (will be recalculated if clips are provided)
            track_type (str): Track type (e.g., 'video', 'audio')
            clips (Optional[list]): List of BaseClip instances to include
        """
        self.name = name
        self.start = int(start_frame)
        self.end = int(end_frame)
        self.track_type = track_type
        self.effects: list = []
        self.clips: list = []  # List[BaseClip]
        if clips is not None:
            for c in clips:
                self.add_clip(c)

    def add_clip(self, clip: BaseClip) -> None:
        """
        Add a clip to this compound clip.
        Args:
            clip (BaseClip): The clip to add
        Raises:
            TypeError: If the clip is not a BaseClip instance
        """
        if not isinstance(clip, BaseClip):
            raise TypeError("CompoundClip can only contain BaseClip instances.")
        self.clips.append(clip)
        self.recalculate_bounds()

    def remove_clip(self, clip: BaseClip) -> None:
        """
        Remove a clip from this compound clip.
        Args:
            clip (BaseClip): The clip to remove
        """
        self.clips.remove(clip)
        self.recalculate_bounds()

    def get_clips(self) -> list:
        """
        Return the list of contained clips.
        Returns:
            list: List of BaseClip instances
        """
        return self.clips

    def recalculate_bounds(self) -> None:
        """
        Update start and end to match the bounds of all contained clips.
        """
        if self.clips:
            self.start = min(clip.start for clip in self.clips)
            self.end = max(clip.end for clip in self.clips)

    def flatten_clips(self) -> list:
        """
        Recursively yield all contained clips (including nested ones).
        Returns:
            list: Flat list of all contained BaseClip instances (including nested)
        """
        result = []
        for clip in self.clips:
            if isinstance(clip, CompoundClip):
                result.extend(clip.flatten_clips())
            else:
                result.append(clip)
        return result

    def contains_clip(self, target) -> bool:
        """
        Check if a clip (by name or reference) is contained in this compound clip (recursively).
        Args:
            target (str or BaseClip): Clip name or instance to search for
        Returns:
            bool: True if found, False otherwise
        """
        for clip in self.clips:
            if isinstance(target, str):
                if getattr(clip, 'name', None) == target:
                    return True
            elif clip is target:
                return True
            if isinstance(clip, CompoundClip):
                if clip.contains_clip(target):
                    return True
        return False

    def to_dict(self) -> dict:
        """
        Serialize this compound clip (and all contained clips) to a dictionary.
        Returns:
            dict: Serialized representation
        """
        return {
            "_type": self.__class__.__name__,
            "name": self.name,
            "start": self.start,
            "end": self.end,
            "track_type": self.track_type,
            "effects": [effect.to_dict() for effect in self.effects],
            "clips": [clip.to_dict() for clip in self.clips],
        }

    @staticmethod
    def from_dict(data: dict) -> 'CompoundClip':
        """
        Deserialize a CompoundClip (including nested/custom subclasses) from a dictionary.
        Args:
            data (dict): Serialized representation
        Returns:
            CompoundClip: The deserialized instance
        """
        # Support nested compound clips and extensibility
        clips = []
        for c in data.get("clips", []):
            clip_type = c.get("_type", "VideoClip")
            # Dynamic class lookup for extensibility
            cls = globals().get(clip_type, VideoClip)
            clips.append(cls.from_dict(c))
        compound = CompoundClip(
            name=data["name"],
            start_frame=data["start"],
            end_frame=data["end"],
            track_type=data.get("track_type", "video"),
            clips=clips
        )
        compound.effects = [Effect.from_dict(e) for e in data.get("effects", [])]
        return compound

    def apply_effects(self) -> None:
        """
        Apply all effects to this compound clip and recursively to all contained clips.
        """
        for effect in self.effects:
            effect.apply(self)
        for clip in self.clips:
            clip.apply_effects()

class BaseTrack(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """
        Serialize this track to a dictionary representation.
        Returns:
            dict: Serialized representation of the track.
        """
        pass

    @staticmethod
    @abstractmethod
    def from_dict(data: dict) -> 'BaseTrack':
        """
        Deserialize a track from a dictionary representation.
        Args:
            data (dict): Serialized representation of the track.
        Returns:
            BaseTrack: The deserialized track instance.
        """
        pass

    @abstractmethod
    def add_clip(self, clip: 'BaseClip', position: float = None) -> None:
        """
        Add a clip to this track at the specified position.
        Args:
            clip (BaseClip): The clip to add.
            position (float, optional): The position to add the clip at. If None, appends to end.
        """
        pass

class Track(BaseTrack):
    """
    Represents a single track (video, audio, subtitle, or effect) on the timeline.
    """
    def __init__(self, name: str, track_type: str):
        self.name: str = name  # e.g., "Video 1", "Audio 2", "Subtitles", "Effects"
        self.track_type: str = track_type  # Should be one of TrackType values
        self.clips: list = []  # List[Clip] or List[Effect] or List[Subtitle]

    def add_clip(self, clip: 'BaseClip', position: float = None) -> None:
        """
        Add a clip to this track at the specified position, enforcing sequential order.
        Args:
            clip (BaseClip): The clip to add.
            position (float, optional): The position to add the clip at. If None, appends to end.
        Raises:
            ValueError: If the position is not sequential with the last clip.
        """
        duration = clip.end - clip.start  # Store original duration first!
        if self.clips:
            last_end = self.clips[-1].end
            if position is not None:
                if abs(position - last_end) > 1e-6:
                    raise ValueError("Clips must be sequential; position must match end of last clip.")
                clip.start = position
            else:
                clip.start = last_end
            clip.end = clip.start + duration
        else:
            clip.start = 0.0 if position is None else position
            clip.end = clip.start + duration
        self.clips.append(clip)

    def to_dict(self) -> dict:
        """
        Serialize this Track to a dictionary representation.
        Returns:
            dict: Serialized representation of the Track.
        """
        return {
            "_type": self.__class__.__name__,
            "name": self.name,
            "track_type": self.track_type,
            "clips": [clip.to_dict() for clip in self.clips]
        }

    @staticmethod
    def from_dict(data: dict) -> 'Track':
        """
        Deserialize a Track (or subclass) from a dictionary representation.
        Args:
            data (dict): Serialized representation of the Track.
        Returns:
            Track: The deserialized Track instance.
        """
        # Extensible: support custom subclasses via _type
        cls = globals().get(data.get("_type", "Track"), Track)
        track = cls(name=data["name"], track_type=data["track_type"])
        clips = []
        for c in data.get("clips", []):
            clip_type = c.get("_type", "VideoClip")
            clip_cls = globals().get(clip_type, VideoClip)
            clips.append(clip_cls.from_dict(c))
        track.clips = clips
        return track

class BaseTransition(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """
        Serialize this transition to a dictionary representation.
        Returns:
            dict: Serialized representation of the transition.
        """
        pass

    @staticmethod
    @abstractmethod
    def from_dict(data: dict) -> 'BaseTransition':
        """
        Deserialize a transition from a dictionary representation.
        Args:
            data (dict): Serialized representation of the transition.
        Returns:
            BaseTransition: The deserialized transition instance.
        """
        pass

class Transition(BaseTransition):
    """
    Represents a transition between two clips on the timeline.
    """
    def __init__(self, from_clip: str, to_clip: str, transition_type: str = "crossfade", duration: float = 1.0):
        self.from_clip: str = from_clip
        self.to_clip: str = to_clip
        self.transition_type: str = transition_type
        self.duration: float = duration

    def to_dict(self) -> dict:
        """
        Serialize this Transition to a dictionary representation.
        Returns:
            dict: Serialized representation of the Transition.
        """
        return {
            "_type": self.__class__.__name__,
            "from_clip": self.from_clip,
            "to_clip": self.to_clip,
            "transition_type": self.transition_type,
            "duration": self.duration
        }

    @staticmethod
    def from_dict(data: dict) -> 'Transition':
        """
        Deserialize a Transition (or subclass) from a dictionary representation.
        Args:
            data (dict): Serialized representation of the Transition.
        Returns:
            Transition: The deserialized Transition instance.
        """
        # Extensible: support custom subclasses via _type
        cls = globals().get(data.get("_type", "Transition"), Transition)
        return cls(
            from_clip=data["from_clip"],
            to_clip=data["to_clip"],
            transition_type=data.get("transition_type", "crossfade"),
            duration=data.get("duration", 1.0)
        )

class BaseEffect(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """
        Serialize this effect to a dictionary representation.
        Returns:
            dict: Serialized representation of the effect.
        """
        pass

    @staticmethod
    @abstractmethod
    def from_dict(data: dict) -> 'BaseEffect':
        """
        Deserialize an effect from a dictionary representation.
        Args:
            data (dict): Serialized representation of the effect.
        Returns:
            BaseEffect: The deserialized effect instance.
        """
        pass

    @abstractmethod
    def apply(self, clip: 'BaseClip') -> None:
        """
        Apply the effect to a clip (placeholder for future processing).
        Args:
            clip (BaseClip): The clip to which the effect should be applied.
        """
        pass

class Effect(BaseEffect):
    """
    Represents an effect applied to a clip (e.g., speed, color correction, blur).
    """
    def __init__(self, effect_type: str, params: dict = None):
        self.effect_type: str = effect_type
        self.params: dict = params or {}

    def to_dict(self) -> dict:
        """
        Serialize this Effect to a dictionary representation.
        Returns:
            dict: Serialized representation of the Effect.
        """
        return {
            "_type": self.__class__.__name__,
            "effect_type": self.effect_type,
            "params": self.params
        }

    @staticmethod
    def from_dict(data: dict) -> 'Effect':
        """
        Deserialize an Effect (or subclass) from a dictionary representation.
        Args:
            data (dict): Serialized representation of the Effect.
        Returns:
            Effect: The deserialized Effect instance.
        """
        # Extensible: support custom subclasses via _type
        cls = globals().get(data.get("_type", "Effect"), Effect)
        return cls(
            effect_type=data["effect_type"],
            params=data.get("params", {})
        )

    def apply(self, clip: 'BaseClip') -> None:
        """
        Apply the effect to a clip (placeholder for future processing).
        Args:
            clip (BaseClip): The clip to which the effect should be applied.
        """
        # Placeholder: actual effect logic would go here
        pass

class Timeline:
    """
    Represents a video editing timeline with multiple tracks and clips.
    """
    def __init__(self, frame_rate: float = 30.0):
        """
        Initialize an empty timeline with default tracks for video, audio, subtitle, and effects.
        frame_rate: frames per second (used for all time/frame conversions)
        """
        self.tracks: List[Track] = [
            Track(name="Video 1", track_type=TrackType.VIDEO.value),
            Track(name="Audio 1", track_type=TrackType.AUDIO.value),
            Track(name="Subtitles", track_type=TrackType.SUBTITLE.value),
            Track(name="Effects", track_type=TrackType.EFFECT.value),
        ]
        self.duration: float = 0.0
        self.transitions: list[Transition] = []
        self.frame_rate: float = frame_rate

    def add_clip(self, clip: VideoClip, track_index: int = 0, position: Optional[float] = None) -> None:
        """
        Add a clip to the timeline at the specified position using the track's sequential enforcement.

        Args:
            clip (VideoClip): The clip to add
            track_index (int): The track index to add the clip to
            position (float, optional): Position in seconds. If None, appends to end.
        """
        track = self.tracks[track_index]
        track.add_clip(clip, position=position)
        self.duration = max(self.duration, clip.end)

    def load_video(self, file_path: str, track_index: int = 0, position: Optional[float] = None) -> VideoClip:
        """
        Load a video file and add it as a clip to the timeline.
        For now, this mocks the duration (e.g., 60s) and uses the file name as the clip name.

        Args:
            file_path (str): Path to the video file
            track_index (int): Track to add the clip to
            position (float, optional): Position in seconds. If None, appends to end.

        Returns:
            VideoClip: The created video clip
        """
        name = os.path.splitext(os.path.basename(file_path))[0]
        # TODO: Use MoviePy to get real duration
        duration = 60.0
        clip = VideoClip(name=name, start_frame=0, end_frame=duration)
        self.add_clip(clip, track_index=track_index, position=position)
        return clip

    def _update_ancestor_bounds(self, track, parent_list):
        """
        Recursively update bounds for all ancestor CompoundClips whose .clips is parent_list.
        """
        def update_recursive(container, target_list):
            if isinstance(container, CompoundClip) and container.clips is target_list:
                container.recalculate_bounds()
                return True
            if isinstance(container, CompoundClip):
                for child in container.clips:
                    if update_recursive(child, target_list):
                        container.recalculate_bounds()
                        return True
            return False
        for top in track.clips:
            update_recursive(top, parent_list)

    def trim_clip(self, clip_name: str, timestamp: float, track_type: str = "video", track_index: int = 0) -> bool:
        """
        Trim (cut) a clip at the given timestamp, splitting it into two clips.
        Now supports recursively finding the clip inside nested CompoundClips.

        Args:
            clip_name (str): Name of the clip to trim
            timestamp (float): Time in seconds to cut at
            track_type (str): Type of track (e.g., 'video', 'audio', etc.)
            track_index (int): Track index to search for the clip

        Returns:
            bool: True if the clip was trimmed, False if not found or invalid
        """
        track = self.get_track(track_type, track_index)
        parent, idx, clip = self._find_clip_recursive(track.clips, clip_name)
        if clip is not None and clip.start < timestamp < clip.end:
            duration1 = timestamp - clip.start
            duration2 = clip.end - timestamp
            first = type(clip)(name=clip.name + "_part1", start_frame=clip.start, end_frame=clip.start + duration1)
            second = type(clip)(name=clip.name + "_part2", start_frame=timestamp, end_frame=timestamp + duration2)
            parent.pop(idx)
            parent.insert(idx, second)
            parent.insert(idx, first)
            self._update_ancestor_bounds(track, parent)
            return True
        return False

    def join_clips(self, first_clip_name: str, second_clip_name: str, track_type: str = "video", track_index: int = 0) -> bool:
        """
        Join two adjacent clips into a single clip by merging their time ranges and names.
        Now supports recursively finding the clips inside nested CompoundClips.

        Args:
            first_clip_name (str): Name of the first clip
            second_clip_name (str): Name of the second (must be immediately after the first)
            track_type (str): Type of track (e.g., 'video', 'audio', etc.)
            track_index (int): Track index to search for the clips

        Returns:
            bool: True if the clips were joined, False if not found or not adjacent
        """
        track = self.get_track(track_type, track_index)
        # Find first clip
        parent, idx, first = self._find_clip_recursive(track.clips, first_clip_name)
        if first is not None and idx is not None and idx + 1 < len(parent):
            second = parent[idx + 1]
            if getattr(second, 'name', None) == second_clip_name:
                if abs(first.end - second.start) < 1e-6:
                    joined_name = f"{first.name}_joined_{second.name}"
                    joined_clip = type(first)(
                        name=joined_name,
                        start_frame=first.start,
                        end_frame=second.end
                    )
                    # Replace the two clips with the joined clip
                    parent.pop(idx + 1)
                    parent.pop(idx)
                    parent.insert(idx, joined_clip)
                    self._update_ancestor_bounds(track, parent)
                    return True
        return False

    def add_transition(self, from_clip_name: str, to_clip_name: str, transition_type: str = "crossfade", duration: float = 1.0, track_type: str = "video", track_index: int = 0) -> bool:
        """
        Add a transition between two adjacent clips, even if nested inside CompoundClips.

        Args:
            from_clip_name (str): Name of the first (outgoing) clip
            to_clip_name (str): Name of the second (incoming) clip
            transition_type (str): Type of transition (e.g., 'crossfade')
            duration (float): Duration of the transition in seconds
            track_type (str): Type of track (e.g., 'video', 'audio', etc.)
            track_index (int): Track index to search for the clips

        Returns:
            bool: True if the transition was added, False if clips not found or not adjacent
        """
        track = self.get_track(track_type, track_index)
        parent, idx, first = self._find_clip_recursive(track.clips, from_clip_name)
        if first is not None and idx is not None and idx + 1 < len(parent):
            second = parent[idx + 1]
            if getattr(second, 'name', None) == to_clip_name:
                if abs(first.end - second.start) < 1e-6:
                    transition = Transition(from_clip=from_clip_name, to_clip=to_clip_name, transition_type=transition_type, duration=duration)
                    self.transitions.append(transition)
                    return True
        return False

    def get_track(self, track_type: str, index: int = 0) -> Track:
        """
        Return the nth track of the given type (e.g., 'video', 'audio', etc.).
        Raises IndexError if not found.
        """
        matches = [t for t in self.tracks if t.track_type == track_type]
        if not matches or index >= len(matches):
            raise IndexError(f"No track of type {track_type} at index {index}")
        return matches[index]

    def remove_clip(self, clip_name: str, track_type: str = "video", track_index: int = 0) -> bool:
        """
        Remove the first clip with the given name from the specified track (recursively, including inside CompoundClips).
        Returns True if removed, False if not found.
        """
        track = self.get_track(track_type, track_index)
        parent, idx, clip = self._find_clip_recursive(track.clips, clip_name)
        if clip is not None:
            parent.pop(idx)
            self._update_ancestor_bounds(track, parent)
            return True
        return False

    def remove_clip_by_index(self, clip_index: int, track_type: str = "video", track_index: int = 0) -> bool:
        """
        Remove the clip at the given index from the specified track, recursively (depth-first, pre-order).
        Returns True if removed, False if index is out of range.
        """
        track = self.get_track(track_type, track_index)
        # Helper to flatten all clips with their parent list and index
        def flatten_clips(clips, parent):
            result = []
            for i, clip in enumerate(clips):
                result.append((parent, i, clip))
                if isinstance(clip, CompoundClip):
                    result.extend(flatten_clips(clip.clips, clip.clips))
            return result
        flat = flatten_clips(track.clips, track.clips)
        if 0 <= clip_index < len(flat):
            parent, idx, _ = flat[clip_index]
            parent.pop(idx)
            self._update_ancestor_bounds(track, parent)
            return True
        return False

    def move_clip(
        self,
        clip_name: str,
        source_track_type: str = "video",
        source_track_index: int = 0,
        dest_track_type: str = "video",
        dest_track_index: int = 0,
        dest_position: float = None
    ) -> bool:
        """
        Move a clip by name from one track (or nested compound) to another (or to a different position in the same track).
        Returns True if moved, False if not found.
        """
        source_track = self.get_track(source_track_type, source_track_index)
        parent, idx, clip = self._find_clip_recursive(source_track.clips, clip_name)
        if clip is not None:
            # Remove from source
            clip_to_move = parent.pop(idx)
            self._update_ancestor_bounds(source_track, parent)
            # Update track_type for destination
            clip_to_move.track_type = dest_track_type
            # Add to destination
            dest_track = self.get_track(dest_track_type, dest_track_index)
            dest_track.add_clip(clip_to_move, position=dest_position)
            return True
        return False

    def add_track(self, name: str, track_type: str, index: int = None) -> 'Track':
        """
        Add a new track of the given type and name. If index is given, insert at that position; otherwise, append.
        Returns the new Track object.
        Raises ValueError if track_type is not valid.
        """
        valid_types = {t.value for t in TrackType}
        if track_type not in valid_types:
            raise ValueError(f"Invalid track_type: {track_type}")
        new_track = Track(name=name, track_type=track_type)
        if index is None:
            self.tracks.append(new_track)
        else:
            self.tracks.insert(index, new_track)
        return new_track

    def remove_track(self, index: int = None, track_type: str = None, track_index: int = 0) -> bool:
        """
        Remove a track by index or by (track_type, track_index).
        If only index is given, remove the track at that index.
        If track_type is given, remove the nth track of that type.
        Returns True if removed, False if not found.
        """
        if track_type is not None:
            matches = [i for i, t in enumerate(self.tracks) if t.track_type == track_type]
            if len(matches) > track_index:
                self.tracks.pop(matches[track_index])
                return True
            return False
        elif index is not None:
            if 0 <= index < len(self.tracks):
                self.tracks.pop(index)
                return True
            return False
        else:
            raise ValueError("Must provide either index or track_type.")

    def frames_to_seconds(self, frames: int) -> float:
        """Convert frames to seconds using this timeline's frame rate."""
        return frames / self.frame_rate

    def seconds_to_frames(self, seconds: float) -> int:
        """Convert seconds to frames using this timeline's frame rate."""
        return int(round(seconds * self.frame_rate))

    def to_dict(self) -> dict:
        """
        Serialize this Timeline to a dictionary representation.
        Returns:
            dict: Serialized representation of the Timeline.
        """
        return {
            "_type": self.__class__.__name__,
            "version": "1.0",
            "frame_rate": self.frame_rate,
            "tracks": [track.to_dict() for track in self.tracks],
            "transitions": [t.to_dict() for t in self.transitions]
        }

    @staticmethod
    def from_dict(data: dict) -> 'Timeline':
        """
        Deserialize a Timeline from a dictionary representation.
        Args:
            data (dict): Serialized representation of the Timeline.
        Returns:
            Timeline: The deserialized Timeline instance.
        """
        timeline = Timeline(frame_rate=data.get("frame_rate", 30.0))
        timeline.tracks = [Track.from_dict(t) for t in data.get("tracks", [])]
        timeline.transitions = [Transition.from_dict(tr) for tr in data.get("transitions", [])]
        # Optionally store version if you want to use it later
        timeline.version = data.get("version", "1.0")
        return timeline

    def to_json(self) -> str:
        """
        Serialize this Timeline to a JSON string.
        Returns:
            str: JSON string representation of the Timeline.
        """
        return json.dumps(self.to_dict(), indent=2)

    @staticmethod
    def from_json(json_str: str) -> 'Timeline':
        """
        Deserialize a Timeline from a JSON string.
        Args:
            json_str (str): JSON string representation of the Timeline.
        Returns:
            Timeline: The deserialized Timeline instance.
        """
        data = json.loads(json_str)
        return Timeline.from_dict(data)

    def _find_clip_recursive(self, clips, target_name):
        """
        Recursively search for a clip by name in a list of clips (including inside CompoundClip).
        Returns (parent_container, index, clip) for the first match, or (None, None, None) if not found.
        parent_container is the list (track.clips or compound.clips) containing the found clip.
        """
        for i, clip in enumerate(clips):
            if getattr(clip, 'name', None) == target_name:
                return (clips, i, clip)
            if isinstance(clip, CompoundClip):
                found = self._find_clip_recursive(clip.clips, target_name)
                if found[2] is not None:
                    return found
        return (None, None, None)
