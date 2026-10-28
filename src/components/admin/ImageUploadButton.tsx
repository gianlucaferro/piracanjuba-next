"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ImageUploadButtonProps = {
  children: ReactNode;
  label: string;
  disabled: boolean;
  variant: ComponentProps<typeof Button>["variant"];
  onFileSelect: (file: File) => void | Promise<void>;
};

export function ImageUploadButton({ children, label, disabled, variant, onFileSelect }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFileSelect(file);
          event.target.value = "";
        }}
      />
      <Button type="button" variant={variant} size="sm" disabled={disabled} aria-label={label} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
    </>
  );
}
