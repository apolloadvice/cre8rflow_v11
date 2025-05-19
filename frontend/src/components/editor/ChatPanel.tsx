import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot } from "lucide-react";
import { useCommand } from "@/hooks/useCommand";
import { useEditorStore } from "@/store/editorStore";
import { sendCommand } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  thinking?: boolean;
}

interface ChatPanelProps {
  onChatCommand: (command: string) => void;
  onVideoProcessed?: (videoUrl: string) => void; // New prop to handle processed video
}

const quickActions = [
  "Auto-Cut Silence",
  "Highlight Reel",
  "Add Subtitles",
  "Color Grade",
  "Sync to Music",
  "Cinematic Look",
  "Vertical Crop"
];

const ChatPanel = ({ onChatCommand, onVideoProcessed }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { executeCommand, isProcessing, logs, error } = useCommand();
  const clips = useEditorStore((state) => state.clips);
  const setClips = useEditorStore((state) => state.setClips);
  const { activeVideoAsset, setActiveVideoAsset } = useEditorStore();
  const { toast } = useToast();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    onChatCommand(input);
    setInput("");
    setIsThinking(true);

    // Ensure we pass only the file_path string
    const assetPath = activeVideoAsset?.file_path;
    console.log("activeVideoAsset", activeVideoAsset);
    console.log("file_path", activeVideoAsset?.file_path, typeof activeVideoAsset?.file_path);
    if (!assetPath || typeof assetPath !== "string" || assetPath.length < 5) {
      toast({ variant: "destructive", description: "No valid video selected or uploaded." });
      setIsThinking(false);
      return;
    }
    try {
      const response = await sendCommand(assetPath, input);
      toast({ description: "Edit applied ✔️" });

      // Update timeline state and UI with backend response
      if (response && response.timeline) {
        const newClips = [];
        const frameRate = response.timeline.frame_rate || 30;
        for (const track of response.timeline.tracks) {
          // Map track_type string to track index (optional, or keep as string)
          const trackType = track.track_type;
          for (const clip of track.clips) {
            newClips.push({
              id: clip.clip_id || clip.id || clip.name, // prefer clip_id
              start: typeof clip.start === 'number' ? clip.start / frameRate : 0,
              end: typeof clip.end === 'number' ? clip.end / frameRate : 0,
              track: typeof trackType === 'number' ? trackType : undefined, // or map to index if needed
              type: clip.type || trackType,
              name: clip.name,
              file_path: clip.file_path,
            });
          }
        }
        setClips(newClips);
      }
    } catch (err: any) {
      let message = "Unknown error";
      if (err?.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          message = err.response.data.detail.map((d: any) => d.msg).join(", ");
        } else {
          message = err.response.data.detail;
        }
      } else if (err?.message) {
        message = err.message;
      } else {
        message = JSON.stringify(err);
      }
      toast({ variant: "destructive", description: message });
    }
    setIsThinking(false);
  };

  const handleQuickAction = (action: string) => {
    const formattedAction = action.toLowerCase();
    setInput(`Apply ${formattedAction} to my video`);
  };

  return (
    <div className="h-full flex flex-col bg-cre8r-gray-800 border-l border-cre8r-gray-700">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-cre8r-violet/20 p-3 rounded-full mb-4">
              <Bot className="h-6 w-6 text-cre8r-violet" />
            </div>
            <h3 className="font-semibold mb-2">Tell me what edits to apply to your video</h3>
            <p className="text-sm text-cre8r-gray-400 mb-6">
              For example: "Trim silent parts", "Add cinematic color grade", or "Crop for vertical"
            </p>
            
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {quickActions.slice(0, 6).map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  className="border-cre8r-gray-600 hover:border-cre8r-violet hover:bg-cre8r-violet/10 justify-center"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </Button>
              ))}
              <Button
                variant="outline"
                className="border-cre8r-gray-600 hover:border-cre8r-violet hover:bg-cre8r-violet/10 justify-center col-span-2"
                onClick={() => handleQuickAction(quickActions[6])}
              >
                {quickActions[6]}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-lg p-3",
                  message.sender === "user"
                    ? "bg-cre8r-violet text-white self-end"
                    : "bg-cre8r-gray-700 text-white self-start"
                )}
              >
                {message.content}
              </div>
            ))}
            {isThinking && (
              <div className="bg-cre8r-gray-700 text-white self-start max-w-[90%] rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  <span className="ml-1 text-sm">Processing your edit request</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-3 border-t border-cre8r-gray-700">
        <div className="w-full flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {messages.length > 0 && quickActions.slice(0, 6).map((action, i) => (
              i < 6 && (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="border-cre8r-gray-600 hover:border-cre8r-violet hover:bg-cre8r-violet/10 justify-center text-xs h-8"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </Button>
              )
            ))}
          </div>
          <form className="flex w-full items-center gap-2" onSubmit={handleSubmit}>
            <Input
              placeholder="Tell me what edits to apply to your video..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-cre8r-gray-700 border-cre8r-gray-600 focus:border-cre8r-violet focus:ring-cre8r-violet"
              disabled={isProcessing || isThinking}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-cre8r-violet hover:bg-cre8r-violet-dark"
              disabled={!input.trim() || isProcessing || isThinking}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
