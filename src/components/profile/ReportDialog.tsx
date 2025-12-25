// src/app/dashboard/profile/[id]/ReportDialog.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, ProfessionalProfile } from "@/types/profile";

// Type guard
function isProfessional(profile: Profile): profile is ProfessionalProfile {
  return profile.type === "professional";
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  reportReason: string;
  setReportReason: (reason: string) => void;
  reportDetails: string;
  setReportDetails: (details: string) => void;
  onSubmit: () => Promise<void>;
}

export default function ReportDialog({
  open,
  onOpenChange,
  profile,
  reportReason,
  setReportReason,
  reportDetails,
  setReportDetails,
  onSubmit,
}: ReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Report {isProfessional(profile) ? "Professional" : "User"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abuse">Abuse/Harassment</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="fake">Fake Account</SelectItem>
                <SelectItem value="inappropriate">
                  Inappropriate Content
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              placeholder="Provide more details..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!reportReason}>
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
