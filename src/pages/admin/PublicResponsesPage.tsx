import { useEffect, useMemo, useState } from "react";
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
  Globe,
  CalendarIcon,
  X,
  FileCheck,
  TrendingUp,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PublicResponse {
  id: string;
  survey_id: string;
  responses: Record<string, unknown>;
  gps_start: { latitude: number; longitude: number } | null;
  gps_end: { latitude: number; longitude: number } | null;
  started_at: string;
  completed_at: string | null;
  survey: { title: string } | null;
}

interface Survey {
  id: string;
  title: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  order_index: number;
  survey_id: string;
  section_id: string | null;
}

export default function PublicResponsesPage() {
  const [responses, setResponses] = useState<PublicResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select(`*, survey:surveys(title, is_public)`)
        .is("surveyor_id", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;

      const typed: PublicResponse[] = (data || []).map((r) => ({
        id: r.id,
        survey_id: r.survey_id,
        responses: r.responses as Record<string, unknown>,
        gps_start: r.gps_start as PublicResponse["gps_start"],
        gps_end: r.gps_end as PublicResponse["gps_end"],
        started_at: r.started_at as string,
        completed_at: r.completed_at,
        survey: r.survey as unknown as { title: string } | null,
      }));
      setResponses(typed);

      const { data: pubSurveys } = await supabase
        .from("surveys")
        .select("id, title")
        .eq("is_public", true)
        .order("title");
      setSurveys(pubSurveys || []);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement des réponses publiques");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const matchSurvey = selectedSurveyId === "all" || r.survey_id === selectedSurveyId;
      const matchSearch =
        searchQuery === "" ||
        r.survey?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      const d = r.completed_at ? new Date(r.completed_at) : r.started_at ? new Date(r.started_at) : null;
      const matchFrom = !dateFrom || (d && d >= dateFrom);
      const matchTo = !dateTo || (d && d <= new Date(dateTo.getTime() + 86400000 - 1));
      return matchSurvey && matchSearch && matchFrom && matchTo;
    });
  }, [responses, selectedSurveyId, searchQuery, dateFrom, dateTo]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((r) => r.completed_at).length;
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const today = filtered.filter((r) => {
      const d = r.completed_at ? new Date(r.completed_at) : new Date(r.started_at);
      return d >= today0;
    }).length;
    const durations = filtered
      .filter((r) => r.started_at && r.completed_at)
      .map((r) => (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 60000);
    const avgDuration = durations.length
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0;

    const bySurvey = new Map<string, { title: string; count: number }>();
    filtered.forEach((r) => {
      const key = r.survey_id;
      const cur = bySurvey.get(key) || { title: r.survey?.title || "—", count: 0 };
      cur.count += 1;
      bySurvey.set(key, cur);
    });
    const perSurvey = Array.from(bySurvey.values()).sort((a, b) => b.count - a.count);

    return { total, completed, today, avgDuration, perSurvey };
  }, [filtered]);

  const handleExportCSV = async () => {
    if (filtered.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const surveyIds = [...new Set(filtered.map((r) => r.survey_id))];
    let questions: SurveyQuestion[] = [];
    const sectionMap = new Map<string, string>();
    try {
      const { data: qs, error } = await supabase
        .from("survey_questions")
        .select("id, question_text, order_index, survey_id, section_id")
        .in("survey_id", surveyIds)
        .order("order_index");
      if (error) throw error;
      questions = (qs as SurveyQuestion[]) || [];
      const { data: secs } = await supabase
        .from("survey_sections")
        .select("id, title")
        .in("survey_id", surveyIds);
      (secs || []).forEach((s) => sectionMap.set(s.id, s.title));
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la récupération des questions");
      return;
    }

    const headers = [
      "ID Réponse",
      "Sondage",
      "Date de début",
      "Date de fin",
      "Durée (min)",
      "GPS Début (Lat)",
      "GPS Début (Lon)",
      "GPS Fin (Lat)",
      "GPS Fin (Lon)",
      "Statut",
      ...questions.map((q) =>
        q.section_id && sectionMap.get(q.section_id)
          ? `[${sectionMap.get(q.section_id)}] ${q.question_text}`
          : q.question_text
      ),
    ];

    const formatOther = (v: string) => (v.startsWith("__other__:") ? `Autre: ${v.slice(10)}` : v);

    const rows = filtered.map((r) => {
      const start = r.started_at ? new Date(r.started_at) : null;
      const end = r.completed_at ? new Date(r.completed_at) : null;
      const duration = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : "";
      const qr = questions.map((q) => {
        const a = r.responses[q.id];
        if (a === undefined || a === null) return "";
        if (Array.isArray(a)) return a.map((v) => (typeof v === "string" ? formatOther(v) : String(v))).join("; ");
        if (typeof a === "object") return JSON.stringify(a);
        if (typeof a === "string") return formatOther(a);
        return String(a);
      });
      return [
        r.id,
        r.survey?.title || "",
        start ? format(start, "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        end ? format(end, "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        duration,
        r.gps_start?.latitude ?? "",
        r.gps_start?.longitude ?? "",
        r.gps_end?.latitude ?? "",
        r.gps_end?.longitude ?? "",
        r.completed_at ? "Terminé" : "En cours",
        ...qr,
      ];
    });

    const BOM = "\uFEFF";
    const csv =
      BOM +
      [
        headers.join(";"),
        ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reponses_publiques_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
    toast.success("Export CSV téléchargé");
  };

  const statCards = [
    { title: "Réponses publiques", value: stats.total, icon: Globe, color: "text-primary", bg: "bg-primary/10" },
    { title: "Terminées", value: stats.completed, icon: FileCheck, color: "text-success", bg: "bg-success/10" },
    { title: "Aujourd'hui", value: stats.today, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
    { title: "Durée moyenne", value: `${stats.avgDuration} min`, icon: Clock, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  return (
    <PageTransition>
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-7 w-7 text-primary" />
              Réponses publiques
            </h1>
            <p className="text-muted-foreground">
              Soumissions anonymes via les liens publics ({filtered.length})
            </p>
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title} className="border-0 shadow-md">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold mt-1">
                      {loading ? <span className="animate-pulse">--</span> : s.value}
                    </p>
                  </div>
                  <div className={`p-2 lg:p-3 rounded-lg ${s.bg}`}>
                    <s.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats per survey */}
        {stats.perSurvey.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Répartition par sondage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.perSurvey.map((s) => {
                  const pct = stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0;
                  return (
                    <div key={s.title}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate">{s.title}</span>
                        <span className="text-muted-foreground">
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4">
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
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Tous les sondages publics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sondages publics</SelectItem>
                {surveys.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: fr }) : "Date début"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: fr }) : "Date fin"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                <X className="h-4 w-4 mr-1" /> Effacer dates
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
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
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucune réponse publique trouvée</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sondage</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>GPS</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const start = r.started_at ? new Date(r.started_at) : null;
                    const end = r.completed_at ? new Date(r.completed_at) : null;
                    const duration = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.survey?.title || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {end ? format(end, "dd/MM/yyyy HH:mm", { locale: fr }) : start ? format(start, "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{duration !== null ? `${duration} min` : "—"}</TableCell>
                        <TableCell>
                          {r.gps_start ? (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.completed_at ? (
                            <Badge className="bg-success/10 text-success border-success/20">Terminé</Badge>
                          ) : (
                            <Badge variant="outline">En cours</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
