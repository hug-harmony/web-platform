"use client";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SyncAllCalendarButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  const generateCalendarSubscriptionLinks = (userId: string) => {
    const feedUrl = `${window.location.origin}/api/calendar/feed/${userId}`;
    return {
      google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
        feedUrl
      )}`,
      apple: `webcal://${window.location.host}/api/calendar/feed/${userId}`, // iOS/macOS
      outlook: feedUrl, // Outlook can subscribe via client
      download: feedUrl, // fallback
    };
  };

  const links = useMemo(
    () => generateCalendarSubscriptionLinks(userId),
    [userId]
  );

  const handleCalendarSelect = (calendar: "google" | "apple" | "outlook") => {
    if (/Mobi|Android/i.test(navigator.userAgent) && calendar === "apple") {
      // Mobile automatically opens Apple Calendar subscription
      window.location.href = links.apple;
    } else {
      if (calendar === "google") window.open(links.google, "_blank");
      else if (calendar === "apple") window.location.href = links.apple;
      else if (calendar === "outlook") window.open(links.outlook, "_blank");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" disabled={!userId}>
          Sync All Appointments
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Calendar to Subscribe</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={() => handleCalendarSelect("google")}>
            Google Calendar
          </Button>
          <Button onClick={() => handleCalendarSelect("apple")}>
            Apple Calendar
          </Button>
          <Button onClick={() => handleCalendarSelect("outlook")}>
            Outlook / Office 365
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
