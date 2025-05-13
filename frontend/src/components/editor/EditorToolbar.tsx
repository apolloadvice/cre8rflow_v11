
import { Film, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import UndoIcon from "@/components/icons/UndoIcon";
import RedoIcon from "@/components/icons/RedoIcon";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/store/editorStore";

interface EditorToolbarProps {
  activeVideoName?: string;
}

const EditorToolbar = ({ activeVideoName }: EditorToolbarProps) => {
  const { toast } = useToast();
  const { undo, redo, history } = useEditorStore();

  const handleSaveProject = () => {
    toast({
      title: "Project saved",
      description: "Your project has been saved successfully",
    });
  };

  const handleRenderVideo = () => {
    toast({
      title: "Rendering started",
      description: "Your video is now being rendered",
    });
  };

  return (
    <div className="flex justify-between items-center px-4 h-14 border-b border-cre8r-gray-700 bg-cre8r-gray-800">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-cre8r-violet rounded-full flex items-center justify-center">
          <Film className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold">
          {activeVideoName ? `Editing: ${activeVideoName}` : "Untitled Project"}
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="border-cre8r-gray-600 hover:border-cre8r-violet"
          onClick={() => undo()}
          disabled={history.past.length === 0}
        >
          <UndoIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="border-cre8r-gray-600 hover:border-cre8r-violet"
          onClick={() => redo()}
          disabled={history.future.length === 0}
        >
          <RedoIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="border-cre8r-gray-600 hover:border-cre8r-violet"
          onClick={handleSaveProject}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Project
        </Button>
        
        <Button
          className="bg-cre8r-violet hover:bg-cre8r-violet-dark"
          onClick={handleRenderVideo}
        >
          Render Video
        </Button>
      </div>
    </div>
  );
};

export default EditorToolbar;
