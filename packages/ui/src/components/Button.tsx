import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "px-6 py-3 text-sm tracking-wide transition-colors rounded-sm";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-paper text-ink hover:bg-white",
    secondary: "border border-white/15 text-paper hover:border-white/30",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
