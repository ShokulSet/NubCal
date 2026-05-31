"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  /** Optional label to show while the form action is running. */
  pendingLabel?: React.ReactNode;
}

/**
 * Submit button that disables itself and shows a spinner while the enclosing
 * `<form action={…}>` is in flight — prevents the double-submits that were
 * silently inserting duplicate logs. Must be rendered inside a form.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel ?? (props.size === "icon" ? null : children)}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
