/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useVideoCall.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  MeetingSessionConfiguration,
  ConsoleLogger,
  LogLevel,
  DefaultDeviceController,
  DefaultMeetingSession,
  AudioVideoFacade,
  AudioVideoObserver,
  VideoTileState,
  MeetingSessionStatusCode,
} from "amazon-chime-sdk-js";

export interface VideoCallState {
  isConnecting: boolean;
  isConnected: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  localVideoTileId: number | null;
  remoteVideoTileId: number | null;
  error: string | null;
}

export interface UseVideoCallOptions {
  sessionId: string;
  onParticipantJoined?: (attendeeId: string) => void;
  onParticipantLeft?: (attendeeId: string) => void;
  onSessionEnded?: () => void;
  onError?: (error: string) => void;
}

export interface UseVideoCallReturn extends VideoCallState {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  bindVideoElement: (tileId: number, element: HTMLVideoElement) => void;
  unbindVideoElement: (tileId: number) => void;
}

export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const {
    sessionId,
    onParticipantJoined,
    onParticipantLeft,
    onSessionEnded,
    onError,
  } = options;
  const { data: session } = useSession();

  const [state, setState] = useState<VideoCallState>({
    isConnecting: false,
    isConnected: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    localVideoTileId: null,
    remoteVideoTileId: null,
    error: null,
  });

  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const audioVideoRef = useRef<AudioVideoFacade | null>(null);
  const deviceControllerRef = useRef<DefaultDeviceController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meetingSessionRef.current) {
        meetingSessionRef.current.audioVideo.stop();
      }
    };
  }, []);

  const join = useCallback(async () => {
    if (!session?.user?.id) {
      setState((s) => ({ ...s, error: "Not authenticated" }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      // Join the session via API
      const response = await fetch(`/api/video/join/${sessionId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join session");
      }

      const { meeting, attendee } = await response.json();

      // Create meeting session configuration
      const logger = new ConsoleLogger("ChimeSDK", LogLevel.WARN);
      const deviceController = new DefaultDeviceController(logger);
      deviceControllerRef.current = deviceController;

      const configuration = new MeetingSessionConfiguration(meeting, attendee);
      const meetingSession = new DefaultMeetingSession(
        configuration,
        logger,
        deviceController
      );

      meetingSessionRef.current = meetingSession;
      audioVideoRef.current = meetingSession.audioVideo;

      // Set up observers
      const observer: AudioVideoObserver = {
        audioVideoDidStart: () => {
          console.log("Audio/Video started");
          setState((s) => ({ ...s, isConnected: true, isConnecting: false }));
        },
        audioVideoDidStop: (sessionStatus) => {
          console.log("Audio/Video stopped", sessionStatus.statusCode());
          setState((s) => ({ ...s, isConnected: false }));

          if (
            sessionStatus.statusCode() === MeetingSessionStatusCode.MeetingEnded
          ) {
            onSessionEnded?.();
          }
        },
        videoTileDidUpdate: (tileState: VideoTileState) => {
          if (tileState.localTile) {
            setState((s) => ({
              ...s,
              localVideoTileId: tileState.tileId ?? null,
            }));
          } else if (tileState.tileId) {
            setState((s) => ({ ...s, remoteVideoTileId: tileState.tileId }));
            if (tileState.boundExternalUserId) {
              onParticipantJoined?.(tileState.boundExternalUserId);
            }
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          setState((s) => {
            if (s.localVideoTileId === tileId) {
              return { ...s, localVideoTileId: null };
            }
            if (s.remoteVideoTileId === tileId) {
              onParticipantLeft?.("unknown");
              return { ...s, remoteVideoTileId: null };
            }
            return s;
          });
        },
      };

      meetingSession.audioVideo.addObserver(observer);

      // Get and set up devices
      const audioInputDevices =
        await meetingSession.audioVideo.listAudioInputDevices();
      const videoInputDevices =
        await meetingSession.audioVideo.listVideoInputDevices();
      const audioOutputDevices =
        await meetingSession.audioVideo.listAudioOutputDevices();

      if (audioInputDevices.length > 0) {
        await meetingSession.audioVideo.startAudioInput(
          audioInputDevices[0].deviceId
        );
      }

      if (videoInputDevices.length > 0) {
        await meetingSession.audioVideo.startVideoInput(
          videoInputDevices[0].deviceId
        );
      }

      if (audioOutputDevices.length > 0) {
        await meetingSession.audioVideo.chooseAudioOutput(
          audioOutputDevices[0].deviceId
        );
      }

      // Start the session
      meetingSession.audioVideo.start();
      meetingSession.audioVideo.startLocalVideoTile();
    } catch (error: any) {
      console.error("Failed to join video call:", error);
      const errorMessage = error.message || "Failed to join video call";
      setState((s) => ({ ...s, isConnecting: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [
    sessionId,
    session?.user?.id,
    onParticipantJoined,
    onParticipantLeft,
    onSessionEnded,
    onError,
  ]);

  const leave = useCallback(async () => {
    try {
      if (audioVideoRef.current) {
        audioVideoRef.current.stopLocalVideoTile();
        audioVideoRef.current.stop();
      }

      // Notify server
      await fetch(`/api/video/leave/${sessionId}`, { method: "POST" });

      setState({
        isConnecting: false,
        isConnected: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
        localVideoTileId: null,
        remoteVideoTileId: null,
        error: null,
      });
    } catch (error) {
      console.error("Failed to leave video call:", error);
    }
  }, [sessionId]);

  const endSession = useCallback(async () => {
    try {
      await leave();
      await fetch(`/api/video/end/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "completed" }),
      });
      onSessionEnded?.();
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, [sessionId, leave, onSessionEnded]);

  const toggleVideo = useCallback(async () => {
    if (!audioVideoRef.current) return;

    if (state.isVideoEnabled) {
      audioVideoRef.current.stopLocalVideoTile();
    } else {
      audioVideoRef.current.startLocalVideoTile();
    }

    setState((s) => ({ ...s, isVideoEnabled: !s.isVideoEnabled }));
  }, [state.isVideoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (!audioVideoRef.current) return;

    const muted = !state.isAudioEnabled;
    audioVideoRef.current.realtimeMuteLocalAudio();

    if (muted) {
      audioVideoRef.current.realtimeUnmuteLocalAudio();
    } else {
      audioVideoRef.current.realtimeMuteLocalAudio();
    }

    setState((s) => ({ ...s, isAudioEnabled: muted }));
  }, [state.isAudioEnabled]);

  const bindVideoElement = useCallback(
    (tileId: number, element: HTMLVideoElement) => {
      if (audioVideoRef.current) {
        audioVideoRef.current.bindVideoElement(tileId, element);
      }
    },
    []
  );

  const unbindVideoElement = useCallback((tileId: number) => {
    if (audioVideoRef.current) {
      audioVideoRef.current.unbindVideoElement(tileId);
    }
  }, []);

  return {
    ...state,
    join,
    leave,
    endSession,
    toggleVideo,
    toggleAudio,
    bindVideoElement,
    unbindVideoElement,
  };
}
