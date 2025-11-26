// components/professionals/DateTimeDialog.tsx
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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onApply: () => void;
  timeRange: [number, number];
  setTimeRange: (range: [number, number]) => void;
}

export function DateTimeDialog({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
  onApply,
  timeRange,
  setTimeRange,
}: Props) {
  const startTime = minutesToTime(timeRange[0]);
  const endTime = minutesToTime(timeRange[1]);

  const handleClearDate = () => {
    onDateSelect(undefined);
    setTimeRange([0, 1410]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Date & Time Range</DialogTitle>
          <DialogDescription>
            Choose a date and time window to filter professionals by
            availability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar - All dates available */}
          <div className="border rounded-lg p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              className="mx-auto"
            />
          </div>

          {/* Time Range - Full 24 hours */}
          <div className="space-y-4">
            <Label>Time Range</Label>
            <div className="px-2">
              <Slider
                value={timeRange}
                onValueChange={(value) =>
                  setTimeRange(value as [number, number])
                }
                min={0}
                max={1410}
                step={30}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <span>{startTime}</span>
              <span>to</span>
              <span>{endTime}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Drag the handles to set your preferred time window
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleClearDate}
            className="text-destructive hover:text-destructive"
          >
            Clear Date
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onApply}>Apply</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
