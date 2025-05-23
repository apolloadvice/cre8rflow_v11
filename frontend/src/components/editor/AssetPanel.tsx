import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Upload, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEditorStore } from "@/store/editorStore";

type VideoAsset = {
  id: string;
  name: string;
  thumbnail: string;
  duration: number;
  uploaded: Date;
  src?: string;
  file_path: string;
  width: number;
  height: number;
  size: number;
  mimetype: string;
};

const placeholderVideos: VideoAsset[] = [];

interface AssetPanelProps {
  onVideoSelect: (video: VideoAsset) => void;
}

const AssetPanel = ({ onVideoSelect }: AssetPanelProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("uploaded");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedVideos, setUploadedVideos] = useState<VideoAsset[]>(placeholderVideos);
  const [isUploading, setIsUploading] = useState(false);
  const setActiveVideoAsset = useEditorStore((state) => state.setActiveVideoAsset);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4 or MOV)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 1024MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Step 1: Extract metadata in browser
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = videoUrl;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Generate a thumbnail (optional)
      let thumbnail = "";
      try {
        video.currentTime = 1;
        await new Promise((resolve) => {
          video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbnail = canvas.toDataURL("image/jpeg");
            resolve(true);
          };
        });
      } catch {
        thumbnail = "https://i.imgur.com/JcGrHtu.jpg";
      }

      try {
        // Step 2: Get upload path from backend
        const uploadUrlRes = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, folder: "user123/" }),
        });
        if (!uploadUrlRes.ok) throw new Error("Failed to get upload URL");
        const { path } = await uploadUrlRes.json();
        console.log("uploadUrlRes path", path, typeof path);

        // Step 3: Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        // Step 4: Register asset with backend
        const registerRes = await fetch("/api/assets/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            originalName: file.name,
            duration,
            width,
            height,
            size: file.size,
            mimetype: file.type,
          }),
        });
        if (!registerRes.ok) throw new Error("Failed to register asset metadata");
        const { id, status } = await registerRes.json();
        console.log("uploadUrlRes path", path, typeof path);
        if (status !== "registered") throw new Error("Asset registration failed");

        // Step 5: Update UI state
        const newVideo = {
          id,
          name: file.name,
          file_path: path,
          duration,
          width,
          height,
          size: file.size,
          mimetype: file.type,
          thumbnail,
          uploaded: new Date(),
          src: videoUrl,
        };
        console.log("newVideo", newVideo);
        setUploadedVideos((prev) => [newVideo, ...prev]);
        setIsUploading(false);
        setActiveVideoAsset(newVideo);
        onVideoSelect(newVideo);

        toast({
          title: "Video uploaded",
          description: `${file.name} has been added to your assets`,
        });
      } catch (error) {
        setIsUploading(false);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "There was an error processing your video",
          variant: "destructive",
        });
      }
    };

    video.onerror = () => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "There was an error processing your video",
        variant: "destructive",
      });
    };
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDragStart = (e: React.DragEvent, video: VideoAsset) => {
    e.dataTransfer.setData("application/json", JSON.stringify(video));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="h-full flex flex-col bg-cre8r-gray-800 border-r border-cre8r-gray-700">
      <div className="p-4 border-b border-cre8r-gray-700">
        <h2 className="text-lg font-semibold mb-3">Upload Video</h2>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            isDragging ? "border-cre8r-violet bg-cre8r-violet/10" : "border-cre8r-gray-600 hover:border-cre8r-gray-500"
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-cre8r-gray-400" />
            <p className="text-sm text-cre8r-gray-300">
              Drag and drop or click to upload a video
            </p>
            <p className="text-xs text-cre8r-gray-400">
              MP4 or MOV format, max 1024MB
            </p>
            <input
              type="file"
              className="hidden"
              accept="video/mp4,video/quicktime"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              id="video-upload"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => document.getElementById("video-upload")?.click()}
              className="mt-2"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Select File"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="uploaded"
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="border-b border-cre8r-gray-700">
          <TabsList className="w-full bg-transparent border-b border-cre8r-gray-700 rounded-none gap-2">
            <TabsTrigger
              value="uploaded"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cre8r-violet rounded-none"
            >
              Uploaded Videos
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-cre8r-violet rounded-none"
            >
              Stock Videos
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-3 border-b border-cre8r-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cre8r-gray-400" />
            <Input
              type="text"
              placeholder={`Search ${activeTab} videos...`}
              className="pl-9 bg-cre8r-gray-700 border-cre8r-gray-600 focus:border-cre8r-violet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <TabsContent value="uploaded" className="flex-1 overflow-y-auto m-0 p-0">
          <div className="p-3 space-y-3">
            {uploadedVideos.length === 0 ? (
              <div className="text-center py-8 text-cre8r-gray-400">
                <p>No uploaded videos yet</p>
              </div>
            ) : (
              uploadedVideos.map((video) => (
                <div 
                  key={video.id} 
                  className="bg-cre8r-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-cre8r-violet transition-all group"
                  onClick={() => onVideoSelect(video)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, video)}
                >
                  <div className="relative">
                    <img 
                      src={video.thumbnail} 
                      alt={video.name} 
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-sm truncate">{video.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="stock" className="flex-1 overflow-y-auto m-0 p-0">
          <div className="text-center py-8 text-cre8r-gray-400">
            <p>Stock videos coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetPanel;