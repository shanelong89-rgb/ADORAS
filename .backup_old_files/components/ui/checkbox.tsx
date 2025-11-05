"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const [isChecked, setIsChecked] = React.useState(false);
  
  React.useEffect(() => {
    if (props.checked !== undefined) {
      setIsChecked(props.checked as boolean);
    }
  }, [props.checked]);

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border bg-input-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        backgroundColor: isChecked ? 'rgb(54, 69, 59)' : undefined,
        borderColor: isChecked ? 'rgb(54, 69, 59)' : undefined,
      }}
      onCheckedChange={(checked) => {
        setIsChecked(checked as boolean);
        if (props.onCheckedChange) {
          props.onCheckedChange(checked);
        }
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center transition-none"
      >
        <CheckIcon className="size-3.5" style={{ color: 'rgb(255, 255, 255)' }} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
