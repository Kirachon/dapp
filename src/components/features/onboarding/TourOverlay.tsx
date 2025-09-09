'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTour } from '@/components/providers/TourProvider';
import { TourTooltip } from './TourTooltip';
import { tourStepValidation } from '@/lib/tour-config';
import { cn } from '@/lib/utils';

interface TourOverlayProps {
  className?: string;
}

export function TourOverlay({ className }: TourOverlayProps) {
  const { tourState } = useTour();
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tourState.isActive || !tourState.currentStepData) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    const step = tourState.currentStepData;
    
    // Find target element
    const element = tourStepValidation.getTargetElement(step.target);
    
    if (element) {
      setTargetElement(element);
      
      // Scroll to target if needed
      tourStepValidation.scrollToTarget(element);
      
      // Highlight element
      tourStepValidation.highlightElement(element);
      
      // Update target rect
      const updateRect = () => {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      };
      
      updateRect();
      
      // Update rect on scroll/resize
      const handleUpdate = () => updateRect();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    } else {
      // If target not found, show center overlay
      setTargetElement(null);
      setTargetRect(null);
    }
  }, [tourState.isActive, tourState.currentStepData]);

  // Don't render if tour is not active
  if (!tourState.isActive || !tourState.currentStepData) {
    return null;
  }

  const step = tourState.currentStepData;
  const isCenter = step.placement === 'center' || !targetElement || !targetRect;

  return createPortal(
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 pointer-events-none',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-content"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" />
      
      {/* Spotlight effect for targeted elements */}
      {!isCenter && targetRect && (
        <div
          className="absolute bg-white/10 border-2 border-blue-400 rounded-lg shadow-lg transition-all duration-300"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: `
              0 0 0 4px rgba(59, 130, 246, 0.3),
              0 0 0 9999px rgba(0, 0, 0, 0.5)
            `,
          }}
        />
      )}
      
      {/* Tour Tooltip */}
      <div className="pointer-events-auto">
        <TourTooltip
          step={step}
          targetRect={targetRect}
          isCenter={isCenter}
        />
      </div>
    </div>,
    document.body
  );
}

// CSS for tour highlight effect
export const tourStyles = `
  .tour-highlight {
    animation: tour-pulse 2s ease-in-out;
    position: relative;
    z-index: 51;
  }
  
  @keyframes tour-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
    }
  }
`;
