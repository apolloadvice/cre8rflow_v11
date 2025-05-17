import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot } from "lucide-react";
import { useCommand } from "@/hooks/useCommand";
import { useEditorStore } from "@/store/editorStore";

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

    // Build the correct timeline structure for the backend
    const timeline = {
      tracks: [
        {
          track_type: "video",
          clips: clips.map(clip => ({
            ...(clip as any),
            _type: (clip as any)._type || "VideoClip",
            effects: (clip as any).effects || [],
          })),
        },
      ],
      frame_rate: 30.0,
      version: "1.0",
      transitions: [],
    };

    // Pass both input and timeline to executeCommand
    const result = await executeCommand(input, timeline);

    setIsThinking(false);

    // Update clips if backend returns a new timeline with clips
    if (result?.timeline?.tracks?.[0]?.clips) {
      setClips(result.timeline.tracks[0].clips);
    }

    // If we have a processed video URL, send it to parent component
    // (No longer needed, as backend does not return videoUrl)

    const responseContent = result?.message
      ? result.message
      : "I processed your request but couldn't apply any edits.";

    const responseMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      sender: "assistant",
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, responseMessage]);
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
