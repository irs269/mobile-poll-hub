import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail,
  MoreVertical,
  ClipboardList,
  Trash2,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Assignment {
  id: string;
  survey_id: string;
  survey_title: string;
  assigned_at: string;
}

interface Surveyor {
  id: string;
  profile: Profile;
  assignments_count: number;
  assignments: Assignment[];
}

interface Survey {
  id: string;
  title: string;
  is_active: boolean;
}

export default function SurveyorsPage() {
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewAssignmentsOpen, setIsViewAssignmentsOpen] = useState(false);
  const [selectedSurveyor, setSelectedSurveyor] = useState<Surveyor | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<string | null>(null);
  const [newSurveyor, setNewSurveyor] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const handleCreateSurveyor = async () => {
    if (!newSurveyor.email || !newSurveyor.password) {
      toast.error("Email et mot de passe requis");
      return;
    }

    if (newSurveyor.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setCreating(true);
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Session expirée, veuillez vous reconnecter");
        return;
      }

      // Call edge function to create surveyor
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-surveyor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: newSurveyor.email,
            password: newSurveyor.password,
            first_name: newSurveyor.first_name,
            last_name: newSurveyor.last_name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      toast.success("Enquêteur créé avec succès");
      setIsCreateDialogOpen(false);
      setNewSurveyor({ email: "", password: "", first_name: "", last_name: "" });
      fetchSurveyors();
    } catch (error: any) {
      console.error("Error creating surveyor:", error);
      if (error.message?.includes("already") || error.message?.includes("existe")) {
        toast.error("Cet email est déjà utilisé");
      } else {
        toast.error(error.message || "Erreur lors de la création de l'enquêteur");
      }
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchSurveyors();
    fetchSurveys();
  }, []);

  const fetchSurveyors = async () => {
    try {
      // Fetch users with surveyor role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "surveyor");

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) {
        setSurveyors([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map((r) => r.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch all assignments with survey info
      const { data: assignments, error: assignmentsError } = await supabase
        .from("survey_assignments")
        .select("id, surveyor_id, survey_id, assigned_at, surveys(title)")
        .in("surveyor_id", userIds);

      if (assignmentsError) throw assignmentsError;

      // Group assignments by surveyor
      const assignmentsByUser = (assignments || []).reduce((acc, a) => {
        if (!acc[a.surveyor_id]) acc[a.surveyor_id] = [];
        acc[a.surveyor_id].push({
          id: a.id,
          survey_id: a.survey_id,
          survey_title: (a.surveys as any)?.title || "Sans titre",
          assigned_at: a.assigned_at,
        });
        return acc;
      }, {} as Record<string, Assignment[]>);

      const surveyorsList: Surveyor[] = (profiles || []).map((p) => ({
        id: p.id,
        profile: p,
        assignments_count: assignmentsByUser[p.id]?.length || 0,
        assignments: assignmentsByUser[p.id] || [],
      }));

      setSurveyors(surveyorsList);
    } catch (error) {
      console.error("Error fetching surveyors:", error);
      toast.error("Erreur lors du chargement des enquêteurs");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    setDeletingAssignment(assignmentId);
    try {
      const { error } = await supabase
        .from("survey_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Assignation supprimée");
      fetchSurveyors();
      
      // Update selected surveyor's assignments
      if (selectedSurveyor) {
        setSelectedSurveyor({
          ...selectedSurveyor,
          assignments: selectedSurveyor.assignments.filter(a => a.id !== assignmentId),
          assignments_count: selectedSurveyor.assignments_count - 1,
        });
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingAssignment(null);
    }
  };

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, is_active")
        .eq("is_active", true)
        .order("title");

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error("Error fetching surveys:", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedSurveyor || !selectedSurveyId) {
      toast.error("Sélectionnez un sondage");
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase.from("survey_assignments").insert({
        survey_id: selectedSurveyId,
        surveyor_id: selectedSurveyor.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ce sondage est déjà assigné à cet enquêteur");
        } else {
          throw error;
        }
      } else {
        toast.success("Sondage assigné avec succès");
        setIsAssignDialogOpen(false);
        setSelectedSurveyId("");
        fetchSurveyors();
      }
    } catch (error) {
      console.error("Error assigning survey:", error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  };

  const filteredSurveyors = surveyors.filter((s) => {
    const fullName = `${s.profile.first_name || ""} ${s.profile.last_name || ""}`.toLowerCase();
    const email = s.profile.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <PageTransition>
      <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Enquêteurs</h1>
          <p className="text-muted-foreground">Gérez votre équipe terrain</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-primary">
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un enquêteur
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un enquêteur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Surveyors List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSurveyors.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun enquêteur trouvé" : "Aucun enquêteur enregistré"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Les utilisateurs avec le rôle "enquêteur" apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveyors.map((surveyor) => (
            <Card key={surveyor.id} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {(surveyor.profile.first_name?.charAt(0) || surveyor.profile.email.charAt(0)).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {surveyor.profile.first_name && surveyor.profile.last_name
                          ? `${surveyor.profile.first_name} ${surveyor.profile.last_name}`
                          : surveyor.profile.email.split("@")[0]}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {surveyor.profile.email}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          {surveyor.assignments_count} sondage{surveyor.assignments_count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedSurveyor(surveyor);
                          setIsViewAssignmentsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les assignations
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedSurveyor(surveyor);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Assigner un sondage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un sondage</DialogTitle>
            <DialogDescription>
              Assignez un sondage à {selectedSurveyor?.profile.first_name || selectedSurveyor?.profile.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="survey">Sondage</Label>
            <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner un sondage" />
              </SelectTrigger>
              <SelectContent>
                {surveys.map((survey) => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="default" className="gradient-primary" onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assignation..." : "Assigner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Surveyor Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel enquêteur</DialogTitle>
            <DialogDescription>
              Créez un compte pour un nouvel enquêteur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={newSurveyor.first_name}
                  onChange={(e) => setNewSurveyor({ ...newSurveyor, first_name: e.target.value })}
                  placeholder="Jean"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={newSurveyor.last_name}
                  onChange={(e) => setNewSurveyor({ ...newSurveyor, last_name: e.target.value })}
                  placeholder="Dupont"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newSurveyor.email}
                onChange={(e) => setNewSurveyor({ ...newSurveyor, email: e.target.value })}
                placeholder="jean.dupont@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={newSurveyor.password}
                onChange={(e) => setNewSurveyor({ ...newSurveyor, password: e.target.value })}
                placeholder="Minimum 6 caractères"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="gradient-primary" 
              onClick={handleCreateSurveyor} 
              disabled={creating}
            >
              {creating ? "Création..." : "Créer l'enquêteur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Assignments Dialog */}
      <Dialog open={isViewAssignmentsOpen} onOpenChange={setIsViewAssignmentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Sondages assignés à {selectedSurveyor?.profile.first_name || selectedSurveyor?.profile.email}
            </DialogTitle>
            <DialogDescription>
              {selectedSurveyor?.assignments.length || 0} sondage(s) assigné(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedSurveyor?.assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun sondage assigné</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sondage</TableHead>
                    <TableHead>Assigné le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSurveyor?.assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.survey_title}</TableCell>
                      <TableCell>
                        {new Date(assignment.assigned_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={deletingAssignment === assignment.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewAssignmentsOpen(false)}>
              Fermer
            </Button>
            <Button 
              className="gradient-primary"
              onClick={() => {
                setIsViewAssignmentsOpen(false);
                setIsAssignDialogOpen(true);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Assigner un sondage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
