import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
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
  Eye,
  RotateCcw
} from "lucide-react";

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

export default function SurveyPreview() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyData();
    }
  }, [surveyId]);

  const fetchSurveyData = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .maybeSingle();

      if (surveyError) throw surveyError;
      if (!surveyData) {
        toast.error("Sondage introuvable");
        navigate("/admin/surveys");
        return;
      }

      setSurvey(surveyData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      const typedQuestions: SurveyQuestion[] = (questionsData || []).map(q => ({
        ...q,
        options: q.options as string[] | null,
        skip_logic: q.skip_logic as { condition: string; target_question: number } | null,
      }));

      setQuestions(typedQuestions);
    } catch (error) {
      console.error("Error fetching survey:", error);
      toast.error("Erreur lors du chargement du sondage");
    } finally {
      setLoading(false);
    }
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
      } else {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      }
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

  const handleReset = () => {
    setCurrentIndex(0);
    setResponses({});
    toast.success("Prévisualisation réinitialisée");
  };

  const handleFinish = () => {
    toast.success("Prévisualisation terminée ! Les réponses n'ont pas été enregistrées.");
    navigate("/admin/surveys");
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

  if (!survey || questions.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucune question dans ce sondage</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/surveys")}>
                Retour aux sondages
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const isLastQuestion = currentIndex === visibleQuestions.length - 1;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
          <div className="container flex items-center gap-4 h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/surveys")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold truncate">{survey.title}</h1>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Prévisualisation
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Question {currentIndex + 1} / {visibleQuestions.length}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
          <Progress value={progress} className="h-1 rounded-none" />
        </header>

        {/* Question Content */}
        <main className="flex-1 container px-4 py-6">
          <Card className="border-0 shadow-lg animate-slide-up">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {currentIndex + 1}
                </span>
                <CardTitle className="text-lg leading-tight">
                  {currentQuestion?.question_text}
                  {currentQuestion?.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>{renderQuestion()}</CardContent>
          </Card>
        </main>

        {/* Navigation Footer */}
        <footer className="sticky bottom-0 bg-card border-t shadow-lg p-4">
          <div className="container flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={handleFinish}
                disabled={!canProceed()}
                className="flex-1 gradient-primary"
              >
                <Check className="h-4 w-4 mr-2" />
                Terminer
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
