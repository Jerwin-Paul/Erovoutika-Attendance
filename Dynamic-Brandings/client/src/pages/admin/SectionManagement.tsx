import { useState } from "react";
import {
  useSections,
  useSectionStudents,
  useCreateSection,
  useDeleteSection,
  useEnrollStudentInSection,
  useUnenrollStudentFromSection,
} from "@/hooks/use-sections";
import { useUsers } from "@/hooks/use-users";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, UserMinus, Search, Users, Layers, Loader2, Plus, Trash2 } from "lucide-react";

export default function SectionManagement() {
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionCode, setNewSectionCode] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");

  const { data: sections = [], isLoading: sectionsLoading } = useSections();
  const { data: enrolledStudents = [], isLoading: enrolledLoading } = useSectionStudents(selectedSectionId || 0);
  const { data: allStudents = [], isLoading: studentsLoading } = useUsers("student");

  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  const enrollStudent = useEnrollStudentInSection();
  const unenrollStudent = useUnenrollStudentFromSection();

  // Get students not enrolled in the selected section
  const enrolledStudentIds = new Set(enrolledStudents.map((s) => s.id));
  const availableStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  // Filter students by search term
  const filteredAvailable = availableStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEnrolled = enrolledStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEnroll = (studentId: number) => {
    if (!selectedSectionId) return;
    enrollStudent.mutate({ sectionId: selectedSectionId, studentId });
  };

  const handleUnenroll = (studentId: number) => {
    if (!selectedSectionId) return;
    unenrollStudent.mutate({ sectionId: selectedSectionId, studentId });
  };

  const handleCreateSection = () => {
    if (!newSectionName.trim() || !newSectionCode.trim()) return;
    createSection.mutate(
      {
        name: newSectionName.trim(),
        code: newSectionCode.trim(),
        description: newSectionDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNewSectionName("");
          setNewSectionCode("");
          setNewSectionDescription("");
          setCreateDialogOpen(false);
        },
      }
    );
  };

  const handleDeleteSection = (sectionId: number) => {
    deleteSection.mutate(sectionId, {
      onSuccess: () => {
        if (selectedSectionId === sectionId) {
          setSelectedSectionId(null);
        }
      },
    });
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Section Selection */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Select Section
            </span>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  New Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Section</DialogTitle>
                  <DialogDescription>Add a new section to enroll students into.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="section-name">Section Name</Label>
                    <Input
                      id="section-name"
                      placeholder="e.g. Section A"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section-code">Section Code</Label>
                    <Input
                      id="section-code"
                      placeholder="e.g. SEC-A"
                      value={newSectionCode}
                      onChange={(e) => setNewSectionCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section-desc">Description (optional)</Label>
                    <Textarea
                      id="section-desc"
                      placeholder="Description of this section..."
                      value={newSectionDescription}
                      onChange={(e) => setNewSectionDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSection}
                    disabled={!newSectionName.trim() || !newSectionCode.trim() || createSection.isPending}
                  >
                    {createSection.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>Choose a section to manage student enrollments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={selectedSectionId?.toString() || ""}
              onValueChange={(value) => setSelectedSectionId(Number(value))}
              disabled={sectionsLoading}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id.toString()}>
                    {section.code} - {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSectionId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Section</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{selectedSection?.code} - {selectedSection?.name}</strong>?
                      This will remove all student enrollments in this section.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteSection(selectedSectionId)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSectionId && (
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
                  Students currently enrolled in {selectedSection?.code}
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
                            <TableCell className="font-mono text-sm">{student.idNumber}</TableCell>
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
                                      <strong>{selectedSection?.code}</strong>?
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
                  <Badge variant="outline">{availableStudents.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Students not enrolled in {selectedSection?.code}
                </CardDescription>
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
                          <TableHead>ID Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailable.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-mono text-sm">{student.idNumber}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleEnroll(student.id)}
                                disabled={enrollStudent.isPending}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Enroll
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
