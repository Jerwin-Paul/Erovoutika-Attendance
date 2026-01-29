import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CreateUserRequest, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Helper to map database row (snake_case) to User type (camelCase)
function mapDbRowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    fullName: row.full_name,
    role: row.role,
    profilePicture: row.profile_picture,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useUsers(role?: "student" | "teacher" | "superadmin") {
  const queryKey = ["users", role];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      
      const response = await fetch(`/api/users/list?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User Created", description: "New user account has been successfully created." });
    },
    onError: (err) => {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User Deleted", description: "The user account has been removed." });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateUserRequest> }) => {
      // Map camelCase to snake_case for database
      const dbData: Record<string, any> = {};
      if (data.username !== undefined) dbData.username = data.username;
      if (data.email !== undefined) dbData.email = data.email;
      if (data.password !== undefined) dbData.password = data.password;
      if (data.fullName !== undefined) dbData.full_name = data.fullName;
      if (data.role !== undefined) dbData.role = data.role;
      if (data.profilePicture !== undefined) dbData.profile_picture = data.profilePicture;

      const { data: result, error } = await supabase
        .from("users")
        .update(dbData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message || "Failed to update user");
      }
      return mapDbRowToUser(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User Updated", description: "User account has been successfully updated." });
    },
    onError: (err) => {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });
}
