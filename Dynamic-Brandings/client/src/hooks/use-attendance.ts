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
      const params = new URLSearchParams();
      if (filters?.subjectId) params.append('subjectId', filters.subjectId.toString());
      if (filters?.studentId) params.append('studentId', filters.studentId.toString());
      if (filters?.date) params.append('date', filters.date);
      
      const response = await fetch(`/api/attendance?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }
      
      return response.json();
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MarkAttendanceRequest) => {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark attendance');
      }
      
      return response.json();
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
      const response = await fetch(`/api/subjects/${subjectId}/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate QR code');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "QR Code Generated", description: "Students can now scan to check in." });
    }
  });
}
