import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QuestionRenderer } from "@/components/survey/QuestionRenderer";
import { ArrowLeft, ArrowRight, Check, Globe, CheckCircle2 } from "lucide-react";

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  skip_logic: { condition: string; target_question: number } | null;
  allow_other?: boolean;
}

interface SurveyData {
  id: string;
  title: string;
  description: string | null;
}

export default function PublicSurvey() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    (async () => {
      try {
        const { data: surveyData, error: sErr } = await supabase
          .from("surveys")
          .select("id, title, description, is_active, is_public")
          .eq("id", surveyId)
          .eq("is_public", true)
          .eq("is_active", true)
          .maybeSingle();

        if (sErr) throw sErr;
        if (!surveyData) {
          toast.error("Ce sondage n'est pas disponible publiquement.");
          setLoading(false);
          return;
        }
        setSurvey(surveyData);

        const { data: qData, error: qErr } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });
        if (qErr) throw qErr;

        setQuestions((qData || []).map((q) => ({
          ...q,
          options: q.options as string[] | null,
          skip_logic: q.skip_logic as { condition: string; target_question: number } | null,
          allow_other: (q as { allow_other?: boolean }).allow_other ?? false,
        })));
      } catch (e) {
        console.error(e);
        toast.error("Erreur de chargement du sondage");
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.skip_logic) return true;
      const { condition, target_question } = q.skip_logic;
      const target = responses[questions[target_question]?.id];
      if (!target) return true;
      return String(target) === condition;
    });
  }, [questions, responses]);

  const current = visibleQuestions[currentIndex];
  const progress = visibleQuestions.length ? ((currentIndex + 1) / visibleQuestions.length) * 100 : 0;

  const handleChange = (id: string, value: unknown) =>
    setResponses((p) => ({ ...p, [id]: value }));

  const handleMulti = (id: string, option: string, checked: boolean) =>
    setResponses((p) => {
      const arr = (p[id] as string[]) || [];
      return { ...p, [id]: checked ? [...arr, option] : arr.filter((o) => o !== option) };
    });

  const canProceed = () => {
    if (!current) return false;
    if (!current.is_required) return true;
    const a = responses[current.id];
    if (a === undefined || a === null || a === "") return false;
    if (Array.isArray(a) && a.length === 0) return false;
    return true;
  };

  const submit = async () => {
    if (!canProceed()) return toast.error("Cette question est obligatoire");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("survey_responses").insert([{
        survey_id: surveyId!,
        surveyor_id: null,
        responses: JSON.parse(JSON.stringify(responses)),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" variant="icon" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">Sondage indisponible ou privé.</p>
            <Button asChild variant="outline"><Link to="/">Retour à l'accueil</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="max-w-md w-full border-success/30">
            <CardContent className="p-10 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-9 w-9 text-success" />
              </motion.div>
              <h2 className="text-2xl font-bold">Merci pour votre participation !</h2>
              <p className="text-muted-foreground">Vos réponses ont bien été enregistrées.</p>
              <Button asChild variant="outline"><Link to="/">Retour à l'accueil</Link></Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl w-full"
        >
          <Card className="border-primary/20 shadow-xl">
            <CardContent className="p-8 space-y-6 text-center">
              <Logo size="lg" variant="full" className="mx-auto" />
              <Badge variant="outline" className="border-primary/40 text-primary gap-1 mx-auto">
                <Globe className="h-3 w-3" /> Enquête publique
              </Badge>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{survey.title}</h1>
                {survey.description && (
                  <p className="text-muted-foreground">{survey.description}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {visibleQuestions.length} question{visibleQuestions.length > 1 ? "s" : ""} — aucune inscription requise.
              </p>
              <Button
                size="xl"
                variant="gradient"
                onClick={() => setStarted(true)}
                disabled={visibleQuestions.length === 0}
              >
                Commencer l'enquête
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const isLast = currentIndex === visibleQuestions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{survey.title}</h1>
            <p className="text-xs text-muted-foreground">
              Question {currentIndex + 1} / {visibleQuestions.length}
            </p>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary gap-1">
            <Globe className="h-3 w-3" /> Publique
          </Badge>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="flex-1 container max-w-2xl px-4 py-6">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-primary/10 shadow-md">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h2 className="text-lg lg:text-xl font-semibold">
                      {current.question_text}
                      {current.is_required && <span className="text-destructive ml-1">*</span>}
                    </h2>
                  </div>
                  <QuestionRenderer
                    questionId={current.id}
                    questionType={current.question_type}
                    options={current.options}
                    value={responses[current.id]}
                    onChange={(v) => handleChange(current.id, v)}
                    onMultipleChoice={(opt, c) => handleMulti(current.id, opt, c)}
                    allowOther={current.allow_other}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0 bg-card border-t">
        <div className="container max-w-2xl px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Précédent
          </Button>
          {isLast ? (
            <Button variant="gradient" onClick={submit} disabled={submitting || !canProceed()}>
              {submitting ? "Envoi..." : (<>Terminer <Check className="h-4 w-4 ml-2" /></>)}
            </Button>
          ) : (
            <Button
              variant="gradient"
              onClick={() => canProceed() ? setCurrentIndex((i) => i + 1) : toast.error("Cette question est obligatoire")}
            >
              Suivant <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
