import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface ProposalDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  proposalDate: Date | undefined;
  setProposalDate: (value: Date | undefined) => void;
  selectedSlots: string[];
  setSelectedSlots: React.Dispatch<React.SetStateAction<string[]>>;
  handleSendProposal: () => void;
  sending: boolean;
}

const ProposalDialog: React.FC<ProposalDialogProps> = ({
  isOpen,
  setIsOpen,
  proposalDate,
  setProposalDate,
  selectedSlots,
  setSelectedSlots,
  handleSendProposal,
  sending,
}) => {
  const allSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

  const toggleSlot = (time: string) => {
    setSelectedSlots([time]); // Set only the selected time
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="bg-gradient-to-br from-[#FCF0ED] to-[#F3CFC6]/50 dark:from-gray-800 dark:to-gray-700 sm:max-w-[600px] rounded-xl shadow-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-[#D8A7B1] dark:text-[#F3CFC6]">
                  Propose Session to User
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 flex flex-col sm:flex-row sm:space-x-6 sm:space-y-0 py-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-black dark:text-white mb-2">
                    Select Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={proposalDate}
                    onSelect={setProposalDate}
                    className="rounded-md border-[#F3CFC6] bg-white dark:bg-gray-800 shadow-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-black dark:text-white mb-2">
                    Available Times
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {allSlots.map((time) => (
                      <motion.div
                        key={time}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={
                            selectedSlots.includes(time) ? "default" : "outline"
                          }
                          className={`w-full text-sm ${
                            selectedSlots.includes(time)
                              ? "bg-[#D8A7B1] text-white hover:bg-[#C68E9C]"
                              : "text-[#D8A7B1] border-[#F3CFC6] hover:bg-[#F3CFC6]/20"
                          } transition-colors duration-200`}
                          onClick={() => toggleSlot(time)}
                        >
                          {time}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="text-[#D8A7B1] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:text-[#F3CFC6] dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendProposal}
                  disabled={sending || !proposalDate || !selectedSlots.length}
                  className="bg-[#D8A7B1] hover:bg-[#C68E9C] text-white rounded-full px-6"
                >
                  {sending ? "Sending..." : "Send Proposal"}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default ProposalDialog;
