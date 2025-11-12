// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import Peer, { SignalData } from "simple-peer";
// import { Button } from "@/components/ui/button";

// interface VideoSessionProps {
//   roomId: string;
//   professionalId: string;
//   isProfessional?: boolean;
// }

// export default function VideoSessionComponent({
//   roomId,
//   professionalId,
//   isProfessional,
// }: VideoSessionProps) {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const peerRef = useRef<Peer.Instance | null>(null);
//   const socketRef = useRef<Socket | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   useEffect(() => {
//     console.log(
//       "VideoSessionComponent: Mounting, roomId:",
//       roomId,
//       "professionalId:",
//       professionalId
//     );

//     if (status === "unauthenticated") {
//       router.push("/login");
//       return;
//     }

//     if (!roomId || !professionalId) {
//       setError("Invalid session or professional ID.");
//       setLoading(false);
//       return;
//     }

//     const validateProfessional = async () => {
//       try {
//         const response = await fetch(`/api/professionals?id=${professionalId}`, {
//           cache: "no-store",
//         });
//         if (!response.ok) {
//           throw new Error(
//             response.status === 404
//               ? `Professional not found for ID: ${professionalId}`
//               : "Failed to validate professional"
//           );
//         }
//       } catch (err: any) {
//         console.error("Professional validation failed:", err);
//         setError(err.message || "Invalid professional.");
//         setLoading(false);
//         router.push("/dashboard/professionals");
//         return false;
//       }
//       return true;
//     };

//     const initializeWebRTC = async () => {
//       if (!videoRef.current) {
//         console.error(
//           "VideoSessionComponent: videoRef.current is null during WebRTC initialization"
//         );
//         setError("Video element not found");
//         setLoading(false);
//         return;
//       }

//       try {
//         console.log("VideoSessionComponent: Initializing WebRTC");
//         streamRef.current = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: true,
//         });

//         videoRef.current.srcObject = streamRef.current;
//         await videoRef.current.play().catch((err) => {
//           console.error("Failed to play local video:", err);
//           setError(`Failed to play local video: ${err.message}`);
//           setLoading(false);
//         });

//         socketRef.current = io("/api/websocket", { transports: ["websocket"] });
//         socketRef.current.emit("join-room", roomId);
//         console.log(
//           "VideoSessionComponent: Emitted join-room for roomId:",
//           roomId
//         );

//         peerRef.current = new Peer({
//           initiator: !isProfessional,
//           trickle: false,
//           stream: streamRef.current,
//           config: {
//             iceServers: [
//               { urls: "stun:stun.l.google.com:19302" },
//               { urls: "stun:stun1.l.google.com:19302" },
//             ],
//           },
//         });

//         peerRef.current.on("signal", (data: SignalData) => {
//           socketRef.current?.emit("signal", { roomId, signalingData: data });
//           console.log("VideoSessionComponent: Emitted signaling data");
//         });

//         socketRef.current.on("signal", (signalingData: SignalData) => {
//           if (peerRef.current) {
//             peerRef.current.signal(signalingData);
//             console.log(
//               "VideoSessionComponent: Received and processed signaling data"
//             );
//           }
//         });

//         peerRef.current.on("stream", (remoteStream: MediaStream) => {
//           console.log("VideoSessionComponent: Received remote stream");
//           const remoteVideo = document.createElement("video");
//           remoteVideo.srcObject = remoteStream;
//           remoteVideo.playsInline = true;
//           remoteVideo.autoplay = true;
//           remoteVideo.className = "w-full h-full object-cover";
//           const container = document.getElementById("remote-video-container");
//           if (container) {
//             container.appendChild(remoteVideo);
//             console.log(
//               "VideoSessionComponent: Appended remote video to container"
//             );
//           } else {
//             console.error(
//               "VideoSessionComponent: Remote video container not found"
//             );
//             setError("Remote video container not found");
//             setLoading(false);
//           }
//         });

//         peerRef.current.on("error", (err: Error) => {
//           console.error("WebRTC error:", err);
//           setError(`WebRTC connection failed: ${err.message}`);
//           setLoading(false);
//         });

//         socketRef.current.on("connect_error", (err) => {
//           console.error("Socket connection error:", err);
//           setError(`Socket connection failed: ${err.message}`);
//           setLoading(false);
//         });
//       } catch (err: any) {
//         console.error("Failed to initialize WebRTC:", err);
//         setError(`Initialization failed: ${err.message}`);
//         setLoading(false);
//       }
//     };

//     const checkVideoElement = async () => {
//       const isValidProfessional = await validateProfessional();
//       if (!isValidProfessional) return;

//       // Check if video element exists in DOM
//       const domVideoCheck = () => {
//         const videoElement = document.querySelector("video");
//         console.log(
//           "VideoSessionComponent: DOM video element check:",
//           videoElement ? "Found" : "Not found"
//         );
//         return videoElement;
//       };

//       if (videoRef.current) {
//         console.log(
//           "VideoSessionComponent: videoRef.current found, initializing WebRTC"
//         );
//         await initializeWebRTC();
//         return;
//       }

//       console.warn(
//         "VideoSessionComponent: videoRef.current not found, starting polling"
//       );
//       domVideoCheck(); // Initial DOM check
//       const startTime = Date.now();
//       const maxWaitTime = 15000; // 15 seconds

//       const poll = setInterval(() => {
//         domVideoCheck(); // Log DOM presence each poll
//         if (videoRef.current) {
//           console.log(
//             "VideoSessionComponent: videoRef.current found during polling, initializing WebRTC"
//           );
//           clearInterval(poll);
//           initializeWebRTC();
//         } else if (Date.now() - startTime >= maxWaitTime) {
//           console.error(
//             "VideoSessionComponent: videoRef.current not found after 15 seconds"
//           );
//           clearInterval(poll);
//           setError("Unable to initialize video call: video element not found");
//           setLoading(false);
//         }
//       }, 500); // Check every 500ms

//       return () => clearInterval(poll);
//     };

//     checkVideoElement();

//     return () => {
//       console.log("VideoSessionComponent: Cleaning up");
//       if (peerRef.current) {
//         peerRef.current.destroy();
//         peerRef.current = null;
//       }
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//         socketRef.current = null;
//       }
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//         streamRef.current = null;
//       }
//     };
//   }, [roomId, professionalId, status, router, isProfessional]);

//   if (status === "loading" || loading) {
//     return (
//       <div className="w-full h-[500px] flex items-center justify-center text-[#F3CFC6]">
//         Loading video call...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="w-full h-[500px] flex flex-col items-center justify-center text-red-500">
//         <p>{error}</p>
//         <Button
//           variant="outline"
//           className="mt-4 text-[#F3CFC6] border-[#F3CFC6]"
//           onClick={() => router.push("/dashboard/professionals")}
//         >
//           Back to Professionals
//         </Button>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full h-[500px] rounded-md overflow-hidden relative">
//       <video
//         ref={videoRef}
//         autoPlay
//         playsInline
//         muted
//         className="w-full h-full object-cover"
//       />
//       <div
//         id="remote-video-container"
//         className="absolute top-0 left-0 w-full h-full"
//       />
//     </div>
//   );
// }

import React from "react";

const VideoSession = () => {
  return <div>VideoSession</div>;
};

export default VideoSession;
