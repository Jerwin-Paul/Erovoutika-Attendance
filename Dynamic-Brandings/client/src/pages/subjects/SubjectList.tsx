import { useState } from "react";
import { useSubjects, useCreateSubject } from "@/hooks/use-subjects";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  BookOpen, 
  Plus, 
  Search, 
  MoreVertical, 
  Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubjectSchema } from "@shared/schema";
import { z } from "zod";

export default function SubjectList() {
  const { user } = useAuth();
  const { data: subjects, isLoading } = useSubjects();
  const [search, setSearch] = useState("");

  const filteredSubjects = subjects?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900">
            {user?.role === "teacher" ? "My Classes" : "Subjects"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your academic courses and view details.
          </p>
        </div>
        {user?.role === "teacher" && <CreateSubjectDialog />}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search subjects..." 
          className="pl-9 max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects?.map((subject) => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold font-mono">
                      {subject.code}
                    </div>
                    {user?.role === "teacher" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-xl">{subject.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {subject.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>32 Students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filteredSubjects?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-gray-50 border border-dashed rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No subjects found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateSubjectDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createSubject, isPending } = useCreateSubject();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof insertSubjectSchema>>({
    resolver: zodResolver(insertSubjectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      teacherId: user?.id,
    },
  });

  const onSubmit = (data: z.infer<typeof insertSubjectSchema>) => {
    createSubject(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30">
          <Plus className="w-4 h-4 mr-2" />
          New Subject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Add a new course to your teaching catalog.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Advanced Calculus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MATH101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief overview of the course..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
