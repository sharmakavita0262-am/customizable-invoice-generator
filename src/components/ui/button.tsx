import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive";
type Size = "sm" | "md";
type IconSize = "icon-sm" | "icon-md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-sm",
  secondary: "border border-line-strong/60 bg-surface text-ink hover:bg-paper",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
  danger: "text-danger hover:bg-danger-soft",
  /** Solid red, for the confirm button of an irreversible action. */
  destructive: "bg-danger text-white hover:bg-danger/90 shadow-sm",
};

const SIZES: Record<Size | IconSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  "icon-sm": "size-8",
  "icon-md": "size-10",
};

/** Class names for anything that should look like a button (also used on links). */
export function buttonClasses({
  variant = "secondary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size | IconSize; className?: string } = {}) {
  return [
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(" ");
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size | IconSize }) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Square icon-only button. `label` is required so screen readers can announce it. */
export function IconButton({
  label,
  variant = "ghost",
  size = "sm",
  className = "",
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & { label: string; variant?: Variant; size?: Size }) {
  return (
    <Button
      variant={variant}
      size={size === "md" ? "icon-md" : "icon-sm"}
      aria-label={label}
      title={label}
      className={className}
      {...props}
    />
  );
}
