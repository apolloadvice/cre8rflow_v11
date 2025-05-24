import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot } from "lucide-react";
import { useCommand } from "@/hooks/useCommand";
import { useEditorStore } from "@/store/editorStore";
import { parseCommand } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { simulateCutCommand, simulateOptimisticEdit } from "@/utils/optimisticEdit";

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
  const [status, setStatus] = useState<string | null>(null); // New: step-by-step status
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { executeCommand, isProcessing, logs, error } = useCommand();
  const clips = useEditorStore((state) => state.clips);
  const setClips = useEditorStore((state) => state.setClips);
  const { activeVideoAsset, setActiveVideoAsset } = useEditorStore();
  const { toast } = useToast();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Helper to summarize parsed command in friendly language
  function summarizeParsed(parsed: any, userInput: string): string {
    if (!parsed) return "";
    if (Array.isArray(parsed)) {
      return parsed.map((p) => summarizeParsed(p, userInput)).join(" and ");
    }
    switch (parsed.action) {
      case "cut":
        return `cut out the part from ${parsed.start} to ${parsed.end} seconds`;
      case "add_text":
        return `add text '${parsed.text}' from ${parsed.start} to ${parsed.end} seconds${parsed.position ? ` at the ${parsed.position}` : ""}`;
      case "overlay":
        return `overlay '${parsed.asset}' from ${parsed.start} to ${parsed.end} seconds${parsed.position ? ` in the ${parsed.position}` : ""}`;
      default:
        return userInput;
    }
  }

  // Helper to generate a varied final assistant message
  function getCompletionMessage(summary: string): string {
    const completions = [
      (s: string) => `All done! I ${s}, just like you asked. What would you like to edit next?`,
      (s: string) => `Finished! Your edit (${s}) is complete. Need anything else?`,
      (s: string) => `That's done: I ${s}. What's your next edit?`,
      (s: string) => `I've made the change: ${s}. What would you like to do now?`,
      (s: string) => `Edit complete! I ${s}. Ready for another change?`,
      (s: string) => `Done! I ${s}. Let me know what you'd like to do next.`,
      (s: string) => `Your edit is finished: ${s}. What else can I help with?`,
      (s: string) => `I've taken care of it: ${s}. Want to make another edit?`,
    ];
    const idx = Math.floor(Math.random() * completions.length);
    return completions[idx](summary);
  }

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
    setIsThinking(true);
    setStatus("Got it! Let me figure out what you want to do…");

    // Ensure we pass only the file_path string
    const assetPath = activeVideoAsset?.file_path;
    if (!assetPath || typeof assetPath !== "string" || assetPath.length < 5) {
      setStatus(null);
      toast({ variant: "destructive", description: "No valid video selected or uploaded." });
      setIsThinking(false);
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-assistant",
        content: "I couldn't find a valid video to edit. Please upload or select a video first.",
        sender: "assistant",
        timestamp: new Date(),
      }]);
      return;
    }

    // Step 1: Parsing
    setStatus("I'm reading your instructions…");
    const { parsed, error } = await parseCommand(input, assetPath);
    if (error) {
      setStatus(null);
      toast({ variant: "destructive", description: error });
      setIsThinking(false);
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-assistant",
        content: `Hmm, I couldn't understand that. Could you rephrase? (${error})`,
        sender: "assistant",
        timestamp: new Date(),
      }]);
      return;
    }
    if (!parsed) {
      setStatus(null);
      setIsThinking(false);
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-assistant",
        content: `Hmm, I couldn't understand that. Could you rephrase?`,
        sender: "assistant",
        timestamp: new Date(),
      }]);
      return;
    }

    // Step 2: Show what was understood
    const summary = summarizeParsed(parsed, input);
    setStatus(`I understood: ${summary.charAt(0).toUpperCase() + summary.slice(1)}.`);
    await new Promise((res) => setTimeout(res, 400)); // brief pause for UX
    setStatus("Applying your edit to the video…");

    // --- Optimistic UI update disabled since backend returns complete timeline ---
    // const prevClips = [...clips];
    // const optimisticClips = simulateOptimisticEdit(input, clips);
    // let optimisticallyUpdated = false;
    // if (optimisticClips !== clips) {
    //   setClips(optimisticClips);
    //   optimisticallyUpdated = true;
    // }
    // --- End optimistic update ---

    try {
      // Let useAICommands handle the backend communication instead of duplicate API calls
      // This prevents the timeline disappearing issue that was caused by:
      // 1. ChatPanel optimistic edit adding clips
      // 2. ChatPanel calling sendCommand directly  
      // 3. useAICommands.handleChatCommand also calling sendCommand via executeCommand
      // 4. Both responses trying to update timeline, causing conflicts
      console.log("🎬 [ChatPanel] Calling onChatCommand with:", input);
      await onChatCommand(input);
      
      setStatus(null);
      setIsThinking(false);
      toast({ description: "Edit applied ✔️" });
      setInput(""); // Clear input after success
      
      // Final assistant message
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-assistant",
        content: getCompletionMessage(summary),
        sender: "assistant",
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      console.error("🎬 [ChatPanel] Error during command processing:", err);
      setStatus(null);
      setIsThinking(false);
      
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
      
      // Revert optimistic edit if there was an error
      // if (optimisticallyUpdated) {
      //   console.log("🎬 [ChatPanel] Reverting optimistic edit due to error");
      //   setClips(prevClips);
      // }
      
      toast({ 
        variant: "destructive", 
        title: "Command Error",
        description: message 
      });
      
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-assistant",
        content: `Sorry, something went wrong while processing your command: ${message}`,
        sender: "assistant",
        timestamp: new Date(),
      }]);
    }
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
            {/* Step-by-step assistant status (thinking) block */}
            {isThinking && status && (
              <div className="bg-cre8r-gray-600 text-cre8r-gray-200 self-start max-w-[90%] rounded-lg p-3 text-sm italic flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                <span>{status}</span>
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
              placeholder="Tell me what edits to apply to your video... (e.g. 'cut 0-5', 'add text at 10s saying Welcome')"
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
