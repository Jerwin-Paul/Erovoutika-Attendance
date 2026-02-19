import { useState, useMemo } from "react";
import { useSubjects, useSubjectStudents, useCreateSubject, useUpdateSubject, useDeleteSubject, useUnenrollStudent } from "@/hooks/use-subjects";
import { useUsers } from "@/hooks/use-users";
import { useSections, useSectionStudents } from "@/hooks/use-sections";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, UserMinus, Search, Users, BookOpen, Loader2, Layers, Plus, Pencil, Trash2 } from "lucide-react";

export default function EnrollmentManagement() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSectionId, setFilterSectionId] = useState<string>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState<string>("");
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectCode, setEditSubjectCode] = useState("");
  const [editSubjectDescription, setEditSubjectDescription] = useState("");
  const [editSubjectTeacherId, setEditSubjectTeacherId] = useState<string>("");

  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: enrolledStudents = [], isLoading: enrolledLoading } = useSubjectStudents(selectedSubjectId || 0);
  const { data: allStudents = [], isLoading: studentsLoading } = useUsers("student");
  const { data: teachers = [] } = useUsers("teacher");
  const { data: sections = [] } = useSections();
  const { data: sectionStudents = [] } = useSectionStudents(
    filterSectionId !== "all" ? Number(filterSectionId) : 0
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const unenrollStudent = useUnenrollStudent();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  // Get students not enrolled in the selected subject
  const enrolledStudentIds = new Set(enrolledStudents.map(s => s.id));
  const availableStudents = allStudents.filter(s => !enrolledStudentIds.has(s.id));

  // Filter by section if one is selected
  const sectionFilteredStudents = useMemo(() => {
    if (filterSectionId === "all") return availableStudents;
    const sectionStudentIds = new Set(sectionStudents.map(s => s.id));
    return availableStudents.filter(s => sectionStudentIds.has(s.id));
  }, [filterSectionId, availableStudents, sectionStudents]);

  // Filter by search term
  const filteredAvailable = sectionFilteredStudents.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEnrolled = enrolledStudents.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUnenroll = (studentId: number) => {
    if (!selectedSubjectId) return;
    unenrollStudent.mutate({ subjectId: selectedSubjectId, studentId });
  };

  // Toggle a single student selection
  const toggleStudent = (studentId: number) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Select / deselect all visible students
  const allVisibleSelected = filteredAvailable.length > 0 && filteredAvailable.every(s => selectedStudentIds.has(s.id));
  const someVisibleSelected = filteredAvailable.some(s => selectedStudentIds.has(s.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredAvailable.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredAvailable.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  // Bulk enroll selected students
  const handleBulkEnroll = async () => {
    if (!selectedSubjectId || selectedStudentIds.size === 0) return;
    setIsBulkEnrolling(true);

    try {
      const enrollmentRows = Array.from(selectedStudentIds).map(studentId => ({
        student_id: studentId,
        subject_id: selectedSubjectId,
      }));

      const { error } = await supabase
        .from("enrollments")
        .insert(enrollmentRows);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["subject-students", selectedSubjectId] });
      queryClient.invalidateQueries({ queryKey: ["student-subjects"] });

      toast({
        title: "Students Enrolled",
        description: `${selectedStudentIds.size} student(s) enrolled in ${selectedSubject?.code}.`,
      });
      setSelectedStudentIds(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to enroll students", variant: "destructive" });
    } finally {
      setIsBulkEnrolling(false);
    }
  };

  // Reset selections when section filter changes
  const handleSectionFilterChange = (value: string) => {
    setFilterSectionId(value);
    setSelectedStudentIds(new Set());
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  const handleCreateSubject = () => {
    if (!newSubjectName.trim() || !newSubjectCode.trim()) return;
    createSubject.mutate(
      {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim(),
        description: newSubjectDescription.trim() || undefined,
        teacherId: newSubjectTeacherId ? Number(newSubjectTeacherId) : undefined,
      },
      {
        onSuccess: () => {
          setNewSubjectName("");
          setNewSubjectCode("");
          setNewSubjectDescription("");
          setNewSubjectTeacherId("");
          setCreateSubjectOpen(false);
        },
      }
    );
  };

  const openEditDialog = () => {
    if (!selectedSubject) return;
    setEditSubjectName(selectedSubject.name);
    setEditSubjectCode(selectedSubject.code);
    setEditSubjectDescription(selectedSubject.description || "");
    setEditSubjectTeacherId(selectedSubject.teacherId?.toString() || "");
    setEditSubjectOpen(true);
  };

  const handleUpdateSubject = () => {
    if (!selectedSubjectId || !editSubjectName.trim() || !editSubjectCode.trim()) return;
    updateSubject.mutate(
      {
        id: selectedSubjectId,
        name: editSubjectName.trim(),
        code: editSubjectCode.trim(),
        description: editSubjectDescription.trim() || undefined,
        teacherId: editSubjectTeacherId ? Number(editSubjectTeacherId) : null,
      },
      {
        onSuccess: () => {
          setEditSubjectOpen(false);
        },
      }
    );
  };

  const handleDeleteSubject = () => {
    if (!selectedSubjectId) return;
    deleteSubject.mutate(selectedSubjectId, {
      onSuccess: () => {
        setSelectedSubjectId(null);
      },
    });
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subject Enrollment</h1>
        <p className="text-muted-foreground">
          Enroll or remove students from subjects
        </p>
      </div>

      {/* Subject Selection */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Subject
          </CardTitle>
          <CardDescription>
            Choose a subject to manage student enrollments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* New Subject */}
            <Dialog open={createSubjectOpen} onOpenChange={setCreateSubjectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    New Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subject</DialogTitle>
                    <DialogDescription>Add a new subject and assign it to a teacher.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject-name">Subject Name</Label>
                      <Input
                        id="subject-name"
                        placeholder="e.g. Advanced Calculus"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject-code">Course Code</Label>
                      <Input
                        id="subject-code"
                        placeholder="e.g. MATH101"
                        value={newSubjectCode}
                        onChange={(e) => setNewSubjectCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject-desc">Description (Optional)</Label>
                      <Input
                        id="subject-desc"
                        placeholder="Brief overview of the course..."
                        value={newSubjectDescription}
                        onChange={(e) => setNewSubjectDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign Teacher</Label>
                      <Select value={newSubjectTeacherId} onValueChange={setNewSubjectTeacherId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a teacher..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id.toString()}>
                              {teacher.fullName} ({teacher.idNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateSubjectOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleCreateSubject}
                      disabled={!newSubjectName.trim() || !newSubjectCode.trim() || createSubject.isPending}
                    >
                      {createSubject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Subject
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit & Delete Subject */}
              {selectedSubjectId && (
                <>
                  <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1" onClick={openEditDialog}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>Update the subject details.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-subject-name">Subject Name</Label>
                          <Input
                            id="edit-subject-name"
                            placeholder="e.g. Advanced Calculus"
                            value={editSubjectName}
                            onChange={(e) => setEditSubjectName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-subject-code">Course Code</Label>
                          <Input
                            id="edit-subject-code"
                            placeholder="e.g. MATH101"
                            value={editSubjectCode}
                            onChange={(e) => setEditSubjectCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-subject-desc">Description (Optional)</Label>
                          <Input
                            id="edit-subject-desc"
                            placeholder="Brief overview of the course..."
                            value={editSubjectDescription}
                            onChange={(e) => setEditSubjectDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Assign Teacher</Label>
                          <Select value={editSubjectTeacherId} onValueChange={setEditSubjectTeacherId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a teacher..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.fullName} ({teacher.idNumber})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditSubjectOpen(false)}>Cancel</Button>
                        <Button
                          onClick={handleUpdateSubject}
                          disabled={!editSubjectName.trim() || !editSubjectCode.trim() || updateSubject.isPending}
                        >
                          {updateSubject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{selectedSubject?.code} - {selectedSubject?.name}</strong>?
                          This will also remove all student enrollments for this subject. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSubject}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteSubject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Delete Subject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
          </div>

          <Select
            value={selectedSubjectId?.toString() || ""}
            onValueChange={(value) => {
              setSelectedSubjectId(Number(value));
              setSelectedStudentIds(new Set());
              setFilterSectionId("all");
            }}
            disabled={subjectsLoading}
          >
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Select a subject..." />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.code} - {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSubjectId && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, ID number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Enrolled Students */}
            <Card className="border-2 border-primary/20 min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Enrolled Students
                  </span>
                  <Badge variant="secondary">{enrolledStudents.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Students currently enrolled in {selectedSubject?.code}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {enrolledLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEnrolled.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No matching enrolled students" : "No students enrolled yet"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEnrolled.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-mono text-sm">
                              {student.idNumber}
                            </TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={unenrollStudent.isPending}
                                  >
                                    <UserMinus className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Student</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{student.fullName}</strong> from{" "}
                                      <strong>{selectedSubject?.code}</strong>? This will remove their enrollment
                                      but keep their attendance records.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleUnenroll(student.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Students */}
            <Card className="border-2 border-primary/20 min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Available Students
                  </span>
                  <Badge variant="outline">{sectionFilteredStudents.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Students not enrolled in {selectedSubject?.code}
                </CardDescription>
                {/* Section Filter */}
                <div className="pt-2">
                  <Select
                    value={filterSectionId}
                    onValueChange={handleSectionFilterChange}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by section..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>
                          {section.code} - {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No matching available students" : "All students are enrolled"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead>ID Number</TableHead>
                          <TableHead>Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailable.map((student) => (
                          <TableRow
                            key={student.id}
                            className={selectedStudentIds.has(student.id) ? "bg-primary/5" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedStudentIds.has(student.id)}
                                onCheckedChange={() => toggleStudent(student.id)}
                                aria-label={`Select ${student.fullName}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.idNumber}
                            </TableCell>
                            <TableCell>{student.fullName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Enroll Selected Button */}
                {selectedStudentIds.size > 0 && (
                  <div className="p-4 border-t bg-muted/30">
                    <Button
                      className="w-full gap-2"
                      onClick={handleBulkEnroll}
                      disabled={isBulkEnrolling}
                    >
                      {isBulkEnrolling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Enroll {selectedStudentIds.size} Student{selectedStudentIds.size !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
