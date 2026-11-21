import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FieldContext } from "./field-context";

interface FieldProps {
  label: ReactNode;
  /** Helper text shown under the control and linked via aria-describedby. */
  description?: ReactNode;
  /** Error message. When set the control is marked aria-invalid and the message is announced. */
  error?: ReactNode;
  required?: boolean;
  /** Visual hint shown next to the label for optional fields, e.g. "Optional". */
  optionalLabel?: ReactNode;
  className?: string;
  /** A form control that reads `useFieldControl()`, such as `Input`. */
  children: ReactNode;
}

/**
 * Label + control + description/error, wired together for assistive tech.
 * Controls inside pick up id, aria-describedby, aria-invalid and required
 * from context, so callers never juggle ids by hand.
 */
export function Field({
  label,
  description,
  error,
  required = false,
  optionalLabel,
  className,
  children,
}: FieldProps) {
  const id = useId();
  // The description is hidden while an error shows, so only reference it when rendered.
  const descriptionId = description && !error ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-[12px] font-medium text-foreground">
            {label}
          </label>
          {!required && optionalLabel && (
            <span className="text-[11px] text-muted-foreground">{optionalLabel}</span>
          )}
        </div>
        {children}
        {descriptionId && (
          <p id={descriptionId} className="text-[12px] text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[12px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
