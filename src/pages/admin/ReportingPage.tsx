import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Users,
  ClipboardCheck,
  Calendar as CalendarIcon,
  BarChart3,
  PieChartIcon,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import QuestionStatsCard from "@/components/reporting/QuestionStatsCard";

interface SurveyResponse {
  id: string;
  survey_id: string;
  surveyor_id: string | null;
  responses: Record<string, unknown>;
  gps_start: { latitude: number; longitude: number } | null;
  gps_end: { latitude: number; longitude: number } | null;
  started_at: string;
  completed_at: string | null;
  survey: { title: string } | null;
  surveyor: { email: string; first_name: string | null; last_name: string | null } | null;
}

interface Survey {
  id: string;
  title: string;
}

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  order_index: number;
}

interface Surveyor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const CHART_COLORS = [
  "hsl(275, 55%, 45%)",
  "hsl(180, 100%, 41%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 80%, 50%)",
  "hsl(320, 70%, 50%)",
  "hsl(60, 80%, 45%)",
];

export default function ReportingPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("all");
  const [selectedSurveyorId, setSelectedSurveyorId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedSurveyId && selectedSurveyId !== "all") {
      fetchQuestions(selectedSurveyId);
    } else {
      setQuestions([]);
    }
  }, [selectedSurveyId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchResponses(), fetchSurveys(), fetchSurveyors()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  const fetchResponses = async () => {
    try {
      // First fetch responses with survey data
      const { data: responsesData, error: responsesError } = await supabase
        .from("survey_responses")
        .select(`
          *,
          survey:surveys(title)
        `)
        .order("completed_at", { ascending: false });

      if (responsesError) throw responsesError;

      // Then fetch surveyor profiles separately
      const surveyorIds = [...new Set((responsesData || []).map(r => r.surveyor_id).filter(Boolean))];
      
      let surveyorProfiles: Record<string, { email: string; first_name: string | null; last_name: string | null }> = {};
      
      if (surveyorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", surveyorIds);
        
        (profiles || []).forEach(p => {
          surveyorProfiles[p.id] = { email: p.email, first_name: p.first_name, last_name: p.last_name };
        });
      }

      const typedResponses: SurveyResponse[] = (responsesData || []).map((r) => ({
        ...r,
        responses: r.responses as Record<string, unknown>,
        gps_start: r.gps_start as { latitude: number; longitude: number } | null,
        gps_end: r.gps_end as { latitude: number; longitude: number } | null,
        survey: r.survey as { title: string } | null,
        surveyor: r.surveyor_id ? surveyorProfiles[r.surveyor_id] || null : null,
      }));

      setResponses(typedResponses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      toast.error("Erreur lors du chargement des réponses");
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

  const fetchSurveyors = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name");

      if (error) throw error;
      setSurveyors(data || []);
    } catch (error) {
      console.error("Error fetching surveyors:", error);
    }
  };

  const fetchQuestions = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("id, survey_id, question_text, question_type, options, order_index")
        .eq("survey_id", surveyId)
        .order("order_index");

      if (error) throw error;

      const typedQuestions: SurveyQuestion[] = (data || []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : null,
      }));

      setQuestions(typedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  // Filtered responses based on selections
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      const matchesSurvey = selectedSurveyId === "all" || r.survey_id === selectedSurveyId;
      const matchesSurveyor = selectedSurveyorId === "all" || r.surveyor_id === selectedSurveyorId;
      
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to && r.completed_at) {
        const responseDate = new Date(r.completed_at);
        matchesDate = isWithinInterval(responseDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }

      return matchesSurvey && matchesSurveyor && matchesDate;
    });
  }, [responses, selectedSurveyId, selectedSurveyorId, dateRange]);

  // KPI calculations
  const kpis = useMemo(() => {
    const completedResponses = filteredResponses.filter((r) => r.completed_at);
    const totalResponses = filteredResponses.length;
    const uniqueSurveyors = new Set(filteredResponses.map((r) => r.surveyor_id)).size;
    const uniqueSurveys = new Set(filteredResponses.map((r) => r.survey_id)).size;
    
    const averageDuration = completedResponses.reduce((acc, r) => {
      if (r.started_at && r.completed_at) {
        const duration = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
        return acc + duration;
      }
      return acc;
    }, 0) / (completedResponses.length || 1);

    const completionRate = totalResponses > 0 
      ? (completedResponses.length / totalResponses) * 100 
      : 0;

    return {
      totalResponses,
      completedResponses: completedResponses.length,
      uniqueSurveyors,
      uniqueSurveys,
      averageDurationMinutes: Math.round(averageDuration / 60000),
      completionRate: Math.round(completionRate),
    };
  }, [filteredResponses]);

  // Responses per day for trend chart
  const responsesTrend = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map((day) => {
      const dayResponses = filteredResponses.filter((r) => {
        if (!r.completed_at) return false;
        const responseDate = new Date(r.completed_at);
        return format(responseDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      });

      return {
        date: format(day, "dd/MM", { locale: fr }),
        fullDate: format(day, "dd MMMM yyyy", { locale: fr }),
        responses: dayResponses.length,
      };
    });
  }, [filteredResponses, dateRange]);

  // Responses per survey for pie chart
  const responsesBySurvey = useMemo(() => {
    const surveyMap = new Map<string, { name: string; value: number }>();
    
    filteredResponses.forEach((r) => {
      const surveyName = r.survey?.title || "Inconnu";
      const existing = surveyMap.get(r.survey_id);
      if (existing) {
        existing.value += 1;
      } else {
        surveyMap.set(r.survey_id, { name: surveyName, value: 1 });
      }
    });

    return Array.from(surveyMap.values());
  }, [filteredResponses]);

  // Responses per surveyor for bar chart
  const responsesBySurveyor = useMemo(() => {
    const surveyorMap = new Map<string, { name: string; responses: number }>();
    
    filteredResponses.forEach((r) => {
      const surveyorName = r.surveyor 
        ? (r.surveyor.first_name && r.surveyor.last_name 
            ? `${r.surveyor.first_name} ${r.surveyor.last_name}` 
            : r.surveyor.email)
        : "Inconnu";
      const surveyorId = r.surveyor_id || "unknown";
      const existing = surveyorMap.get(surveyorId);
      if (existing) {
        existing.responses += 1;
      } else {
        surveyorMap.set(surveyorId, { name: surveyorName, responses: 1 });
      }
    });

    return Array.from(surveyorMap.values())
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 10);
  }, [filteredResponses]);

  // Export functions
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      "ID",
      "Sondage",
      "Enquêteur",
      "Date début",
      "Date fin",
      "Durée (min)",
      "GPS Début",
      "GPS Fin",
      "Réponses",
    ];

    const rows = filteredResponses.map((r) => {
      const duration = r.started_at && r.completed_at
        ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 60000)
        : "";
      
      return [
        r.id,
        r.survey?.title || "",
        r.surveyor?.email || "",
        r.started_at ? format(new Date(r.started_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        r.completed_at ? format(new Date(r.completed_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "",
        duration,
        r.gps_start ? `${r.gps_start.latitude}, ${r.gps_start.longitude}` : "",
        r.gps_end ? `${r.gps_end.latitude}, ${r.gps_end.longitude}` : "",
        JSON.stringify(r.responses),
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporting_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();

    toast.success("Export CSV téléchargé");
  };

  const handleExportExcel = () => {
    // For now, export as CSV with .xlsx extension and Excel-friendly format
    // A proper Excel export would require a library like xlsx
    toast.info("Export Excel en préparation...");
    handleExportCSV();
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-80 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Reporting</h1>
          <p className="text-muted-foreground">
            Analyse et statistiques des données collectées
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM", { locale: fr })} -{" "}
                        {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy", { locale: fr })
                    )
                  ) : (
                    "Sélectionner une période"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            {/* Survey Filter */}
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

            {/* Surveyor Filter */}
            <Select value={selectedSurveyorId} onValueChange={setSelectedSurveyorId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les enquêteurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les enquêteurs</SelectItem>
                {surveyors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Réponses totales</p>
                <p className="text-2xl lg:text-3xl font-bold mt-1">{kpis.totalResponses}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.completedResponses} terminées
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-primary/10">
                <ClipboardCheck className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux d'achèvement</p>
                <p className="text-2xl lg:text-3xl font-bold mt-1">{kpis.completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  des sondages terminés
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enquêteurs actifs</p>
                <p className="text-2xl lg:text-3xl font-bold mt-1">{kpis.uniqueSurveyors}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  sur la période
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-secondary/10">
                <Users className="h-5 w-5 lg:h-6 lg:w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Durée moyenne</p>
                <p className="text-2xl lg:text-3xl font-bold mt-1">{kpis.averageDurationMinutes} min</p>
                <p className="text-xs text-muted-foreground mt-1">
                  par sondage
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-warning/10">
                <CalendarIcon className="h-5 w-5 lg:h-6 lg:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Tendances
          </TabsTrigger>
          <TabsTrigger value="surveys" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Par sondage
          </TabsTrigger>
          <TabsTrigger value="surveyors" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Par enquêteur
          </TabsTrigger>
          {selectedSurveyId !== "all" && questions.length > 0 && (
            <TabsTrigger value="questions" className="gap-2">
              <FileText className="h-4 w-4" />
              Par question
            </TabsTrigger>
          )}
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Évolution des réponses</CardTitle>
              <CardDescription>Nombre de réponses collectées par jour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {responsesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={responsesTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="hsl(275, 55%, 45%)" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(275, 55%, 45%)", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "hsl(180, 100%, 41%)" }}
                        name="Réponses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Aucune donnée pour cette période
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveys Distribution Tab */}
        <TabsContent value="surveys">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Répartition par sondage</CardTitle>
              <CardDescription>Distribution des réponses par sondage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {responsesBySurvey.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={responsesBySurvey}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {responsesBySurvey.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Aucune donnée pour cette période
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveyors Tab */}
        <TabsContent value="surveyors">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Performance par enquêteur</CardTitle>
              <CardDescription>Top 10 des enquêteurs les plus actifs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {responsesBySurveyor.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={responsesBySurveyor} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        type="number" 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        allowDecimals={false}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar 
                        dataKey="responses" 
                        fill="hsl(180, 100%, 41%)" 
                        radius={[0, 4, 4, 0]}
                        name="Réponses"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Aucune donnée pour cette période
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Stats Tab */}
        {selectedSurveyId !== "all" && questions.length > 0 && (
          <TabsContent value="questions">
            <div className="space-y-4">
              {questions.map((question) => (
                <QuestionStatsCard
                  key={question.id}
                  question={question}
                  responses={filteredResponses}
                />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
