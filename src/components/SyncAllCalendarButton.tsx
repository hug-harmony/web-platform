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
  className?: string;
}

export default function SyncAllCalendarButton({
  className,
}: SyncAllCalendarButtonProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const feedUrl = `${window.location.origin}/api/calendar/feed/${userId}`;

  const links = {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`,
    apple: `webcal://${window.location.host}/api/calendar/feed/${userId}`,
    outlook: feedUrl, // Outlook supports direct subscription
  };

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>Sync All Appointments</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to your calendar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-4">
          <Button
            onClick={() => handleLinkClick(links.google)}
            variant="outline"
          >
            Google Calendar
          </Button>
          <Button
            onClick={() => handleLinkClick(links.apple)}
            variant="outline"
          >
            Apple Calendar (iOS/macOS)
          </Button>
          <Button
            onClick={() => handleLinkClick(links.outlook)}
            variant="outline"
          >
            Outlook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
