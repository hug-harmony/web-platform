/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Peer, { SignalData } from "simple-peer";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

interface VideoSessionProps {
  roomId: string;
  specialistId: string;
  isSpecialist?: boolean;
}

export default function VideoSessionComponent({
  roomId,
  specialistId,
  isSpecialist,
}: VideoSessionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log(
      "VideoSessionComponent: Mounting, roomId:",
      roomId,
      "specialistId:",
      specialistId
    );

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!roomId || !specialistId) {
      setError("Invalid session or specialist ID.");
      setLoading(false);
      return;
    }

    const validateSpecialist = async () => {
      try {
        const response = await fetch(`/api/specialists?id=${specialistId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Specialist not found");
        }
      } catch (err: any) {
        console.error("Specialist validation failed:", err);
        setError(`Invalid specialist: ${err.message}`);
        setLoading(false);
        router.push("/dashboard/specialists");
        return false;
      }
      return true;
    };

    const initializeWebRTC = async () => {
      if (!videoRef.current) {
        console.error("VideoSessionComponent: videoRef.current is null");
        setError("Video container not found");
        setLoading(false);
        return;
      }

      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play().catch((err) => {
          console.error("Failed to play local video:", err);
          setError(`Failed to play local video: ${err.message}`);
          setLoading(false);
        });

        socketRef.current = io("/api/websocket", { transports: ["websocket"] });
        socketRef.current.emit("join-room", roomId);

        peerRef.current = new Peer({
          initiator: !isSpecialist,
          trickle: false,
          stream: streamRef.current,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
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

        peerRef.current.on("stream", (remoteStream: MediaStream) => {
          const remoteVideo = document.createElement("video");
          remoteVideo.srcObject = remoteStream;
          remoteVideo.playsInline = true;
          remoteVideo.autoplay = true;
          remoteVideo.className = "w-full h-full object-cover";
          if (videoRef.current?.parentElement) {
            videoRef.current.parentElement.appendChild(remoteVideo);
          }
          setLoading(false);
        });

        peerRef.current.on("error", (err: Error) => {
          console.error("WebRTC error:", err);
          setError(`WebRTC connection failed: ${err.message}`);
          setLoading(false);
        });

        socketRef.current.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          setError(`Socket connection failed: ${err.message}`);
          setLoading(false);
        });
      } catch (err: any) {
        console.error("Failed to initialize WebRTC:", err);
        setError(`Initialization failed: ${err.message}`);
        setLoading(false);
      }
    };

    const observeVideoElement = async () => {
      const isValidSpecialist = await validateSpecialist();
      if (!isValidSpecialist) return;

      if (videoRef.current) {
        console.log(
          "VideoSessionComponent: videoRef.current found, initializing WebRTC"
        );
        initializeWebRTC();
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        if (videoRef.current) {
          console.log(
            "VideoSessionComponent: videoRef.current detected by observer"
          );
          obs.disconnect();
          initializeWebRTC();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      const timeout = setTimeout(() => {
        observer.disconnect();
        if (!videoRef.current) {
          console.error(
            "VideoSessionComponent: videoRef.current not found after timeout"
          );
          setError("Video container not found after waiting");
          setLoading(false);
        }
      }, 5000);

      return () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    };

    observeVideoElement();

    return () => {
      console.log("VideoSessionComponent: Cleaning up");
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [roomId, specialistId, status, router, isSpecialist]);

  if (status === "loading" || loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center text-[#F3CFC6]">
        Loading video call...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center text-red-500">
        <p>{error}</p>
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
