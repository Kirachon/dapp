'use client';

import { useTour } from '@/components/providers/TourProvider';
import { TourStep } from '@/lib/tour-config';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';

interface TourTooltipProps {
  step: TourStep;
  targetRect: DOMRect | null;
  isCenter: boolean;
}

export function TourTooltip({ step, targetRect, isCenter }: TourTooltipProps) {
  const { 
    tourState, 
    nextStep, 
    previousStep, 
    skipTour, 
    completeTour,
    isFirstStep, 
    isLastStep 
  } = useTour();

  const getTooltipPosition = () => {
    if (isCenter || !targetRect) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '90vw',
        width: '400px',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Approximate height
    
    let top = 0;
    let left = 0;
    let transform = '';

    switch (step.placement) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%)';
        break;
      
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        transform = 'translateX(-50%)';
        break;
      
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - tooltipWidth - padding;
        transform = 'translateY(-50%)';
        break;
      
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        transform = 'translateY(-50%)';
        break;
      
      default:
        // Center fallback
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '90vw',
          width: '400px',
        };
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) {
      left = padding;
      transform = '';
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
      transform = '';
    }

    if (top < padding) {
      top = padding;
      if (transform.includes('translateY')) {
        transform = '';
      }
    } else if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
      if (transform.includes('translateY')) {
        transform = '';
      }
    }

    return {
      position: 'absolute' as const,
      top,
      left,
      transform,
      width: `${tooltipWidth}px`,
    };
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
    } else {
      nextStep();
    }
  };

  const tooltipStyle = getTooltipPosition();

  return (
    <div
      style={tooltipStyle}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 z-50',
        'animate-in fade-in-0 zoom-in-95 duration-200'
      )}
      role="dialog"
      aria-labelledby="tour-title"
      aria-describedby="tour-content"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 
            id="tour-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {step.title}
          </h3>
          {tourState.tourConfig?.showProgress && (
            <div className="mt-2">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Step {tourState.currentStep + 1} of {tourState.totalSteps}
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((tourState.currentStep + 1) / tourState.totalSteps) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {step.showSkip && (
          <button
            onClick={skipTour}
            className="ml-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Skip tour"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div 
        id="tour-content"
        className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed"
      >
        {step.content}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {step.showPrevious && !isFirstStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              className="flex items-center space-x-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          )}
        </div>

        <div className="flex space-x-2">
          {step.showSkip && !isLastStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip Tour
            </Button>
          )}
          
          {step.showNext !== false && (
            <Button
              size="sm"
              onClick={handleNext}
              className="flex items-center space-x-1"
            >
              {isLastStep ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Complete</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Arrow pointer for non-center tooltips */}
      {!isCenter && targetRect && (
        <div
          className={cn(
            'absolute w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rotate-45',
            {
              'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0': step.placement === 'top',
              'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0': step.placement === 'bottom',
              'top-1/2 left-full -translate-y-1/2 -translate-x-1/2 border-t-0 border-r-0': step.placement === 'left',
              'top-1/2 right-full -translate-y-1/2 translate-x-1/2 border-b-0 border-l-0': step.placement === 'right',
            }
          )}
        />
      )}
    </div>
  );
}
