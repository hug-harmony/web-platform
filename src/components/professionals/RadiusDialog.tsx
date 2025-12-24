// components/professionals/RadiusDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { MapPin, Search, X, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// FIXED: Correct import path for DynamicMap
const DynamicMap = dynamic(
  () => import("@/components/professionals/DynamicMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    ),
  }
);

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
  onTempUnitChange: (v: "km" | "miles") => void;
  onApply: () => void;
}

const radiusOptions = [1, 5, 10, 25, 50, 100];

export function RadiusDialog({
  open,
  onOpenChange,
  tempLat,
  tempLng,
  tempLocation,
  tempRadius,
  tempUnit,
  onTempLatChange,
  onTempLngChange,
  onTempLocationChange,
  onTempRadiusChange,
  onTempUnitChange,
  onApply,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm] = useDebounce(searchTerm, 300);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [geolocationStatus, setGeolocationStatus] = useState<
    "idle" | "loading" | "denied" | "success"
  >("idle");

  const inputRef = useRef<HTMLInputElement>(null);

  const hasLocation = tempLat !== undefined && tempLng !== undefined;

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7&lang=en`
      );

      if (!res.ok) throw new Error("Search service unavailable");

      const data = await res.json();

      const results: LocationResult[] = (data.features || [])
        .map((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [];
          const name = props.name || props.street || props.city || "Location";

          return {
            lat: coords[1]?.toString() || "0",
            lon: coords[0]?.toString() || "0",
            display_name: props.country ? `${name}, ${props.country}` : name,
          };
        })
        .filter((r: LocationResult) => r.lat && r.lon);

      setSuggestions(results.slice(0, 7));
    } catch (err) {
      console.error("Photon search error:", err);
      setError("Search failed. Please try again.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedTerm);
  }, [debouncedTerm, fetchSuggestions]);

  const selectSuggestion = (item: LocationResult) => {
    onTempLatChange(parseFloat(item.lat));
    onTempLngChange(parseFloat(item.lon));
    onTempLocationChange(item.display_name);
    setSearchTerm("");
    setPopoverOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const handleCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      setGeolocationStatus("denied");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGeolocationStatus("loading");

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        });
      });

      onTempLatChange(pos.coords.latitude);
      onTempLngChange(pos.coords.longitude);
      onTempLocationChange("Current Location");
      setGeolocationStatus("success");
      setError(null);
      setSearchTerm("");
      setPopoverOpen(false);
    } catch (err: any) {
      setGeolocationStatus("denied");
      setError(
        err.code === 1
          ? "Location access denied. Please enable it in browser settings."
          : "Unable to retrieve location. Try searching manually."
      );
    }
  };

  const handleApply = () => {
    if (!hasLocation) return;
    onApply();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Search Radius</DialogTitle>
          <DialogDescription>
            Choose a location and radius to find professionals nearby.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Search */}
          <div className="flex gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    placeholder="Search city, address, or place..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPopoverOpen(!!e.target.value.trim());
                    }}
                    onFocus={() => searchTerm.trim() && setPopoverOpen(true)}
                    className="w-full pr-10"
                    autoComplete="off"
                    aria-label="Search for a location"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setPopoverOpen(false);
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </PopoverTrigger>

              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {loading ? (
                  <div className="flex items-center gap-2 p-3 text-sm">
                    <Search
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Searching...</span>
                  </div>
                ) : error ? (
                  <div className="p-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {error}
                  </div>
                ) : suggestions.length === 0 && searchTerm ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No locations found
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto" role="listbox">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
                        )}
                        onClick={() => selectSuggestion(item)}
                      >
                        <MapPin
                          className="h-4 w-4 text-muted-foreground flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={handleCurrentLocation}
              disabled={geolocationStatus === "loading"}
              title="Use my current location"
              aria-label="Use current location"
            >
              {geolocationStatus === "loading" ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* Selected Location Display */}
          {hasLocation && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">
                {tempLocation || "Selected location"}
              </span>
            </div>
          )}

          {/* Map Preview */}
          <div className="h-64 rounded-lg overflow-hidden bg-muted border">
            {hasLocation ? (
              <DynamicMap
                lat={tempLat!}
                lng={tempLng!}
                radiusMeters={
                  tempUnit === "km" ? tempRadius * 1000 : tempRadius * 1609.34
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Select a location to see the search area</p>
              </div>
            )}
          </div>

          {/* Radius & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="radius-select">Radius</Label>
              <Select
                value={tempRadius.toString()}
                onValueChange={(v) => onTempRadiusChange(parseInt(v))}
              >
                <SelectTrigger id="radius-select" aria-label="Select radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      {r} {tempUnit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit-select">Unit</Label>
              <Select
                value={tempUnit}
                onValueChange={(v) => onTempUnitChange(v as "km" | "miles")}
              >
                <SelectTrigger id="unit-select" aria-label="Select unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilometers</SelectItem>
                  <SelectItem value="miles">Miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleApply}
            disabled={!hasLocation}
            className="w-full bg-[#F3CFC6] text-black hover:bg-[#fff]/80"
            size="lg"
          >
            {hasLocation ? "Apply Filter" : "Select a Location First"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
