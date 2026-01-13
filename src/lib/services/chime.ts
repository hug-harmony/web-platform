
// src/lib/services/chime.ts
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  CreateMeetingCommandOutput,
  CreateAttendeeCommandOutput,
  NotFoundException,
} from "@aws-sdk/client-chime-sdk-meetings";

// Chime SDK Meetings control plane - use us-east-1
// See: https://docs.aws.amazon.com/chime-sdk/latest/dg/sdk-available-regions.html
const CHIME_CONTROL_REGION = "us-east-1";

// Initialize client with explicit credentials
const chimeClient = new ChimeSDKMeetingsClient({
  region: CHIME_CONTROL_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export interface CreateMeetingResult {
  meeting: NonNullable<CreateMeetingCommandOutput["Meeting"]>;
  attendee: NonNullable<CreateAttendeeCommandOutput["Attendee"]>;
}

/**
 * Create a new Chime meeting and the first attendee (host)
 */
export async function createChimeMeeting(
  externalMeetingId: string,
  hostUserId: string,
  hostDisplayName: string,
  mediaRegion: string = "us-east-1"
): Promise<CreateMeetingResult> {
  console.log("Creating Chime meeting:", {
    externalMeetingId,
    hostUserId,
    hostDisplayName,
    mediaRegion,
  });

  // Create meeting
  const meetingResponse = await chimeClient.send(
    new CreateMeetingCommand({
      ClientRequestToken: externalMeetingId,
      MediaRegion: mediaRegion,
      ExternalMeetingId: externalMeetingId,
      MeetingFeatures: {
        Audio: {
          EchoReduction: "AVAILABLE",
        },
        Video: {
          MaxResolution: "HD",
        },
      },
    })
  );

  if (!meetingResponse.Meeting) {
    throw new Error("Failed to create Chime meeting - no meeting returned");
  }

  console.log("Chime meeting created:", meetingResponse.Meeting.MeetingId);

  // Create host attendee
  const attendeeResponse = await chimeClient.send(
    new CreateAttendeeCommand({
      MeetingId: meetingResponse.Meeting.MeetingId!,
      ExternalUserId: hostUserId,
      Capabilities: {
        Audio: "SendReceive",
        Video: "SendReceive",
        Content: "SendReceive",
      },
    })
  );

  if (!attendeeResponse.Attendee) {
    throw new Error("Failed to create host attendee");
  }

  console.log("Host attendee created:", attendeeResponse.Attendee.AttendeeId);

  return {
    meeting: meetingResponse.Meeting,
    attendee: attendeeResponse.Attendee,
  };
}

/**
 * Add an attendee to an existing meeting
 */
export async function addAttendeeToMeeting(
  meetingId: string,
  userId: string,
  // _displayName: string
): Promise<NonNullable<CreateAttendeeCommandOutput["Attendee"]>> {
  console.log("Adding attendee to meeting:", { meetingId, userId });

  const attendeeResponse = await chimeClient.send(
    new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: userId,
      Capabilities: {
        Audio: "SendReceive",
        Video: "SendReceive",
        Content: "SendReceive",
      },
    })
  );

  if (!attendeeResponse.Attendee) {
    throw new Error("Failed to create attendee");
  }

  console.log("Attendee added:", attendeeResponse.Attendee.AttendeeId);

  return attendeeResponse.Attendee;
}

/**
 * Get meeting info - returns null if meeting doesn't exist
 */
export async function getMeeting(meetingId: string) {
  try {
    console.log("Getting meeting:", meetingId);

    const response = await chimeClient.send(
      new GetMeetingCommand({
        MeetingId: meetingId,
      })
    );

    console.log("Meeting found:", response.Meeting?.MeetingId);
    return response.Meeting;
  } catch (error: unknown) {
    if (error instanceof NotFoundException) {
      console.log("Meeting not found:", meetingId);
      return null;
    }
    if (error instanceof Error && error.name === "NotFoundException") {
      console.log("Meeting not found:", meetingId);
      return null;
    }
    console.error("Error getting meeting:", error);
    throw error;
  }
}

/**
 * End/delete a meeting
 */
export async function endChimeMeeting(meetingId: string): Promise<void> {
  try {
    console.log("Ending meeting:", meetingId);

    await chimeClient.send(
      new DeleteMeetingCommand({
        MeetingId: meetingId,
      })
    );

    console.log("Meeting ended:", meetingId);
  } catch (error: unknown) {
    if (error instanceof NotFoundException) {
      console.log("Meeting already ended:", meetingId);
      return;
    }
    if (error instanceof Error && error.name === "NotFoundException") {
      console.log("Meeting already ended:", meetingId);
      return;
    }
    console.error("Error ending meeting:", error);
    throw error;
  }
}

/**
 * Get the best media region based on user's location
 * Supported Chime SDK Meetings media regions:
 * https://docs.aws.amazon.com/chime-sdk/latest/dg/chime-sdk-meetings-regions.html
 */
export function getOptimalMediaRegion(userRegion?: string): string {
  const regionMap: Record<string, string> = {
    "us-east": "us-east-1", // Virginia - FIXED (was us-east-2)
    "us-west": "us-west-2", // Oregon
    "eu-west": "eu-west-1", // Ireland
    "eu-central": "eu-central-1", // Frankfurt
    "ap-southeast": "ap-southeast-1", // Singapore
    "ap-northeast": "ap-northeast-1", // Tokyo
    "ap-south": "ap-south-1", // Mumbai
  };

  return regionMap[userRegion || "us-east"] || "us-east-1";
}
