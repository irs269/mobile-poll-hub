import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Save,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  order_index: number;
  skip_logic: null;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

const questionTypes = [
  { value: "single_choice", label: "Choix unique" },
  { value: "multiple_choice", label: "Choix multiples" },
  { value: "text_short", label: "Texte court" },
  { value: "text_long", label: "Texte long" },
  { value: "numeric", label: "Numérique" },
  { value: "likert", label: "Échelle Likert" },
  { value: "date", label: "Date" },
];

export default function SurveyEditor() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (surveyId) {
      fetchSurvey();
    }
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: true });

      if (questionsError) throw questionsError;

      const formattedQuestions: Question[] = (questionsData || []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: (q.options as string[]) || [],
        is_required: q.is_required,
        order_index: q.order_index,
        skip_logic: null,
      }));

      setQuestions(formattedQuestions);
    } catch (error) {
      console.error("Error fetching survey:", error);
      toast.error("Erreur lors du chargement");
      navigate("/admin/surveys");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      question_text: "",
      question_type: "single_choice",
      options: ["Option 1", "Option 2"],
      is_required: true,
      order_index: questions.length,
      skip_logic: null,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    const newOptions = [...question.options, `Option ${question.options.length + 1}`];
    handleUpdateQuestion(questionIndex, { options: newOptions });
  };

  const handleUpdateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const question = questions[questionIndex];
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    handleUpdateQuestion(questionIndex, { options: newOptions });
  };

  const handleDeleteOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    handleUpdateQuestion(questionIndex, { options: newOptions });
  };

  const handleSave = async () => {
    if (!surveyId) return;

    const emptyQuestions = questions.filter((q) => !q.question_text.trim());
    if (emptyQuestions.length > 0) {
      toast.error("Toutes les questions doivent avoir un texte");
      return;
    }

    setSaving(true);
    try {
      // Delete existing questions
      await supabase.from("survey_questions").delete().eq("survey_id", surveyId);

      // Insert new questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
          survey_id: surveyId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.length > 0 ? q.options : null,
          is_required: q.is_required,
          order_index: index,
          skip_logic: q.skip_logic,
        }));

        const { error } = await supabase
          .from("survey_questions")
          .insert(questionsToInsert);

        if (error) throw error;
      }

      toast.success("Sondage enregistré");
    } catch (error) {
      console.error("Error saving survey:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const needsOptions = (type: string) => 
    ["single_choice", "multiple_choice"].includes(type);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/surveys")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{survey?.title}</h1>
            <p className="text-muted-foreground">
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/surveys/${surveyId}/preview`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={index} className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2 text-muted-foreground cursor-move">
                  <GripVertical className="h-5 w-5" />
                  <Badge variant="outline">{index + 1}</Badge>
                </div>
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Question..."
                    value={question.question_text}
                    onChange={(e) =>
                      handleUpdateQuestion(index, { question_text: e.target.value })
                    }
                    className="text-base font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <Select
                      value={question.question_type}
                      onValueChange={(value) =>
                        handleUpdateQuestion(index, { question_type: value })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`required-${index}`}
                        checked={question.is_required}
                        onCheckedChange={(checked) =>
                          handleUpdateQuestion(index, { is_required: checked })
                        }
                      />
                      <Label htmlFor={`required-${index}`} className="text-sm">
                        Obligatoire
                      </Label>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteQuestion(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Options for choice questions */}
            {needsOptions(question.question_type) && (
              <CardContent className="pt-2">
                <div className="space-y-2 ml-10">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                      <Input
                        value={option}
                        onChange={(e) =>
                          handleUpdateOption(index, optIndex, e.target.value)
                        }
                        className="flex-1"
                      />
                      {question.options.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteOption(index, optIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-6"
                    onClick={() => handleAddOption(index)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter une option
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {/* Add Question Button */}
        <Card
          className="border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors"
          onClick={handleAddQuestion}
        >
          <CardContent className="p-6 text-center">
            <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">Ajouter une question</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
