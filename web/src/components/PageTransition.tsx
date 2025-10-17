import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {children}
    </div>
  );
}