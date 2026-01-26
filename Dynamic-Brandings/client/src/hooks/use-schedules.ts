import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { InsertSchedule, Schedule } from "@shared/schema";

// Helper to map database row to Schedule type
function mapDbRowToSchedule(row: any): Schedule & { subjectName?: string; subjectCode?: string } {
  return {
    id: row.id,
    subjectId: row.subject_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    subjectName: row.subjects?.name,
    subjectCode: row.subjects?.code,
  };
}

export function useTeacherSchedules() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["teacher-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get subjects taught by this teacher
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", user.id);
      
      if (subjectsError) throw new Error("Failed to fetch subjects");
      if (!subjects || subjects.length === 0) return [];
      
      const subjectIds = subjects.map(s => s.id);
      
      // Then get schedules for those subjects
      const { data, error } = await supabase
        .from("schedules")
        .select(`
          *,
          subjects!schedules_subject_id_fkey(name, code)
        `)
        .in("subject_id", subjectIds);
      
      if (error) throw new Error("Failed to fetch schedules");
      return (data || []).map(mapDbRowToSchedule);
    },
    enabled: !!user?.id,
  });
}

export function useSubjectSchedules(subjectId: number) {
  return useQuery({
    queryKey: ["subject-schedules", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select(`
          *,
          subjects!schedules_subject_id_fkey(name, code)
        `)
        .eq("subject_id", subjectId);
      
      if (error) throw new Error("Failed to fetch schedules");
      return (data || []).map(mapDbRowToSchedule);
    },
    enabled: !!subjectId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const dbData = {
        subject_id: data.subjectId,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        room: data.room,
      };
      
      const { data: result, error } = await supabase
        .from("schedules")
        .insert(dbData)
        .select(`
          *,
          subjects!schedules_subject_id_fkey(name, code)
        `)
        .single();
      
      if (error) throw new Error("Failed to create schedule");
      return mapDbRowToSchedule(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teacher-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["subject-schedules", variables.subjectId] });
      toast({ title: "Schedule Created", description: "New schedule has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create schedule.", variant: "destructive" });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error("Failed to delete schedule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["subject-schedules"] });
      toast({ title: "Schedule Deleted", description: "Schedule has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete schedule.", variant: "destructive" });
    },
  });
}
