import { ReactNode } from 'react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'zoom-in';
  delay?: number;
  duration?: number;
}

export function AnimatedSection({ 
  children, 
  className = '', 
  animation = 'fade-up',
  delay = 0,
  duration = 600
}: AnimatedSectionProps) {
  const { ref, isInView } = useInViewAnimation({ 
    threshold: 0.1, 
    triggerOnce: true,
    rootMargin: '0px 0px -50px 0px'
  });

  const animationClasses = {
    'fade-up': isInView 
      ? 'opacity-100 translate-y-0' 
      : 'opacity-0 translate-y-8',
    'fade-in': isInView 
      ? 'opacity-100' 
      : 'opacity-0',
    'slide-left': isInView 
      ? 'opacity-100 translate-x-0' 
      : 'opacity-0 translate-x-8',
    'slide-right': isInView 
      ? 'opacity-100 translate-x-0' 
      : 'opacity-0 -translate-x-8',
    'zoom-in': isInView 
      ? 'opacity-100 scale-100' 
      : 'opacity-0 scale-95'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out',
        animationClasses[animation],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}