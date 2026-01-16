type LogoColor = "white" | "black";

const LOGO_COLOR_CLASSES: Record<LogoColor, string> = {
  white: "text-white",
  black: "text-black",
};

interface BrandLogoProps {
  color?: LogoColor;
  className?: string;
}

export default function BrandLogo({ color = "white", className }: BrandLogoProps) {
  const classes = [
    "inline-block",
    "bg-current",
    "h-5",
    "w-[120px]",
    LOGO_COLOR_CLASSES[color],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      role="img"
      aria-label="Funding Dashboard logo"
      className={classes}
      style={{
        maskImage: "url('/brand/logo.svg')",
        WebkitMaskImage: "url('/brand/logo.svg')",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}
