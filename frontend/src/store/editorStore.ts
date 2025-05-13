
import { create } from 'zustand';
import { useEffect, useCallback } from 'react';
import { persist } from 'zustand/middleware';

export interface Clip {
  id: string;
  start: number;
  end: number;
  track: number;
  type: string;
  name: string;
}

interface EditorState {
  clips: Clip[];
  currentTime: number;
  duration: number;
  selectedClipId: string | null;
  activeVideoAsset: any | null;
  videoSrc: string | undefined;
  
  // Layout settings
  layout: {
    sidebar: number;
    preview: number;
    chat: number;
    timeline: number;
  };
  
  // History management
  history: {
    past: Omit<EditorState, 'history'>[];
    future: Omit<EditorState, 'history'>[];
  };
}

interface EditorStore extends EditorState {
  // Actions
  setClips: (clips: Clip[]) => void;
  addClip: (clip: Clip) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  deleteClip: (id: string) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSelectedClipId: (id: string | null) => void;
  setActiveVideoAsset: (asset: any | null) => void;
  setVideoSrc: (src: string | undefined) => void;
  
  // Layout actions
  setLayoutSize: (panel: keyof EditorState['layout'], size: number) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  
  // Computed
  recalculateDuration: () => void;
}

// Define StateWithoutHistory type that can be used for history entries
type StateWithoutHistory = Omit<EditorState, 'history'>;

// Clone state without circular references
const cloneState = (state: EditorState): StateWithoutHistory => {
  const { history, ...rest } = state;
  return {
    ...rest,
    clips: JSON.parse(JSON.stringify(state.clips)),
  };
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      clips: [],
      currentTime: 0,
      duration: 0,
      selectedClipId: null,
      activeVideoAsset: null,
      videoSrc: undefined,
      
      // Default layout sizes
      layout: {
        sidebar: 20, // 20% width
        preview: 65, // 65% of the right pane
        chat: 35,    // 35% of the right pane
        timeline: 25 // 25% height of the bottom section
      },
      
      // Initialize empty history
      history: {
        past: [],
        future: [],
      },
      
      // Actions
      setClips: (clips) => {
        set({ clips });
        get().recalculateDuration();
        get().pushToHistory();
      },
      
      addClip: (clip) => {
        set((state) => ({ clips: [...state.clips, clip] }));
        get().recalculateDuration();
        get().pushToHistory();
      },
      
      updateClip: (id, updates) => {
        set((state) => ({
          clips: state.clips.map((clip) => 
            clip.id === id ? { ...clip, ...updates } : clip
          ),
        }));
        get().recalculateDuration();
        get().pushToHistory();
      },
      
      deleteClip: (id) => {
        set((state) => ({
          clips: state.clips.filter((clip) => clip.id !== id),
        }));
        get().recalculateDuration();
        get().pushToHistory();
      },
      
      setCurrentTime: (time) => {
        set({ currentTime: time });
      },
      
      setDuration: (duration) => {
        set({ duration });
      },
      
      setSelectedClipId: (id) => {
        set({ selectedClipId: id });
      },
      
      setActiveVideoAsset: (asset) => {
        set({ activeVideoAsset: asset });
      },
      
      setVideoSrc: (src) => {
        set({ videoSrc: src });
      },
      
      // Layout actions
      setLayoutSize: (panel, size) => {
        set((state) => ({
          layout: {
            ...state.layout,
            [panel]: size
          }
        }));
      },
      
      // History actions
      pushToHistory: () => {
        const currentStateWithoutHistory = cloneState(get());
        
        set((state) => ({
          history: {
            past: [...state.history.past, currentStateWithoutHistory],
            future: [],
          }
        }));
      },
      
      undo: () => {
        const { history } = get();
        const { past, future } = history;
        
        if (past.length === 0) return;
        
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        
        // Save current state to future (without history)
        const currentStateWithoutHistory = cloneState(get());
        
        set({
          ...(previous as Partial<EditorState>),
          history: {
            past: newPast,
            future: [currentStateWithoutHistory, ...future],
          },
        });
      },
      
      redo: () => {
        const { history } = get();
        const { past, future } = history;
        
        if (future.length === 0) return;
        
        const next = future[0];
        const newFuture = future.slice(1);
        
        // Save current state to past (without history)
        const currentStateWithoutHistory = cloneState(get());
        
        set({
          ...(next as Partial<EditorState>),
          history: {
            past: [...past, currentStateWithoutHistory],
            future: newFuture,
          },
        });
      },
      
      // Computed functions
      recalculateDuration: () => {
        const { clips } = get();
        if (clips.length === 0) return;
        
        const maxEnd = Math.max(...clips.map(clip => clip.end));
        set({ duration: maxEnd });
      },
    }),
    {
      name: 'cre8r-editor-storage',
      partialize: (state) => ({
        layout: state.layout,
      }),
    }
  )
);

// Selector hooks
export const useCurrentTime = () => useEditorStore((state) => state.currentTime);
export const useDuration = () => useEditorStore((state) => state.duration);
export const useClips = () => useEditorStore((state) => state.clips);
export const useSelectedClip = () => useEditorStore((state) => state.selectedClipId);
export const useLayout = () => useEditorStore((state) => state.layout);
export const useLayoutSetter = () => useEditorStore((state) => state.setLayoutSize);

// Create a hook for keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const { undo, redo, deleteClip, selectedClipId, setSelectedClipId } = useEditorStore();
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Undo: Ctrl/Cmd + Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    
    // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
    
    // Delete selected clip: Backspace or Delete key
    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedClipId) {
      e.preventDefault();
      deleteClip(selectedClipId);
      setSelectedClipId(null);
    }
  }, [undo, redo, deleteClip, selectedClipId, setSelectedClipId]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
