import { useId } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional icon shown in the trigger and menu item. */
  icon?: React.ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const TRIGGER =
  "flex h-8 w-full items-center gap-2 rounded border border-input bg-transparent px-2 text-[13px] text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 coarse:h-10 coarse:text-base";
const ITEM =
  "flex h-8 cursor-pointer select-none items-center gap-2 rounded px-2 text-[13px] text-foreground outline-none transition-colors data-[highlighted]:bg-foreground/10 data-[highlighted]:text-foreground coarse:h-10";

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  id: externalId,
  className,
  disabled,
}: SelectProps<T>) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const selected = options.find((o) => o.value === value);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-medium text-foreground">
          {label}
        </label>
      )}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button id={id} type="button" className={cn(TRIGGER, className)}>
            {selected?.icon && (
              <span className="shrink-0 text-muted-foreground">{selected.icon}</span>
            )}
            <span className="flex-1 truncate text-left">{selected?.label ?? value}</span>
            <ChevronDown
              size={12}
              strokeWidth={1.5}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] animate-fade-in rounded-md border border-border bg-card p-1 shadow-lg"
          >
            {options.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => onChange(option.value)}
                className={ITEM}
              >
                {option.icon && (
                  <span className="shrink-0 text-muted-foreground">{option.icon}</span>
                )}
                <span className="flex-1">{option.label}</span>
                {option.value === value && (
                  <Check
                    size={12}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="shrink-0 text-foreground"
                  />
                )}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
