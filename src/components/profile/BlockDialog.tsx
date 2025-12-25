// src/app/dashboard/profile/[id]/BlockDialog.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBlocked: boolean;
  profileName: string;
  onConfirm: () => Promise<void>;
}

export default function BlockDialog({
  open,
  onOpenChange,
  isBlocked,
  profileName,
  onConfirm,
}: BlockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBlocked ? "Unblock" : "Block"} {profileName}?
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? "Unblocking will allow you to see their profile and interact with them again."
              : "Blocking will hide their profile and prevent them from messaging or interacting with you."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isBlocked ? "secondary" : "destructive"}
            onClick={onConfirm}
          >
            {isBlocked ? "Unblock" : "Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
