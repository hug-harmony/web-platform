/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { use } from "react";
import VideoSessionComponent from "@/components/VideoSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

interface VideoSession {
  id: string;
  roomId: string;
  specialist: { name: string; id: string };
  date: string;
  time: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function VideoSessionPage({ params }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id } = use(params);

  useEffect(() => {
    console.log("VideoSessionPage: Mounting, specialistId:", id);
    if (status === "authenticated" && session?.user?.id) {
      const createOrFetchSession = async () => {
        try {
          // Verify specialist exists
          const specialistRes = await fetch(`/api/specialists?id=${id}`, {
            cache: "no-store",
          });
          if (!specialistRes.ok) {
            console.error(
              "Specialist API response:",
              specialistRes.status,
              await specialistRes.text()
            );
            throw new Error("Specialist not found");
          }

          // Fetch existing session
          const res = await fetch(
            `/api/videoSessions?userId=${session.user.id}&specialistId=${id}`,
            { cache: "no-store" }
          );
          if (!res.ok) {
            console.error(
              "Video sessions API response:",
              res.status,
              await res.text()
            );
            throw new Error(`Failed to fetch video sessions: ${res.status}`);
          }
          const sessions = await res.json();
          if (sessions.length > 0) {
            console.log(
              "VideoSessionPage: Found existing session:",
              sessions[0]
            );
            setVideoSession(sessions[0]);
            return;
          }

          // Create new session
          console.log(
            "VideoSessionPage: Creating new session for specialistId:",
            id
          );
          const newSession = await fetch("/api/videoSessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: session.user.id,
              specialistId: id,
              date: new Date().toISOString(),
              time: new Date().toLocaleTimeString(),
            }),
          });

          if (!newSession.ok) {
            const errorData = await newSession.json();
            console.error("Video session creation failed:", errorData);
            throw new Error(
              errorData.error || "Failed to create video session"
            );
          }

          const data = await newSession.json();
          console.log("VideoSessionPage: Created new session:", data);
          setVideoSession(data);
        } catch (err: any) {
          console.error("Error fetching/creating session:", err);
          setError(err.message || "Failed to load or create video session.");
          setVideoSession(null);
          router.push("/dashboard/specialists");
        }
      };
      createOrFetchSession();
    }
  }, [status, id, session, router]);

  if (status === "loading") {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (error || !videoSession) {
    return (
      <div className="p-4 text-center text-red-500">
        {error || "Specialist information not available."}
        <Button
          variant="outline"
          className="mt-4 text-[#F3CFC6] border-[#F3CFC6]"
          onClick={() => router.push("/dashboard/specialists")}
        >
          Back to Specialists
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="mr-2 h-6 w-6 text-[#F3CFC6]" />
          Video Session with {videoSession.specialist.name}
        </CardTitle>
        <p className="text-sm text-[#C4C4C4]">
          {videoSession.date} at {videoSession.time}
        </p>
      </CardHeader>
      <CardContent>
        <VideoSessionComponent roomId={videoSession.roomId} />
        <Button
          variant="outline"
          className="mt-4 text-[#F3CFC6] border-[#F3CFC6]"
          onClick={() => router.push("/dashboard/video-session")}
        >
          Back to Sessions
        </Button>
      </CardContent>
    </Card>
  );
}
