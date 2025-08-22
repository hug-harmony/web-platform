import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Specialist {
  id: string;
  name: string;
  rate?: number;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  selectedProposal: {
    id: string;
    date: string;
    time: string;
    specialist: Specialist;
    appointmentId?: string;
  } | null;
  handlePayNow: () => void;
  sending: boolean;
  sessionUserName: string | null | undefined;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  setIsOpen,
  selectedProposal,
  handlePayNow,
  sending,
  sessionUserName,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white dark:bg-gray-800">
        <DialogTitle className="text-black dark:text-white">
          Confirm Booking
        </DialogTitle>
        <div className="py-2 space-y-2">
          <p className="text-black dark:text-white">
            <strong>Name:</strong> {sessionUserName || "N/A"}
          </p>
          <p className="text-black dark:text-white">
            <strong>Specialist:</strong>{" "}
            {selectedProposal?.specialist.name || "N/A"}
          </p>
          <p className="text-black dark:text-white">
            <strong>Date:</strong>{" "}
            {selectedProposal?.date
              ? format(new Date(selectedProposal.date), "MMMM d, yyyy")
              : "N/A"}
          </p>
          <p className="text-black dark:text-white">
            <strong>Time:</strong> {selectedProposal?.time || "N/A"}
          </p>
          <p className="text-black dark:text-white">
            <strong>Amount:</strong> $
            {selectedProposal?.specialist.rate?.toFixed(2) || "50.00"}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayNow}
            className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
            disabled={sending}
          >
            Pay Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
