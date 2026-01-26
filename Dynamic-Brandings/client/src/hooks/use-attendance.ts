import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Attendance, type MarkAttendanceRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Helper to map database row to Attendance type with extra fields
function mapDbRowToAttendance(row: any): Attendance & { studentName: string; subjectName: string } {
  return {
    id: row.id,
    studentId: row.student_id,
    subjectId: row.subject_id,
    date: row.date,
    status: row.status,
    timeIn: row.time_in ? new Date(row.time_in) : null,
    remarks: row.remarks,
    studentName: row.users?.full_name || "Unknown",
    subjectName: row.subjects?.name || "Unknown",
  };
}

export function useAttendance(filters?: { subjectId?: number; studentId?: number; date?: string }) {
  const queryKey = ["attendance", filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select(`
          *,
          users!attendance_student_id_fkey(full_name),
          subjects!attendance_subject_id_fkey(name)
        `);
      
      if (filters?.subjectId) {
        query = query.eq("subject_id", filters.subjectId);
      }
      if (filters?.studentId) {
        query = query.eq("student_id", filters.studentId);
      }
      if (filters?.date) {
        query = query.eq("date", filters.date);
      }
      
      const { data, error } = await query;
      if (error) throw new Error("Failed to fetch attendance");
      return (data || []).map(mapDbRowToAttendance);
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MarkAttendanceRequest) => {
      const dbData = {
        student_id: data.studentId,
        subject_id: data.subjectId,
        date: data.date,
        status: data.status,
        remarks: data.remarks,
        time_in: new Date().toISOString(),
      };
      
      const { data: result, error } = await supabase
        .from("attendance")
        .insert(dbData)
        .select(`
          *,
          users!attendance_student_id_fkey(full_name),
          subjects!attendance_subject_id_fkey(name)
        `)
        .single();
      
      if (error) throw new Error("Failed to mark attendance");
      return mapDbRowToAttendance(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast({ title: "Success", description: "Attendance recorded successfully" });
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

export function useGenerateQR() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ subjectId, code }: { subjectId: number; code: string }) => {
      // First deactivate any existing QR codes for this subject
      await supabase
        .from("qr_codes")
        .update({ active: false })
        .eq("subject_id", subjectId);
      
      // Create new QR code
      const { data, error } = await supabase
        .from("qr_codes")
        .insert({ subject_id: subjectId, code, active: true })
        .select()
        .single();
      
      if (error) throw new Error("Failed to generate QR code");
      return data;
    },
    onSuccess: () => {
      toast({ title: "QR Code Generated", description: "Students can now scan to check in." });
    }
  });
}
