
import { useEffect } from "react";
import NavBar from "@/components/NavBar";
import EditorToolbar from "@/components/editor/EditorToolbar";
import EditorContent from "@/components/editor/EditorContent";
import { useEditorStore, useKeyboardShortcuts } from "@/store/editorStore";
import { useThumbnails } from "@/hooks/useThumbnails";

const Editor = () => {
  // Setup keyboard shortcuts
  useKeyboardShortcuts();
  
  // Get active video from store
  const { activeVideoAsset } = useEditorStore();
  
  // Integrate thumbnails hook
  const { thumbnailData } = useThumbnails(activeVideoAsset?.id);

  return (
    <div className="flex flex-col h-screen bg-cre8r-dark text-white">
      <NavBar />
      <EditorToolbar activeVideoName={activeVideoAsset?.name} />
      <EditorContent />
    </div>
  );
};

export default Editor;
