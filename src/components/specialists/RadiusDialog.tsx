"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./DynamicMap"), { ssr: false });

interface LocationResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempLat?: number;
  tempLng?: number;
  tempLocation: string;
  tempRadius: number;
  tempUnit: "km" | "miles";
  onTempLatChange: (v: number | undefined) => void;
  onTempLngChange: (v: number | undefined) => void;
  onTempLocationChange: (v: string) => void;
  onTempRadiusChange: (v: number) => void;
  onApply: () => void;
}

const radiusOptions = [1, 5, 10, 25, 50, 100];

const NOMINATIM_BASE =
  process.env.NEXT_PUBLIC_NOMINATIM_URL ||
  "https://nominatim.openstreetmap.org";

export function RadiusDialog({
  open,
  onOpenChange,
  tempLat,
  tempLng,
  tempRadius,
  tempUnit,
  onTempLatChange,
  onTempLngChange,
  onTempLocationChange,
  onTempRadiusChange,
  onApply,
}: Props) {
  // ---- search input -------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm] = useDebounce(searchTerm, 300);

  // ---- suggestions --------------------------------------------------------
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // ---- fetch suggestions --------------------------------------------------
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=6&addressdetails=1`,
        {
          headers: {
            // REQUIRED by Nominatim policy
            "User-Agent": "YourAppName/1.0 (+https://yourdomain.com)", // <-- CHANGE THIS
          },
        }
      );
      const data: LocationResult[] = await res.json();
      setSuggestions(data);
    } catch {
      // silently fail – UI will just show no results
    } finally {
      setLoading(false);
    }
  }, []);

  // trigger search on debounced term
  useEffect(() => {
    fetchSuggestions(debouncedTerm);
  }, [debouncedTerm, fetchSuggestions]);

  // ---- select a suggestion ------------------------------------------------
  const selectSuggestion = (item: LocationResult) => {
    onTempLatChange(parseFloat(item.lat));
    onTempLngChange(parseFloat(item.lon));
    onTempLocationChange(item.display_name);
    setSearchTerm(""); // clear input, keep the nice display name in the map
    setPopoverOpen(false);
  };

  // ---- current location ---------------------------------------------------
  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onTempLatChange(pos.coords.latitude);
        onTempLngChange(pos.coords.longitude);
        onTempLocationChange("Current Location");
        setSearchTerm("");
        setPopoverOpen(false);
      },
      () => alert("Location access denied")
    );
  };

  // ------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Search Radius</DialogTitle>
          <DialogDescription>
            Choose a radius to filter professionals near your location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ---- Search + Current Location ---- */}
          <div className="flex gap-2">
            <Popover
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              modal={false}
            >
              {/* ---------- 1. Trigger (outside the Input) ---------- */}
              <PopoverTrigger asChild>
                <div className="flex-1 relative">
                  {/* ---------- 2. The real Input (never re-mounts) ---------- */}
                  <Input
                    placeholder="Search city, address..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      // keep popover open while typing
                      if (e.target.value) setPopoverOpen(true);
                    }}
                    onFocus={() => searchTerm && setPopoverOpen(true)}
                    className="w-full pr-10" // padding for optional clear button
                    autoComplete="off"
                  />
                  {/* optional clear-X */}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setPopoverOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </PopoverTrigger>

              {/* ---------- 3. Suggestions ---------- */}
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                sideOffset={4}
              >
                {loading ? (
                  <div className="flex items-center gap-2 p-3 text-sm">
                    <Search className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : suggestions.length === 0 && searchTerm ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No results found
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                          "flex items-center gap-2"
                        )}
                        onClick={() => selectSuggestion(item)}
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Current location button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleCurrentLocation}
              title="Use my current location"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>

          {/* ---- Map preview ---- */}
          <div className="h-64 rounded-lg overflow-hidden bg-muted">
            {tempLat !== undefined && tempLng !== undefined ? (
              <DynamicMap
                lat={tempLat}
                lng={tempLng}
                radiusMeters={
                  tempUnit === "km" ? tempRadius * 1000 : tempRadius * 1609.34
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Select a location above</p>
              </div>
            )}
          </div>

          {/* ---- Radius selector ---- */}
          <div className="flex flex-col gap-1.5">
            <Label>Radius</Label>
            <Select
              value={tempRadius.toString()}
              onValueChange={(v) => onTempRadiusChange(parseInt(v))}
            >
              <SelectTrigger className="border-[#F3CFC6]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((o) => (
                  <SelectItem key={o} value={o.toString()}>
                    {o} {tempUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ---- Apply ---- */}
          <Button
            onClick={onApply}
            className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80 w-full"
          >
            Apply Filter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
