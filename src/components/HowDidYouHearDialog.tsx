// src/components/HowDidYouHearDialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const hearOptions = [
  "Social Media (e.g., Facebook, Instagram, X)",
  "Search Engine (e.g., Google)",
  "Friend or Family Referral",
  "Online Advertisement",
  "Podcast or Radio",
  "Email Newsletter",
  "Event or Workshop",
  "Professional Network (e.g., LinkedIn)",
  "Other",
] as const;

const schema = z
  .object({
    heardFrom: z.enum(hearOptions),
    heardFromOther: z.string().optional(),
  })
  .refine(
    (data) => data.heardFrom !== "Other" || !!data.heardFromOther?.trim(),
    {
      message: "Please specify how you heard about us",
      path: ["heardFromOther"],
    }
  );

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof schema>) => Promise<void>;
};

export default function HowDidYouHearDialog({
  open,
  onOpenChange,
  onSubmit,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      heardFrom: undefined,
      heardFromOther: "",
    },
  });

  const heardFrom = form.watch("heardFrom");

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    setIsLoading(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How did you hear about Hug Harmony?</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="heardFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select an option</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose one..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hearOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {heardFrom === "Other" && (
              <FormField
                control={form.control}
                name="heardFromOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please specify</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us how you found us..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
