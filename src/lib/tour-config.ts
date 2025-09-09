export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showSkip?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  action?: {
    type: 'click' | 'hover' | 'focus';
    element?: string;
  };
  validation?: {
    type: 'element-exists' | 'element-visible' | 'custom';
    selector?: string;
    customCheck?: () => boolean;
  };
}

export interface TourConfig {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  autoStart?: boolean;
  showProgress?: boolean;
  allowSkip?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const onboardingTourConfig: TourConfig = {
  id: 'onboarding-tour',
  name: 'Platform Tour',
  description: 'Get familiar with the key features of our platform',
  autoStart: true,
  showProgress: true,
  allowSkip: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Your Dashboard!',
      content: 'This is your personal dashboard where you can access all platform features. Let\'s take a quick tour to get you started.',
      target: '[data-tour="dashboard"]',
      placement: 'center',
      showSkip: true,
      showNext: true,
    },
    {
      id: 'navigation',
      title: 'Navigation Menu',
      content: 'Use this navigation menu to move between different sections of the platform. You can access your profile, settings, and other features from here.',
      target: '[data-tour="navigation"]',
      placement: 'right',
      showPrevious: true,
      showNext: true,
      showSkip: true,
    },
    {
      id: 'profile',
      title: 'Your Profile',
      content: 'This is your profile section. You can update your information, change your avatar, and manage your personal details here.',
      target: '[data-tour="profile"]',
      placement: 'bottom',
      showPrevious: true,
      showNext: true,
      showSkip: true,
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      content: 'Customize your experience by adjusting your preferences, changing themes, managing notifications, and more in the settings.',
      target: '[data-tour="settings"]',
      placement: 'bottom',
      showPrevious: true,
      showNext: true,
      showSkip: true,
    },
    {
      id: 'help',
      title: 'Need Help?',
      content: 'If you ever need assistance, you can access help resources, documentation, and support from the help menu.',
      target: '[data-tour="help"]',
      placement: 'left',
      showPrevious: true,
      showNext: true,
      showSkip: true,
    },
    {
      id: 'complete',
      title: 'Tour Complete!',
      content: 'Great! You\'ve completed the platform tour. You can always access this tour again from the help menu. Enjoy exploring the platform!',
      target: 'body',
      placement: 'center',
      showPrevious: true,
      showSkip: false,
    },
  ],
};

export const tourStepValidation = {
  validateStep: (step: TourStep): boolean => {
    if (!step.validation) return true;

    switch (step.validation.type) {
      case 'element-exists':
        return !!document.querySelector(step.validation.selector || step.target);
      
      case 'element-visible':
        const element = document.querySelector(step.validation.selector || step.target);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      
      case 'custom':
        return step.validation.customCheck ? step.validation.customCheck() : true;
      
      default:
        return true;
    }
  },

  getTargetElement: (selector: string): Element | null => {
    return document.querySelector(selector);
  },

  scrollToTarget: (element: Element): void => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  },

  highlightElement: (element: Element): void => {
    element.classList.add('tour-highlight');
    setTimeout(() => {
      element.classList.remove('tour-highlight');
    }, 2000);
  },
};

export const tourAnalytics = {
  trackTourStart: (tourId: string) => {
    console.log(`Tour started: ${tourId}`);
    // TODO: Implement analytics tracking
  },

  trackStepView: (tourId: string, stepId: string, stepIndex: number) => {
    console.log(`Tour step viewed: ${tourId} - ${stepId} (${stepIndex})`);
    // TODO: Implement analytics tracking
  },

  trackTourComplete: (tourId: string, timeSpent: number) => {
    console.log(`Tour completed: ${tourId} in ${timeSpent}ms`);
    // TODO: Implement analytics tracking
  },

  trackTourSkip: (tourId: string, stepId: string, timeSpent: number) => {
    console.log(`Tour skipped: ${tourId} at ${stepId} after ${timeSpent}ms`);
    // TODO: Implement analytics tracking
  },

  trackStepAction: (tourId: string, stepId: string, action: string) => {
    console.log(`Tour action: ${tourId} - ${stepId} - ${action}`);
    // TODO: Implement analytics tracking
  },
};
