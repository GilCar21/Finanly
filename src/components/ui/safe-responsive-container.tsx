import React from "react";
import { ResponsiveContainer } from "recharts";

interface SafeResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function SafeResponsiveContainer({
  children,
  className = "",
}: SafeResponsiveContainerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(0, Math.round(width)),
        height: Math.max(0, Math.round(height)),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`h-full w-full min-w-0 ${className}`.trim()}>
      {size.width > 0 && size.height > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
