import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Section, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Helper to map database row (snake_case) to Section type (camelCase)
function mapDbRowToSection(row: any): Section {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

// Helper to map database row to User type
function mapDbRowToUser(row: any): User {
  return {
    id: row.id,
    idNumber: row.id_number,
    email: row.email,
    password: "",
    fullName: row.full_name,
    role: row.role,
    profilePicture: row.profile_picture,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

export function useSections() {
  return useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*");
      if (error) throw new Error("Failed to fetch sections");
      return (data || []).map(mapDbRowToSection);
    },
  });
}

export function useSectionStudents(sectionId: number) {
  return useQuery({
    queryKey: ["section-students", sectionId],
    queryFn: async () => {
      if (!sectionId) return [];

      // Get enrolled student IDs for this section
      const { data: enrollments, error: enrollError } = await supabase
        .from("section_enrollments")
        .select("student_id")
        .eq("section_id", sectionId);

      if (enrollError) throw new Error("Failed to fetch section enrollments");

      if (!enrollments || enrollments.length === 0) {
        return [];
      }

      // Get user details for enrolled students
      const studentIds = enrollments.map((e) => e.student_id);
      const { data: students, error: studentsError } = await supabase
        .from("users")
        .select("id, id_number, email, full_name, role, profile_picture, created_at")
        .in("id", studentIds);

      if (studentsError) throw new Error("Failed to fetch students");
      return (students || []).map(mapDbRowToUser);
    },
    enabled: !!sectionId,
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; code: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from("sections")
        .insert(data)
        .select()
        .single();

      if (error) throw new Error(error.message || "Failed to create section");
      return mapDbRowToSection(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({ title: "Section Created", description: "New section has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; code?: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from("sections")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message || "Failed to update section");
      return mapDbRowToSection(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({ title: "Section Updated", description: "Section has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("section_enrollments").delete().eq("section_id", id);
      if (error) throw new Error("Failed to remove section enrollments");

      const { error: deleteError } = await supabase.from("sections").delete().eq("id", id);
      if (deleteError) throw new Error("Failed to delete section");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({ title: "Section Deleted", description: "Section has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useEnrollStudentInSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sectionId, studentId }: { sectionId: number; studentId: number }) => {
      const { data, error } = await supabase
        .from("section_enrollments")
        .insert({ section_id: sectionId, student_id: studentId })
        .select()
        .single();

      if (error) throw new Error("Failed to enroll student in section");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["section-students", variables.sectionId] });
      toast({ title: "Enrolled", description: "Student successfully enrolled in the section." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUnenrollStudentFromSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sectionId, studentId }: { sectionId: number; studentId: number }) => {
      const { error } = await supabase
        .from("section_enrollments")
        .delete()
        .eq("section_id", sectionId)
        .eq("student_id", studentId);

      if (error) throw new Error("Failed to unenroll student from section");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["section-students", variables.sectionId] });
      toast({ title: "Unenrolled", description: "Student has been removed from the section." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
