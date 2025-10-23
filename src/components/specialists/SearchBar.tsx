// components/SearchBar.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface Props {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onClear: () => void;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  onApply,
  onClear,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          type="text"
          placeholder="Search Professionals..."
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-12 pr-10 py-3 rounded-full border border-[#F3CFC6] focus:ring-2 focus:ring-[#F3CFC6]/50"
        />
      </div>
      <div className="flex gap-4">
        <Button
          onClick={onApply}
          className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
        >
          Search
        </Button>
        <Button
          variant="outline"
          onClick={onClear}
          className="border-[#F3CFC6] text-[#F3CFC6] hover:bg-[#F3CFC6]/20"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
