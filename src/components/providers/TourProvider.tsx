'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TourConfig, TourStep, tourAnalytics } from '@/lib/tour-config';

interface TourState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  tourConfig: TourConfig | null;
  startTime: number | null;
}

interface TourContextType {
  tourState: TourState;
  startTour: (config: TourConfig) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  goToStep: (stepIndex: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [tourState, setTourState] = useState<TourState>({
    isActive: false,
    currentStep: 0,
    totalSteps: 0,
    currentStepData: null,
    tourConfig: null,
    startTime: null,
  });

  const startTour = useCallback((config: TourConfig) => {
    const startTime = Date.now();
    
    setTourState({
      isActive: true,
      currentStep: 0,
      totalSteps: config.steps.length,
      currentStepData: config.steps[0] || null,
      tourConfig: config,
      startTime,
    });

    // Save tour state to localStorage
    localStorage.setItem('tourState', JSON.stringify({
      tourId: config.id,
      currentStep: 0,
      startTime,
    }));

    tourAnalytics.trackTourStart(config.id);
  }, []);

  const nextStep = useCallback(() => {
    setTourState(prev => {
      if (!prev.tourConfig || prev.currentStep >= prev.totalSteps - 1) {
        return prev;
      }

      const nextStepIndex = prev.currentStep + 1;
      const nextStepData = prev.tourConfig.steps[nextStepIndex];

      // Track step view
      if (nextStepData) {
        tourAnalytics.trackStepView(prev.tourConfig.id, nextStepData.id, nextStepIndex);
      }

      const newState = {
        ...prev,
        currentStep: nextStepIndex,
        currentStepData: nextStepData,
      };

      // Update localStorage
      localStorage.setItem('tourState', JSON.stringify({
        tourId: prev.tourConfig.id,
        currentStep: nextStepIndex,
        startTime: prev.startTime,
      }));

      return newState;
    });
  }, []);

  const previousStep = useCallback(() => {
    setTourState(prev => {
      if (prev.currentStep <= 0) {
        return prev;
      }

      const prevStepIndex = prev.currentStep - 1;
      const prevStepData = prev.tourConfig?.steps[prevStepIndex] || null;

      const newState = {
        ...prev,
        currentStep: prevStepIndex,
        currentStepData: prevStepData,
      };

      // Update localStorage
      if (prev.tourConfig) {
        localStorage.setItem('tourState', JSON.stringify({
          tourId: prev.tourConfig.id,
          currentStep: prevStepIndex,
          startTime: prev.startTime,
        }));
      }

      return newState;
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setTourState(prev => {
      if (!prev.tourConfig || stepIndex < 0 || stepIndex >= prev.totalSteps) {
        return prev;
      }

      const stepData = prev.tourConfig.steps[stepIndex];

      // Track step view
      if (stepData) {
        tourAnalytics.trackStepView(prev.tourConfig.id, stepData.id, stepIndex);
      }

      const newState = {
        ...prev,
        currentStep: stepIndex,
        currentStepData: stepData,
      };

      // Update localStorage
      localStorage.setItem('tourState', JSON.stringify({
        tourId: prev.tourConfig.id,
        currentStep: stepIndex,
        startTime: prev.startTime,
      }));

      return newState;
    });
  }, []);

  const skipTour = useCallback(() => {
    setTourState(prev => {
      if (!prev.tourConfig || !prev.startTime) {
        return prev;
      }

      const timeSpent = Date.now() - prev.startTime;
      const currentStepId = prev.currentStepData?.id || 'unknown';
      
      tourAnalytics.trackTourSkip(prev.tourConfig.id, currentStepId, timeSpent);

      // Call onSkip callback if provided
      if (prev.tourConfig.onSkip) {
        prev.tourConfig.onSkip();
      }

      // Clear localStorage
      localStorage.removeItem('tourState');

      return {
        isActive: false,
        currentStep: 0,
        totalSteps: 0,
        currentStepData: null,
        tourConfig: null,
        startTime: null,
      };
    });
  }, []);

  const completeTour = useCallback(() => {
    setTourState(prev => {
      if (!prev.tourConfig || !prev.startTime) {
        return prev;
      }

      const timeSpent = Date.now() - prev.startTime;
      
      tourAnalytics.trackTourComplete(prev.tourConfig.id, timeSpent);

      // Call onComplete callback if provided
      if (prev.tourConfig.onComplete) {
        prev.tourConfig.onComplete();
      }

      // Clear localStorage
      localStorage.removeItem('tourState');

      return {
        isActive: false,
        currentStep: 0,
        totalSteps: 0,
        currentStepData: null,
        tourConfig: null,
        startTime: null,
      };
    });
  }, []);

  // Load tour state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('tourState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // TODO: Restore tour state if needed
        console.log('Saved tour state found:', parsed);
      } catch (error) {
        console.error('Failed to parse saved tour state:', error);
        localStorage.removeItem('tourState');
      }
    }
  }, []);

  const isFirstStep = tourState.currentStep === 0;
  const isLastStep = tourState.currentStep === tourState.totalSteps - 1;

  return (
    <TourContext.Provider value={{
      tourState,
      startTour,
      nextStep,
      previousStep,
      skipTour,
      completeTour,
      goToStep,
      isFirstStep,
      isLastStep,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
