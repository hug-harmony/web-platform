import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";

interface Professional {
  id: string;
  name: string;
  rate?: number;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  selectedProposal: {
    id: string;
    startTime: string; // UPDATED: ISO string
    endTime: string; // UPDATED: ISO string
    professional: Professional;
    appointmentId?: string;
  } | null;
  handlePayNow: () => void;
  sending: boolean;
  sessionUserName: string | null | undefined;
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  setIsOpen,
  selectedProposal,
  handlePayNow,
  sending,
  sessionUserName,
}) => {
  if (!selectedProposal) return null;

  const start = new Date(selectedProposal.startTime);
  const end = new Date(selectedProposal.endTime);
  const durationHours = differenceInMinutes(end, start) / 60;
  const amount = (selectedProposal.professional.rate || 50) * durationHours;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <DialogTitle className="text-2xl font-semibold text-black dark:text-white">
            Confirm Booking
          </DialogTitle>
          <div className="py-2 space-y-2">
            <p className="text-black dark:text-white">
              <strong>Name:</strong> {sessionUserName || "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Professional:</strong>{" "}
              {selectedProposal?.professional.name || "N/A"}
            </p>
            <p className="text-black dark:text-white">
              <strong>Date:</strong> {format(start, "MMMM d, yyyy")}
            </p>
            <p className="text-black dark:text-white">
              <strong>Time:</strong> {format(start, "h:mm a")} -{" "}
              {format(end, "h:mm a")}
            </p>
            <p className="text-black dark:text-white">
              <strong>Duration:</strong> {durationHours} hour
              {durationHours !== 1 ? "s" : ""}
            </p>
            <p className="text-black dark:text-white">
              <strong>Amount:</strong> ${amount.toFixed(2)}
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayNow}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white"
              disabled={sending}
            >
              Pay Now
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
