// components/DateTimeDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const allTimeSlots = [
  "12:00 AM",
  "12:30 AM",
  "1:00 AM",
  "1:30 AM",
  "2:00 AM",
  "2:30 AM",
  "3:00 AM",
  "3:30 AM",
  "4:00 AM",
  "4:30 AM",
  "5:00 AM",
  "5:30 AM",
  "6:00 AM",
  "6:30 AM",
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  selectedTime: string;
  availabilities: Record<string, string[]>;
  onDateSelect: (date: Date | undefined) => void;
  onTimeSelect: (time: string) => void;
  onApply: () => void;
}

export function DateTimeDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  availabilities,
  onDateSelect,
  onTimeSelect,
  onApply,
}: Props) {
  const isTimeAvailable = (time: string) =>
    Object.values(availabilities).some((slots) => slots.includes(time));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Date & Time</DialogTitle>
          <DialogDescription>Filter by availability</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
            />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Select Time</h4>
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
              {allTimeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className={cn(
                    selectedTime === time && "bg-[#F3CFC6] text-black",
                    !isTimeAvailable(time) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => onTimeSelect(time)}
                  disabled={!isTimeAvailable(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
            {!selectedDate && (
              <p className="text-sm text-gray-500">Select a date first</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={!selectedDate || !selectedTime}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
