import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MapPin, Search, AlertCircle, X } from "lucide-react";
import { LocationResult } from "@/types/edit-profile";

interface Props {
  value: string;
  onChange: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  suggestions: LocationResult[];
  loading: boolean;
  error: string | null;
  disabled: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  searchTerm,
  setSearchTerm,
  suggestions,
  loading,
  error,
  disabled,
}: Props) {
  return (
    <div className="space-y-2">
      <Popover
        open={!!searchTerm.trim()}
        onOpenChange={(open) => !open && setSearchTerm("")}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              type="search"
              placeholder="Search city, address, or place..."
              value={disabled ? value : searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.trim()) open();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              disabled={disabled}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] pr-10"
              autoComplete="off"
            />
            {searchTerm && !disabled && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm">
              <Search className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          ) : suggestions.length === 0 && searchTerm ? (
            <div className="p-3 text-sm text-muted-foreground">
              No locations found
            </div>
          ) : (
            <div className="max-h-64 overflow-auto">
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-3"
                  onClick={() => {
                    onChange(item.display_name);
                    setSearchTerm("");
                  }}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <input type="hidden" name="location" value={value || ""} />

      {!searchTerm && value && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {value}
        </p>
      )}
    </div>
  );
}
