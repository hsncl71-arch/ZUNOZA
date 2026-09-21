import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[color,background-color,transform] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none min-h-11 px-4 text-sm",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent/90",
        gold: "bg-gold text-bg hover:bg-gold/90",
        secondary: "border border-border bg-elevated text-fg hover:bg-surface",
        ghost: "text-muted hover:text-fg hover:bg-elevated",
        danger: "bg-danger text-fg hover:bg-danger/90",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={twMerge(clsx(buttonVariants({ variant }), className))} {...props} />;
}
