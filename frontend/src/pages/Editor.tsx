import { useEffect } from "react";
import NavBar from "@/components/NavBar";
import EditorToolbar from "@/components/editor/EditorToolbar";
import EditorContent from "@/components/editor/EditorContent";
import EditorSidebar from "@/components/editor/EditorSidebar";
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
      <div className="flex flex-1">
        <EditorSidebar />
        <div className="flex flex-col flex-1">
          <EditorToolbar activeVideoName={activeVideoAsset?.name} />
          <EditorContent />
        </div>
      </div>
    </div>
  );
};

export default Editor;
