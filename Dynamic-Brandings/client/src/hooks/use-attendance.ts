import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Attendance, type MarkAttendanceRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAttendance(filters?: { subjectId?: number; studentId?: number; date?: string }) {
  const queryKey = [api.attendance.list.path, filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      let url = api.attendance.list.path;
      if (filters) {
        const params = new URLSearchParams();
        if (filters.subjectId) params.append("subjectId", filters.subjectId.toString());
        if (filters.studentId) params.append("studentId", filters.studentId.toString());
        if (filters.date) params.append("date", filters.date);
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return api.attendance.list.responses[200].parse(await res.json());
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MarkAttendanceRequest) => {
      const validated = api.attendance.mark.input.parse(data);
      const res = await fetch(api.attendance.mark.path, {
        method: api.attendance.mark.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) throw new Error("Failed to mark attendance");
      return api.attendance.mark.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
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
      const url = buildUrl(api.qr.generate.path, { id: subjectId });
      const res = await fetch(url, {
        method: api.qr.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      if (!res.ok) throw new Error("Failed to generate QR code");
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "QR Code Generated", description: "Students can now scan to check in." });
    }
  });
}
