// src/app/admin/dashboard/training-videos/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Video,
  ArrowLeft,
  Link2,
  Trash2,
  Save,
  Clock,
  ExternalLink,
  AlertCircle,
  Info,
  Upload,
  X,
  RefreshCw,
  FileVideo,
  Play,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface TrainingVideo {
  id: string;
  name: string;
  url: string;
  durationSec?: number | null;
  isActive: boolean;
  isProOnboarding: boolean;
}

interface DurationInput {
  hours: string;
  minutes: string;
  seconds: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function EditTrainingVideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [duration, setDuration] = useState<DurationInput>({
    hours: "",
    minutes: "",
    seconds: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Upload states
  const [videoSource, setVideoSource] = useState<"current" | "upload" | "url">(
    "current"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const secondsToDuration = useCallback((totalSec: number): DurationInput => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return {
      hours: hours > 0 ? hours.toString() : "",
      minutes: minutes.toString(),
      seconds: seconds.toString(),
    };
  }, []);

  const getDurationInSeconds = useCallback((): number | null => {
    const hours = parseInt(duration.hours) || 0;
    const minutes = parseInt(duration.minutes) || 0;
    const seconds = parseInt(duration.seconds) || 0;

    if (hours === 0 && minutes === 0 && seconds === 0) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }, [duration]);

  useEffect(() => {
    if (!id || typeof id !== "string" || id.length !== 24) {
      toast.error("Invalid video ID");
      router.push("/admin/dashboard/training-videos");
      return;
    }

    fetch(`/api/trainingvideos/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setVideo(data);
        if (data.durationSec) {
          setDuration(secondsToDuration(data.durationSec));
        }
      })
      .catch(() => toast.error("Failed to load video"))
      .finally(() => setLoading(false));
  }, [id, router, secondsToDuration]);

  const handleDurationChange = (field: keyof DurationInput, value: string) => {
    const numericValue = value.replace(/\D/g, "");
    let validatedValue = numericValue;

    if (field === "hours" && parseInt(numericValue) > 99) {
      validatedValue = "99";
    } else if (
      (field === "minutes" || field === "seconds") &&
      parseInt(numericValue) > 59
    ) {
      validatedValue = "59";
    }

    setDuration((prev) => ({ ...prev, [field]: validatedValue }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only MP4, WebM, MOV, and AVI files are allowed");
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 500MB limit");
      return;
    }

    setSelectedFile(file);
    setVideoSource("upload");

    // Try to get video duration automatically
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoEl.src);
      const totalSeconds = Math.round(videoEl.duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setDuration({
        hours: hours > 0 ? hours.toString() : "",
        minutes: minutes.toString(),
        seconds: seconds.toString(),
      });
      toast.success("Video duration detected automatically");
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setVideoSource("current");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const res = await fetch("/api/trainingvideos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!video || !video.name.trim()) {
      toast.error("Video title is required");
      return;
    }

    // Validate video source
    if (videoSource === "url" && !newUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (videoSource === "upload" && !selectedFile) {
      toast.error("Please select a video file");
      return;
    }

    const durationSec = getDurationInSeconds();
    if (!durationSec || durationSec <= 0) {
      toast.error("Please enter a valid video duration");
      return;
    }

    setSaving(true);

    try {
      let finalUrl = video.url;

      // Handle new upload
      if (videoSource === "upload" && selectedFile) {
        const uploadedUrl = await uploadFile();
        if (!uploadedUrl) {
          throw new Error("Failed to upload video");
        }
        finalUrl = uploadedUrl;
      } else if (videoSource === "url" && newUrl.trim()) {
        finalUrl = newUrl.trim();
      }

      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: video.name.trim(),
          url: finalUrl,
          durationSec,
          isActive: video.isActive,
          isProOnboarding: video.isProOnboarding,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success("Video updated successfully");
      router.push("/admin/dashboard/training-videos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/trainingvideos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Video deleted successfully");
      router.push("/admin/dashboard/training-videos");
    } catch {
      toast.error("Failed to delete video");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formattedDuration = () => {
    const h = parseInt(duration.hours) || 0;
    const m = parseInt(duration.minutes) || 0;
    const s = parseInt(duration.seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return "Not set";
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" ");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVideoType = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "YouTube";
    }
    if (url.includes("vimeo.com")) {
      return "Vimeo";
    }
    if (url.includes("s3.") || url.includes("amazonaws.com")) {
      return "S3 Upload";
    }
    if (url.endsWith(".mp4") || url.endsWith(".webm")) {
      return "Direct Link";
    }
    return "External";
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto p-4">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Video not found.{" "}
            <Link
              href="/admin/dashboard/training-videos"
              className="underline font-medium"
            >
              Go back to videos
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 max-w-3xl mx-auto p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/10"
              >
                <Link href="/admin/dashboard/training-videos">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <CardTitle className="flex items-center text-2xl text-black">
                  <Video className="mr-3 h-6 w-6" />
                  Edit Training Video
                </CardTitle>
                <p className="text-sm text-black/70 mt-1">
                  Update video details and settings
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileVideo className="h-5 w-5 text-[#F3CFC6]" />
              Video Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Video Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={video.name}
                onChange={(e) => setVideo({ ...video, name: e.target.value })}
                className="border-[#C4C4C4]/50 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Source */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-[#F3CFC6]" />
                Video Source
              </CardTitle>
              {videoSource === "current" && (
                <Badge variant="secondary" className="gap-1">
                  {getVideoType(video.url)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Video Preview */}
            {videoSource === "current" && (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#F3CFC6]/20 to-[#C4C4C4]/20 border border-[#C4C4C4]/30">
                  <div className="aspect-video flex items-center justify-center bg-black/5">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-full bg-[#F3CFC6]/30 flex items-center justify-center mx-auto mb-3">
                        <Play className="h-8 w-8 text-[#F3CFC6]" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Current Video
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto truncate px-4">
                        {video.url}
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(video.url, "_blank")}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => setVideoSource("upload")}
                  >
                    <Upload className="h-4 w-4" />
                    Replace with Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setVideoSource("url");
                      setNewUrl(video.url);
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                    Change URL
                  </Button>
                </div>
              </div>
            )}

            {/* Upload New Video */}
            {videoSource === "upload" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Upload New Video
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVideoSource("current");
                      removeFile();
                    }}
                    className="text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-[#F3CFC6] bg-[#F3CFC6]/10"
                        : "border-[#C4C4C4]/50 hover:border-[#F3CFC6] hover:bg-[#F3CFC6]/5"
                    }`}
                  >
                    <div className="h-14 w-14 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-7 w-7 text-[#F3CFC6]" />
                    </div>
                    <p className="font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      MP4, WebM, MOV, AVI (max 500MB)
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-xl p-5 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-lg bg-[#F3CFC6]/20 flex items-center justify-center">
                          <Video className="h-7 w-7 text-[#F3CFC6]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        disabled={uploading}
                        className="rounded-full hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploading && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            Uploading...
                          </span>
                          <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" />
                  This will replace the current video
                </p>
              </div>
            )}

            {/* External URL */}
            {videoSource === "url" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newUrl" className="text-sm font-medium">
                    Video URL
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVideoSource("current");
                      setNewUrl("");
                    }}
                    className="text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newUrl"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or direct link"
                      className="pl-10 border-[#C4C4C4]/50 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]"
                    />
                  </div>
                  {newUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(newUrl, "_blank")}
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Supports YouTube, Vimeo, or direct MP4 links
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#F3CFC6]" />
                Video Duration
                <span className="text-red-500">*</span>
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p>
                      Duration is required to track user progress and determine
                      when a video is considered &quot;completed&quot; (90%
                      watched).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="hours"
                  className="text-xs text-muted-foreground"
                >
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="text"
                  inputMode="numeric"
                  value={duration.hours}
                  onChange={(e) =>
                    handleDurationChange("hours", e.target.value)
                  }
                  placeholder="0"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
              <span className="text-2xl font-light text-muted-foreground mt-6">
                :
              </span>
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="minutes"
                  className="text-xs text-muted-foreground"
                >
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="text"
                  inputMode="numeric"
                  value={duration.minutes}
                  onChange={(e) =>
                    handleDurationChange("minutes", e.target.value)
                  }
                  placeholder="00"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
              <span className="text-2xl font-light text-muted-foreground mt-6">
                :
              </span>
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="seconds"
                  className="text-xs text-muted-foreground"
                >
                  Seconds
                </Label>
                <Input
                  id="seconds"
                  type="text"
                  inputMode="numeric"
                  value={duration.seconds}
                  onChange={(e) =>
                    handleDurationChange("seconds", e.target.value)
                  }
                  placeholder="00"
                  maxLength={2}
                  className="text-center text-lg font-mono border-[#C4C4C4]/50 focus:border-[#F3CFC6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2">
              <Clock className="h-4 w-4" />
              <span>Total duration: </span>
              <span className="font-medium text-foreground">
                {formattedDuration()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-[#C4C4C4]/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Publish Status</Label>
                <p className="text-xs text-muted-foreground">
                  Published videos are visible to all professionals
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${!video.isActive ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
                >
                  Draft
                </span>
                <Switch
                  checked={video.isActive}
                  onCheckedChange={(checked) =>
                    setVideo({ ...video, isActive: checked })
                  }
                />
                <span
                  className={`text-sm ${video.isActive ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}
                >
                  Published
                </span>
              </div>
            </div>

            <div className="border-t border-[#C4C4C4]/20 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Professional Onboarding Video
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark as required for new professional onboarding
                  </p>
                </div>
                <Switch
                  checked={video.isProOnboarding}
                  onCheckedChange={(checked) =>
                    setVideo({ ...video, isProOnboarding: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={saving || uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black"
            disabled={saving || uploading}
          >
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The video &quot;{video.name}&quot;
              will be permanently removed and all user progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete Video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
