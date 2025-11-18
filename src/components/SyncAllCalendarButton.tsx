"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";

interface SyncAllCalendarButtonProps {
  userId?: string;
}

export default function SyncAllCalendarButton({
  userId,
}: SyncAllCalendarButtonProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user?.id && !userId) return null;

  const resolvedUserId = userId || session!.user.id;

  const generateCalendarSubscriptionLinks = (userId: string) => {
    const feedUrl = `${window.location.origin}/api/calendar/feed/${userId}`;
    return {
      google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
      apple: `webcal://${window.location.host}/api/calendar/feed/${userId}`,
      outlook: feedUrl,
      download: feedUrl,
    };
  };

  const handleCalendarSelect = (
    option: "google" | "apple" | "outlook" | "download"
  ) => {
    const links = generateCalendarSubscriptionLinks(resolvedUserId);

    switch (option) {
      case "google":
        window.open(links.google, "_blank");
        break;
      case "apple":
        window.location.href = links.apple;
        break;
      case "outlook":
        window.open(links.outlook, "_blank");
        break;
      case "download":
        const link = document.createElement("a");
        link.href = links.download;
        link.download = "appointments.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Sync All Appointments</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Calendar to Sync</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={() => handleCalendarSelect("google")}>
            Google Calendar
          </Button>
          <Button onClick={() => handleCalendarSelect("apple")}>
            Apple Calendar (iOS/macOS)
          </Button>
          <Button onClick={() => handleCalendarSelect("outlook")}>
            Outlook
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCalendarSelect("download")}
          >
            Download ICS File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
