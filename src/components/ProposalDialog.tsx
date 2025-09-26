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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

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
    setSelectedSlots([time]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="bg-white dark:bg-gray-800 sm:max-w-[600px] rounded-xl shadow-lg">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-black dark:text-white">
                  Propose Session
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
                              ? "bg-[#F3CFC6] text-black dark:text-white hover:bg-[#C4C4C4]"
                              : "text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
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
                  className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#F3CFC6]/20 dark:hover:bg-[#C4C4C4]/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendProposal}
                  disabled={sending || !proposalDate || !selectedSlots.length}
                  className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white"
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
