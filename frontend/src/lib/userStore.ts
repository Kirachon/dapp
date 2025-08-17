// Simple in-memory user store for testing
// In production, this would be replaced with a proper database

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  isOnboarded?: boolean;
}

const users: User[] = []

export const userStore = {
  create: (userData: Omit<User, 'id'>): User => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      isOnboarded: false,
    }
    users.push(user)
    return user
  },

  findByEmail: (email: string): User | undefined => {
    return users.find(user => user.email === email)
  },

  findById: (id: string): User | undefined => {
    return users.find(user => user.id === id)
  },

  update: (id: string, updates: Partial<User>): User | undefined => {
    const userIndex = users.findIndex(user => user.id === id)
    if (userIndex === -1) return undefined
    
    users[userIndex] = { ...users[userIndex], ...updates }
    return users[userIndex]
  },

  getAll: (): User[] => {
    return [...users]
  }
}
