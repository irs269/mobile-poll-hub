import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  Search, 
  Download, 
  MapPin,
  Clock,
  FileCheck,
  Trash2
} from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SurveyResponse {
  id: string;
  survey_id: string;
  surveyor_id: string | null;
  responses: Record<string, unknown>;
  gps_start: { latitude: number; longitude: number } | null;
  gps_end: { latitude: number; longitude: number } | null;
  started_at: string;
  completed_at: string | null;
  survey: { title: string };
  surveyor: { email: string; first_name: string | null; last_name: string | null } | null;
}

interface Survey {
  id: string;
  title: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  order_index: number;
  survey_id: string;
}

interface Surveyor {
  id: string;
  name: string;
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [allSurveyors, setAllSurveyors] = useState<Surveyor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");
  const [selectedSurveyorId, setSelectedSurveyorId] = useState<string>("all");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchResponses();
    fetchSurveys();
    fetchQuestions();
    fetchAllSurveyors();
  }, []);

  const fetchResponses = async () => {
    try {
      // Fetch responses with survey info
      const { data: responsesData, error: responsesError } = await supabase
        .from("survey_responses")
        .select(`
          *,
          survey:surveys(title)
        `)
        .order("completed_at", { ascending: false });

      if (responsesError) throw responsesError;

      // Get unique surveyor IDs
      const surveyorIds = [...new Set((responsesData || [])
        .map(r => r.surveyor_id)
        .filter(Boolean))] as string[];

      // Fetch profiles for surveyors
      let profilesMap: Record<string, { email: string; first_name: string | null; last_name: string | null }> = {};
      
      if (surveyorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", surveyorIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { email: p.email, first_name: p.first_name, last_name: p.last_name };
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      const typedResponses: SurveyResponse[] = (responsesData || []).map((r) => ({
        ...r,
        responses: r.responses as Record<string, unknown>,
        gps_start: r.gps_start as { latitude: number; longitude: number } | null,
        gps_end: r.gps_end as { latitude: number; longitude: number } | null,
        survey: r.survey as unknown as { title: string },
        surveyor: r.surveyor_id ? profilesMap[r.surveyor_id] || null : null,
      }));

      setResponses(typedResponses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      toast.error("Erreur lors du chargement des réponses");
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title")
        .order("title");

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error("Error fetching surveys:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("id, question_text, question_type, order_index, survey_id")
        .order("order_index");

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const handleExportCSV = async () => {
    const filteredData = getFilteredResponses();
    
    if (filteredData.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    // Fetch questions directly to avoid stale state
    const surveyIds = [...new Set(filteredData.map(r => r.survey_id))];
    
    let relevantQuestions: SurveyQuestion[] = [];
    try {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("id, question_text, question_type, order_index, survey_id")
        .in("survey_id", surveyIds)
        .order("order_index");
      
      if (error) throw error;
      relevantQuestions = data || [];
    } catch (error) {
      console.error("Error fetching questions for export:", error);
      toast.error("Erreur lors de la récupération des questions");
      return;
    }

    // Créer un mapping question_id -> texte pour les en-têtes
    const questionMap = new Map(relevantQuestions.map(q => [q.id, q.question_text]));

    // En-têtes: métadonnées + questions
    const headers = [
      "ID Réponse",
      "Sondage",
      "Enquêteur (Email)",
      "Enquêteur (Nom)",
      "Date de début",
      "Date de fin",
      "Durée (min)",
      "GPS Début (Lat)",
      "GPS Début (Lon)",
      "GPS Fin (Lat)",
      "GPS Fin (Lon)",
      "Statut",
      ...relevantQuestions.map(q => q.question_text),
    ];

    const rows = filteredData.map((r) => {
      const startDate = r.started_at ? new Date(r.started_at) : null;
      const endDate = r.completed_at ? new Date(r.completed_at) : null;
      const duration = startDate && endDate 
        ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) 
        : "";

      const surveyorName = r.surveyor?.first_name && r.surveyor?.last_name
        ? `${r.surveyor.first_name} ${r.surveyor.last_name}`
        : "";

      // Extraire les réponses pour chaque question
      const questionResponses = relevantQuestions.map(q => {
        const answer = r.responses[q.id];
        if (answer === undefined || answer === null) return "";
        if (Array.isArray(answer)) return answer.join("; ");
        if (typeof answer === "object") return JSON.stringify(answer);
        return String(answer);
      });

      return [
        r.id,
        r.survey?.title || "",
        r.surveyor?.email || "",
        surveyorName,
        startDate ? format(startDate, "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        endDate ? format(endDate, "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        duration,
        r.gps_start?.latitude ?? "",
        r.gps_start?.longitude ?? "",
        r.gps_end?.latitude ?? "",
        r.gps_end?.longitude ?? "",
        r.completed_at ? "Terminé" : "En cours",
        ...questionResponses,
      ];
    });

    // Ajouter BOM pour UTF-8 dans Excel
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reponses_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();

    toast.success("Export CSV téléchargé");
  };

  const getFilteredResponses = () => {
    return responses.filter((r) => {
      const matchesSurvey = selectedSurveyId === "all" || r.survey_id === selectedSurveyId;
      const matchesSurveyor = selectedSurveyorId === "all" || r.surveyor_id === selectedSurveyorId;
      const matchesSearch =
        searchQuery === "" ||
        r.survey?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.surveyor?.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSurvey && matchesSurveyor && matchesSearch;
    });
  };

  const fetchAllSurveyors = async () => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "surveyor");
      
      if (roles && roles.length > 0) {
        const ids = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", ids);
        
        if (profiles) {
          setAllSurveyors(profiles.map(p => ({
            id: p.id,
            name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email,
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching surveyors:", error);
    }
  };

  // Count per surveyor
  const surveyorResponseCount = (surveyorId: string) =>
    responses.filter(r => r.surveyor_id === surveyorId).length;

  const handleDeleteResponse = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("survey_responses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setResponses((prev) => prev.filter((r) => r.id !== id));
      toast.success("Réponse supprimée");
    } catch (error) {
      console.error("Error deleting response:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const filteredResponses = getFilteredResponses();

  return (
    <PageTransition>
      <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Réponses</h1>
          <p className="text-muted-foreground">
            {filteredResponses.length} réponse{filteredResponses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les sondages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les sondages</SelectItem>
            {surveys.map((survey) => (
              <SelectItem key={survey.id} value={survey.id}>
                {survey.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSurveyorId} onValueChange={setSelectedSurveyorId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Tous les enquêteurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les enquêteurs</SelectItem>
            {allSurveyors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({surveyorResponseCount(s.id)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Responses Table */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredResponses.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune réponse trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sondage</TableHead>
                  <TableHead>Enquêteur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>GPS</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">
                      {response.survey?.title}
                    </TableCell>
                    <TableCell>
                      {response.surveyor?.first_name && response.surveyor?.last_name
                        ? `${response.surveyor.first_name} ${response.surveyor.last_name}`
                        : response.surveyor?.email || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {response.completed_at
                          ? format(new Date(response.completed_at), "dd/MM/yyyy HH:mm", { locale: fr })
                          : "En cours"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {response.gps_start ? (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          GPS
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={response.completed_at ? "default" : "secondary"}>
                        {response.completed_at ? "Terminé" : "En cours"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette réponse ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La réponse sera définitivement supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteResponse(response.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleting}
                            >
                              Supprimer
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
        </Card>
        )}
      </div>
    </PageTransition>
  );
}
