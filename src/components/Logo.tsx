import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo-waswia.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
}

const sizes = {
  sm: { height: 32 },
  md: { height: 40 },
  lg: { height: 56 },
  xl: { height: 72 },
};

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const { height } = sizes[size];

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logoImage} 
        alt="WASWIA" 
        style={{ height }}
        className="object-contain"
      />
    </div>
  );
}
