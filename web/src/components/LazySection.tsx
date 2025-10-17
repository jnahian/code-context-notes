import { ReactNode, Suspense } from 'react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function LazySection({ 
  children, 
  fallback = (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-orange"></div>
    </div>
  ),
  className = ''
}: LazySectionProps) {
  const { ref, isInView } = useInViewAnimation({ 
    threshold: 0.1, 
    triggerOnce: true,
    rootMargin: '200px 0px 200px 0px' // Load when 200px away from viewport
  });

  return (
    <div ref={ref} className={className}>
      {isInView ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        <div className="min-h-[400px]" /> // Placeholder to maintain layout
      )}
    </div>
  );
}