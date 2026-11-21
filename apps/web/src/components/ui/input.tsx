import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useFieldControl } from "./field-context";

const inputVariants = cva(
  "flex w-full border border-input bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
  {
    variants: {
      size: {
        default: "h-10 rounded-md px-3 py-2 text-sm",
        sm: "h-8 rounded px-2.5 text-[13px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> &
  VariantProps<typeof inputVariants>;

/** Text input. Inside a `Field` it is labelled and described automatically. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, ...props },
  ref,
) {
  const field = useFieldControl();
  return (
    <input
      ref={ref}
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      aria-required={field?.required || undefined}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
});
