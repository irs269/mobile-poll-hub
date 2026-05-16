import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QuestionRenderer } from "@/components/survey/QuestionRenderer";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  MapPin, 
  Loader2,
  WifiOff
} from "lucide-react";
import { getOfflineSurvey, getOfflineQuestions, getOfflineSections, savePendingResponse } from "@/services/offlineStorage";

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  skip_logic: { condition: string; target_question: number } | null;
  section_id?: string | null;
  allow_other?: boolean;
}

interface SurveySection {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
}

interface GpsCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function SurveyPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gpsStart, setGpsStart] = useState<GpsCoords | null>(null);
  const [gpsEnd, setGpsEnd] = useState<GpsCoords | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (surveyId && user) {
      fetchSurveyData();
      captureGps("start");
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [surveyId, user, authLoading, navigate]);

  const fetchSurveyData = async () => {
    try {
      if (navigator.onLine) {
        // Try online first
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", surveyId)
          .maybeSingle();

        if (surveyError) throw surveyError;
        if (!surveyData) {
          // Fallback to offline
          await loadOfflineSurvey();
          return;
        }

        setSurvey(surveyData);

        const { data: questionsData, error: questionsError } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });

        if (questionsError) throw questionsError;

        setQuestions((questionsData || []).map(q => ({
          ...q,
          options: q.options as string[] | null,
          skip_logic: q.skip_logic as { condition: string; target_question: number } | null,
          section_id: (q as { section_id?: string | null }).section_id ?? null,
          allow_other: (q as { allow_other?: boolean }).allow_other ?? false,
        })));

        const { data: sectionsData } = await (supabase
          .from("survey_sections" as never) as unknown as {
            select: (cols: string) => { eq: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: SurveySection[] | null }> } };
          })
          .select("*")
          .eq("survey_id", surveyId!)
          .order("order_index", { ascending: true });
        setSections(sectionsData || []);
      } else {
        await loadOfflineSurvey();
      }
    } catch (error) {
      console.error("Error fetching survey:", error);
      // Fallback to offline on any error
      await loadOfflineSurvey();
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineSurvey = async () => {
    try {
      if (!surveyId) return;
      const offlineSurvey = await getOfflineSurvey(surveyId);
      if (!offlineSurvey) {
        toast.error("Sondage introuvable en mode hors ligne");
        navigate("/dashboard");
        return;
      }
      setSurvey(offlineSurvey);

      const offlineQuestions = await getOfflineQuestions(surveyId);
      const sorted = offlineQuestions.sort((a, b) => a.order_index - b.order_index);
      setQuestions(sorted);

      const offlineSections = await getOfflineSections(surveyId);
      setSections(offlineSections.sort((a, b) => a.order_index - b.order_index));
    } catch (error) {
      console.error("Error loading offline survey:", error);
      toast.error("Erreur de chargement hors ligne");
    }
  };

  const captureGps = (type: "start" | "end"): Promise<GpsCoords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GpsCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          if (type === "start") {
            setGpsStart(coords);
          } else {
            setGpsEnd(coords);
          }
          setGpsLoading(false);
          resolve(coords);
        },
        (err) => {
          console.error("GPS error:", err);
          setGpsLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.skip_logic) return true;
      const { condition, target_question } = q.skip_logic;
      const targetAnswer = responses[questions[target_question]?.id];
      if (!targetAnswer) return true;
      return String(targetAnswer) === condition;
    });
  }, [questions, responses]);

  const currentQuestion = visibleQuestions[currentIndex];
  const progress = visibleQuestions.length > 0 ? ((currentIndex + 1) / visibleQuestions.length) * 100 : 0;

  const handleResponseChange = (questionId: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChoice = (questionId: string, option: string, checked: boolean) => {
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      }
      return { ...prev, [questionId]: current.filter((o) => o !== option) };
    });
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.is_required) return true;
    const answer = responses[currentQuestion.id];
    if (answer === undefined || answer === null || answer === "") return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error("Cette question est obligatoire");
      return;
    }
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      toast.error("Cette question est obligatoire");
      return;
    }

    setSubmitting(true);
    await captureGps("end");

    const responseData = {
      survey_id: surveyId!,
      surveyor_id: user?.id || "",
      responses: JSON.parse(JSON.stringify(responses)),
      gps_start: gpsStart ? JSON.parse(JSON.stringify(gpsStart)) : null,
      gps_end: gpsEnd ? JSON.parse(JSON.stringify(gpsEnd)) : null,
      started_at: new Date(gpsStart?.timestamp || Date.now()).toISOString(),
      completed_at: new Date().toISOString(),
    };

    if (isOnline) {
      try {
        const { error } = await supabase.from("survey_responses").insert([responseData]);
        if (error) throw error;
        toast.success("Réponses enregistrées avec succès!");
        navigate("/dashboard");
        return;
      } catch (error) {
        console.error("Error submitting online, saving offline:", error);
        // Fall through to offline save
      }
    }

    // Save offline
    try {
      const localId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await savePendingResponse({
        localId,
        ...responseData,
        synced: false,
        created_at: new Date().toISOString(),
      });
      setSavedOffline(true);
      toast.success("Réponses sauvegardées localement ! Synchronisez quand vous serez en ligne.");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error("Error saving offline:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const { id, question_type, options } = currentQuestion;
    const allowOther = (currentQuestion as { allow_other?: boolean }).allow_other ?? false;
    return (
      <QuestionRenderer
        questionId={id}
        questionType={question_type}
        options={options}
        value={responses[id]}
        onChange={(val) => handleResponseChange(id, val)}
        onMultipleChoice={(option, checked) => handleMultipleChoice(id, option, checked)}
        allowOther={allowOther}
      />
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" variant="icon" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!survey || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Aucune question dans ce sondage</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLastQuestion = currentIndex === visibleQuestions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{survey.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} / {visibleQuestions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="outline" className="text-warning border-warning/30 gap-1">
                <WifiOff className="h-3 w-3" />
                Hors ligne
              </Badge>
            )}
            {gpsStart && (
              <div className="flex items-center gap-1 text-success text-xs">
                <MapPin className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      {/* Question */}
      <main className="flex-1 container px-4 py-6 space-y-4">
        {(() => {
          const sec = currentQuestion?.section_id ? sections.find((s) => s.id === currentQuestion.section_id) : null;
          if (!sec) return null;
          return (
            <Card className="border-2 border-primary/30 bg-primary/5 shadow-sm">
              <CardHeader className="py-3">
                <Badge variant="secondary" className="w-fit mb-1">Partie</Badge>
                <CardTitle className="text-base">{sec.title}</CardTitle>
                {sec.description && <p className="text-sm text-muted-foreground mt-1">{sec.description}</p>}
              </CardHeader>
            </Card>
          );
        })()}
        <Card className="border-0 shadow-lg animate-slide-up">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {currentIndex + 1}
              </span>
              <CardTitle className="text-lg leading-tight">
                {currentQuestion?.question_text}
                {currentQuestion?.is_required && <span className="text-destructive ml-1">*</span>}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>{renderQuestion()}</CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-card border-t shadow-lg p-4">
        <div className="container flex items-center gap-3">
          <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {isLastQuestion ? (
            <Button variant="gradient" onClick={handleSubmit} disabled={submitting || !canProceed()} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {isOnline ? "Terminer" : "Sauvegarder"}
            </Button>
          ) : (
            <Button variant="default" onClick={handleNext} disabled={!canProceed()} className="flex-1">
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
