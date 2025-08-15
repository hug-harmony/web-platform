/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Peer, { SignalData } from "simple-peer";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

export default function VideoSessionComponent({
  roomId,
  isSpecialist,
}: {
  roomId: string;
  isSpecialist?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("VideoSessionComponent: Mounting, roomId:", roomId);
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!roomId) {
      setError("Invalid session. Please try again.");
      setLoading(false);
      return;
    }

    // Ensure video element is rendered
    if (!videoRef.current) {
      console.error("VideoSessionComponent: videoRef.current is null");
      setError("Video container not found");
      setLoading(false);
      return;
    }

    const initializeWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("Failed to play local video:", err);
            setError(`Failed to play local video: ${err.message}`);
            setLoading(false);
          });
        }

        socketRef.current = io("/api/websocket");
        socketRef.current.emit("join-room", roomId);

        peerRef.current = new Peer({
          initiator: !isSpecialist,
          trickle: false,
          stream,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          },
        });

        peerRef.current.on("signal", (data: SignalData) => {
          socketRef.current?.emit("signal", { roomId, signalingData: data });
        });

        socketRef.current.on("signal", (signalingData: SignalData) => {
          if (peerRef.current) {
            peerRef.current.signal(signalingData);
          }
        });

        peerRef.current.on("stream", (remoteStream) => {
          const remoteVideo = document.createElement("video");
          remoteVideo.srcObject = remoteStream;
          remoteVideo.playsInline = true;
          remoteVideo.autoplay = true;
          if (videoRef.current?.parentElement) {
            videoRef.current.parentElement.appendChild(remoteVideo);
          }
          setLoading(false);
        });

        peerRef.current.on("error", (err) => {
          console.error("WebRTC error:", err);
          setError(`WebRTC error: ${err.message}`);
          setLoading(false);
        });
      } catch (err: any) {
        console.error("Failed to initialize WebRTC:", err);
        setError(`Failed to initialize WebRTC: ${err.message}`);
        setLoading(false);
      }
    };

    initializeWebRTC();

    return () => {
      console.log("VideoSessionComponent: Cleaning up");
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, status, router, isSpecialist]);

  if (status === "loading" || loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center text-[#F3CFC6]">
        Loading video call...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center text-red-500">
        {error}
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
    <div className="w-full h-[500px] rounded-md overflow-hidden relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  );
}
