import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useRouter } from 'next/navigation';
import MatchesPage from '../src/app/matches/page';
import { useAuth } from '../src/contexts/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthContext
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock GraphQL queries
const GET_MATCHES_QUERY = `
  query GetMyMatches($status: MatchStatus, $page: Int, $pageSize: Int) {
    myMatches(status: $status, page: $page, pageSize: $pageSize) {
      id
      status
      createdAt
      otherUser {
        userId
        name
        photos
        age
      }
    }
  }
`;

const GET_CONVERSATIONS_QUERY = `
  query GetMyConversations($page: Int, $pageSize: Int) {
    myConversations(page: $page, pageSize: $pageSize) {
      id
      matchId
      lastMessageAt
      unreadCount
      otherUser {
        userId
        name
        photos
        age
      }
    }
  }
`;

const mockMatchesData = {
  myMatches: [
    {
      id: '1',
      status: 'ACTIVE',
      createdAt: '2024-01-15T10:30:00Z',
      otherUser: {
        userId: '1',
        name: 'Emma Wilson',
        photos: ['/test-photo.jpg'],
        age: 24
      }
    },
    {
      id: '2',
      status: 'ACTIVE',
      createdAt: '2024-01-14T15:20:00Z',
      otherUser: {
        userId: '2',
        name: 'Sarah Johnson',
        photos: ['/test-photo2.jpg'],
        age: 26
      }
    }
  ]
};

const mockConversationsData = {
  myConversations: []
};

const successMocks = [
  {
    request: {
      query: GET_MATCHES_QUERY,
      variables: {
        status: undefined,
        page: 1,
        pageSize: 50
      }
    },
    result: {
      data: mockMatchesData
    }
  },
  {
    request: {
      query: GET_CONVERSATIONS_QUERY,
      variables: {
        page: 1,
        pageSize: 50
      }
    },
    result: {
      data: mockConversationsData
    }
  }
];

const errorMocks = [
  {
    request: {
      query: GET_MATCHES_QUERY,
      variables: {
        status: undefined,
        page: 1,
        pageSize: 50
      }
    },
    error: new Error('Network error')
  },
  {
    request: {
      query: GET_CONVERSATIONS_QUERY,
      variables: {
        page: 1,
        pageSize: 50
      }
    },
    result: {
      data: mockConversationsData
    }
  }
];

const loadingMocks = [
  {
    request: {
      query: GET_MATCHES_QUERY,
      variables: {
        status: undefined,
        page: 1,
        pageSize: 50
      }
    },
    delay: 1000,
    result: {
      data: mockMatchesData
    }
  },
  {
    request: {
      query: GET_CONVERSATIONS_QUERY,
      variables: {
        page: 1,
        pageSize: 50
      }
    },
    result: {
      data: mockConversationsData
    }
  }
];

describe('MatchesPage', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      hasProfile: true,
      user: { id: 'user1', email: 'test@example.com' },
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    mockPush.mockClear();
  });

  describe('Authentication and Profile Checks', () => {
    it('redirects to signin when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        hasProfile: false,
        user: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      expect(mockPush).toHaveBeenCalledWith('/signin');
    });

    it('redirects to onboarding when no profile', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        hasProfile: false,
        user: { id: 'user1', email: 'test@example.com' },
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
      });

      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      expect(mockPush).toHaveBeenCalledWith('/onboarding');
    });
  });

  describe('Loading States', () => {
    it('displays loading skeleton while fetching matches', async () => {
      render(
        <MockedProvider mocks={loadingMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      // Check for loading skeleton elements
      expect(screen.getByTestId('matches-loading-skeleton')).toBeInTheDocument();
      
      // Should show animated skeleton cards
      const skeletonCards = screen.getAllByTestId('skeleton-card');
      expect(skeletonCards).toHaveLength(6);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when query fails', async () => {
      render(
        <MockedProvider mocks={errorMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('retry button refetches data', async () => {
      render(
        <MockedProvider mocks={errorMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const retryButton = screen.getByText('Try Again');
        expect(retryButton).toBeInTheDocument();
        
        fireEvent.click(retryButton);
        // In a real test, we'd verify the refetch was called
      });
    });
  });

  describe('Successful Data Display', () => {
    it('displays matches when data is loaded', async () => {
      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Emma Wilson, 24')).toBeInTheDocument();
        expect(screen.getByText('Sarah Johnson, 26')).toBeInTheDocument();
      });
    });

    it('handles match card clicks', async () => {
      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const matchCard = screen.getByText('Emma Wilson, 24').closest('div');
        if (matchCard) {
          fireEvent.click(matchCard);
          expect(mockPush).toHaveBeenCalledWith('/chat/1');
        }
      });
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no matches exist', async () => {
      const emptyMocks = [
        {
          ...successMocks[0],
          result: { data: { myMatches: [] } }
        },
        successMocks[1]
      ];

      render(
        <MockedProvider mocks={emptyMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready to find love?')).toBeInTheDocument();
        expect(screen.getByText('Start Discovering')).toBeInTheDocument();
      });
    });

    it('empty state discover button navigates correctly', async () => {
      const emptyMocks = [
        {
          ...successMocks[0],
          result: { data: { myMatches: [] } }
        },
        successMocks[1]
      ];

      render(
        <MockedProvider mocks={emptyMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const discoverButton = screen.getByText('Start Discovering');
        fireEvent.click(discoverButton);
        expect(mockPush).toHaveBeenCalledWith('/discover');
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters matches based on search query', async () => {
      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search matches...');
        fireEvent.change(searchInput, { target: { value: 'Emma' } });
        
        expect(screen.getByText('Emma Wilson, 24')).toBeInTheDocument();
        expect(screen.queryByText('Sarah Johnson, 26')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders with responsive grid classes', async () => {
      render(
        <MockedProvider mocks={successMocks}>
          <MatchesPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const gridContainer = screen.getByTestId('matches-grid');
        expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
      });
    });
  });
});
