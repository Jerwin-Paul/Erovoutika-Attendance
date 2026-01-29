import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type LoginRequest, type User } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Storage key for persisting user session
const USER_STORAGE_KEY = "attendance_user";

// Helper to get stored user from localStorage
function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch {
    // Invalid stored data
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  return null;
}

// Helper to store user in localStorage
function storeUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for existing session from localStorage
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      // Return stored user (persisted login)
      return getStoredUser();
    },
    retry: false,
    staleTime: Infinity, // Don't refetch automatically
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      // Store user in localStorage for persistence
      storeUser(user);
      queryClient.setQueryData(["auth-user"], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.fullName}` });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Clear localStorage
      storeUser(null);
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      setLocation("/login");
      toast({ title: "Logged out", description: "See you next time!" });
    },
    onError: (error) => {
      // Even if API call fails, clear local state
      storeUser(null);
      queryClient.setQueryData(["auth-user"], null);
      queryClient.clear();
      setLocation("/login");
      toast({ title: "Logged out", description: "See you next time!" });
    },
  });

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const user = await response.json();
        storeUser(user);
        queryClient.setQueryData(["auth-user"], user);
      } else {
        // If API call fails, clear stored user
        storeUser(null);
        queryClient.setQueryData(["auth-user"], null);
      }
    } catch (error) {
      // If API call fails, clear stored user
      storeUser(null);
      queryClient.setQueryData(["auth-user"], null);
    }
  };

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refreshUser,
  };
}
