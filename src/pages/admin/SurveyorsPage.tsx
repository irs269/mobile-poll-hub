import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail,
  MoreVertical,
  ClipboardList
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

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Surveyor {
  id: string;
  profile: Profile;
  assignments_count: number;
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
  const [selectedSurveyor, setSelectedSurveyor] = useState<Surveyor | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [assigning, setAssigning] = useState(false);

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

      // Fetch assignments count per surveyor
      const { data: assignments, error: assignmentsError } = await supabase
        .from("survey_assignments")
        .select("surveyor_id")
        .in("surveyor_id", userIds);

      if (assignmentsError) throw assignmentsError;

      const assignmentCounts = assignments?.reduce((acc, a) => {
        acc[a.surveyor_id] = (acc[a.surveyor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const surveyorsList: Surveyor[] = (profiles || []).map((p) => ({
        id: p.id,
        profile: p,
        assignments_count: assignmentCounts[p.id] || 0,
      }));

      setSurveyors(surveyorsList);
    } catch (error) {
      console.error("Error fetching surveyors:", error);
      toast.error("Erreur lors du chargement des enquêteurs");
    } finally {
      setLoading(false);
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
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Enquêteurs</h1>
          <p className="text-muted-foreground">Gérez votre équipe terrain</p>
        </div>
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
    </div>
  );
}
