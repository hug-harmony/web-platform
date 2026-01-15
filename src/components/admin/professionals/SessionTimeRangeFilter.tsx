// src/components/admin/professionals/SessionTimeRangeFilter.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface SessionTimeRangeFilterProps {
  value: {
    dateRange: DateRange | undefined;
    startTime: string;
    endTime: string;
  };
  onChange: (value: {
    dateRange: DateRange | undefined;
    startTime: string;
    endTime: string;
  }) => void;
  disabled?: boolean;
}

// Generate time slots from 00:00 to 23:30 in 30-minute intervals
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const time24 = `${hours.toString().padStart(2, "0")}:${minutes}`;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const time12 = `${hours12}:${minutes} ${period}`;
  return { value: time24, label: time12 };
});

export function SessionTimeRangeFilter({
  value,
  onChange,
  disabled = false,
}: SessionTimeRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    onChange({ ...value, dateRange: range });
  };

  const handleStartTimeChange = (time: string) => {
    onChange({ ...value, startTime: time });
  };

  const handleEndTimeChange = (time: string) => {
    onChange({ ...value, endTime: time });
  };

  const handleClear = () => {
    onChange({
      dateRange: undefined,
      startTime: "",
      endTime: "",
    });
    setIsOpen(false);
  };

  const hasValue = value.dateRange?.from || value.startTime || value.endTime;

  const getDisplayText = () => {
    const parts: string[] = [];

    if (value.dateRange?.from) {
      if (value.dateRange.to) {
        parts.push(
          `${format(value.dateRange.from, "MMM d")} - ${format(value.dateRange.to, "MMM d, yyyy")}`
        );
      } else {
        parts.push(format(value.dateRange.from, "MMM d, yyyy"));
      }
    }

    if (value.startTime && value.endTime) {
      const startLabel = TIME_SLOTS.find(
        (t) => t.value === value.startTime
      )?.label;
      const endLabel = TIME_SLOTS.find((t) => t.value === value.endTime)?.label;
      if (startLabel && endLabel) {
        parts.push(`${startLabel} - ${endLabel}`);
      }
    } else if (value.startTime) {
      const startLabel = TIME_SLOTS.find(
        (t) => t.value === value.startTime
      )?.label;
      if (startLabel) parts.push(`From ${startLabel}`);
    } else if (value.endTime) {
      const endLabel = TIME_SLOTS.find((t) => t.value === value.endTime)?.label;
      if (endLabel) parts.push(`Until ${endLabel}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "Select session time range";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`w-full justify-start text-left font-normal border-[#F3CFC6] ${
            !hasValue ? "text-muted-foreground" : ""
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate flex-1">{getDisplayText()}</span>
          {hasValue && (
            <X
              className="h-4 w-4 ml-2 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Calendar for date range selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select Date(s)
            </Label>
            <Calendar
              mode="range"
              selected={value.dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </div>

          {/* Time range selection */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Range (Optional)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Start Time</Label>
                <Select
                  value={value.startTime}
                  onValueChange={handleStartTimeChange}
                >
                  <SelectTrigger className="border-[#F3CFC6]">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">Any</SelectItem>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">End Time</Label>
                <Select
                  value={value.endTime}
                  onValueChange={handleEndTimeChange}
                >
                  <SelectTrigger className="border-[#F3CFC6]">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">Any</SelectItem>
                    {TIME_SLOTS.filter(
                      (slot) => !value.startTime || slot.value > value.startTime
                    ).map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear All
            </Button>
            <Button
              size="sm"
              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-black"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
