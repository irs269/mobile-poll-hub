import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  FileCheck
} from "lucide-react";
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

export default function ResponsesPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");

  useEffect(() => {
    fetchResponses();
    fetchSurveys();
  }, []);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select(`
          *,
          survey:surveys(title),
          surveyor:profiles(email, first_name, last_name)
        `)
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const typedResponses: SurveyResponse[] = (data || []).map((r) => ({
        ...r,
        responses: r.responses as Record<string, unknown>,
        gps_start: r.gps_start as { latitude: number; longitude: number } | null,
        gps_end: r.gps_end as { latitude: number; longitude: number } | null,
        survey: r.survey as { title: string },
        surveyor: r.surveyor as { email: string; first_name: string | null; last_name: string | null } | null,
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

  const handleExportCSV = () => {
    const filteredData = getFilteredResponses();
    
    if (filteredData.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    // Build CSV content
    const headers = [
      "ID",
      "Sondage",
      "Enquêteur",
      "Date",
      "GPS Début",
      "GPS Fin",
      "Réponses",
    ];

    const rows = filteredData.map((r) => [
      r.id,
      r.survey?.title || "",
      r.surveyor?.email || "",
      r.completed_at ? format(new Date(r.completed_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "",
      r.gps_start ? `${r.gps_start.latitude}, ${r.gps_start.longitude}` : "",
      r.gps_end ? `${r.gps_end.latitude}, ${r.gps_end.longitude}` : "",
      JSON.stringify(r.responses),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `responses_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();

    toast.success("Export CSV téléchargé");
  };

  const getFilteredResponses = () => {
    return responses.filter((r) => {
      const matchesSurvey = selectedSurveyId === "all" || r.survey_id === selectedSurveyId;
      const matchesSearch =
        searchQuery === "" ||
        r.survey?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.surveyor?.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSurvey && matchesSearch;
    });
  };

  const filteredResponses = getFilteredResponses();

  return (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
