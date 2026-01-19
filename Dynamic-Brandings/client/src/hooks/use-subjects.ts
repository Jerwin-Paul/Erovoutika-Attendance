import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateSubjectRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSubjects() {
  return useQuery({
    queryKey: [api.subjects.list.path],
    queryFn: async () => {
      const res = await fetch(api.subjects.list.path);
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return api.subjects.list.responses[200].parse(await res.json());
    },
  });
}

export function useSubject(id: number) {
  return useQuery({
    queryKey: [api.subjects.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.subjects.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch subject");
      return api.subjects.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useSubjectStudents(subjectId: number) {
  return useQuery({
    queryKey: [api.subjects.students.path, subjectId],
    queryFn: async () => {
      const url = buildUrl(api.subjects.students.path, { id: subjectId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch students");
      return api.subjects.students.responses[200].parse(await res.json());
    },
    enabled: !!subjectId,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSubjectRequest) => {
      const validated = api.subjects.create.input.parse(data);
      const res = await fetch(api.subjects.create.path, {
        method: api.subjects.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) throw new Error("Failed to create subject");
      return api.subjects.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subjects.list.path] });
      toast({ title: "Subject Created", description: "New subject has been added to the catalog." });
    },
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ subjectId, studentId }: { subjectId: number; studentId: number }) => {
      const url = buildUrl(api.subjects.enroll.path, { id: subjectId });
      const res = await fetch(url, {
        method: api.subjects.enroll.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      
      if (!res.ok) throw new Error("Failed to enroll student");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.subjects.students.path, variables.subjectId] });
      toast({ title: "Enrolled", description: "Student successfully enrolled in the subject." });
    },
  });
}
