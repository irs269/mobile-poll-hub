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
  Eye,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { questionTypes, questionTypeCategories, typeNeedsOptions, typeNeedsMatrixRows } from "@/components/survey/questionTypes";

interface Section {
  id: string; // local id (uuid or db id)
  dbId?: string; // existing DB id
  title: string;
  description: string;
  order_index: number;
}

interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  allow_other: boolean;
  order_index: number;
  skip_logic: null;
  matrix_rows?: string[];
  section_local_id: string | null;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

const NO_SECTION = "__none__";

function makeLocalId() {
  return crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SurveyEditor() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (surveyId) fetchSurvey();
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys").select("*").eq("id", surveyId).single();
      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      const { data: sectionsData } = await supabase
        .from("survey_sections" as never)
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: true });

      const loadedSections: Section[] = ((sectionsData as { id: string; title: string; description: string | null; order_index: number }[]) || []).map((s) => ({
        id: s.id,
        dbId: s.id,
        title: s.title,
        description: s.description || "",
        order_index: s.order_index,
      }));
      setSections(loadedSections);

      const { data: questionsData, error: questionsError } = await supabase
        .from("survey_questions").select("*")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: true });
      if (questionsError) throw questionsError;

      const formattedQuestions: Question[] = (questionsData || []).map((q) => {
        const sId = (q as { section_id?: string | null }).section_id ?? null;
        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: (q.options as string[]) || [],
          is_required: q.is_required,
          allow_other: (q as { allow_other?: boolean }).allow_other ?? false,
          order_index: q.order_index,
          skip_logic: null,
          section_local_id: sId,
        };
      });
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error("Error fetching survey:", error);
      toast.error("Erreur lors du chargement");
      navigate("/admin/surveys");
    } finally {
      setLoading(false);
    }
  };

  // ===== Sections =====
  const handleAddSection = () => {
    const newSec: Section = {
      id: makeLocalId(),
      title: `Partie ${sections.length + 1}`,
      description: "",
      order_index: sections.length,
    };
    setSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, updates: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDeleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setQuestions((prev) => prev.map((q) => (q.section_local_id === id ? { ...q, section_local_id: null } : q)));
  };

  // ===== Questions =====
  const handleAddQuestion = (sectionId: string | null = null) => {
    const newQuestion: Question = {
      question_text: "",
      question_type: "single_choice",
      options: ["Option 1", "Option 2"],
      is_required: true,
      allow_other: false,
      order_index: questions.length,
      skip_logic: null,
      section_local_id: sectionId,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddOption = (qi: number) => {
    const q = questions[qi];
    handleUpdateQuestion(qi, { options: [...q.options, `Option ${q.options.length + 1}`] });
  };
  const handleUpdateOption = (qi: number, oi: number, v: string) => {
    const q = questions[qi];
    const newOptions = [...q.options];
    newOptions[oi] = v;
    handleUpdateQuestion(qi, { options: newOptions });
  };
  const handleDeleteOption = (qi: number, oi: number) => {
    const q = questions[qi];
    handleUpdateQuestion(qi, { options: q.options.filter((_, i) => i !== oi) });
  };

  const handleAddMatrixRow = (qi: number) => {
    const q = questions[qi];
    const rows = q.matrix_rows || [];
    handleUpdateQuestion(qi, { matrix_rows: [...rows, `Ligne ${rows.length + 1}`] });
  };
  const handleUpdateMatrixRow = (qi: number, ri: number, v: string) => {
    const q = questions[qi];
    const rows = [...(q.matrix_rows || [])];
    rows[ri] = v;
    handleUpdateQuestion(qi, { matrix_rows: rows });
  };
  const handleDeleteMatrixRow = (qi: number, ri: number) => {
    const q = questions[qi];
    handleUpdateQuestion(qi, { matrix_rows: (q.matrix_rows || []).filter((_, i) => i !== ri) });
  };

  // ===== Save =====
  const handleSave = async () => {
    if (!surveyId) return;

    if (questions.some((q) => !q.question_text.trim())) {
      toast.error("Toutes les questions doivent avoir un texte");
      return;
    }
    if (sections.some((s) => !s.title.trim())) {
      toast.error("Chaque section doit avoir un titre");
      return;
    }

    setSaving(true);
    try {
      // Wipe old data
      await supabase.from("survey_questions").delete().eq("survey_id", surveyId);
      await supabase.from("survey_sections" as never).delete().eq("survey_id", surveyId);

      // Insert sections, map local id -> db id
      const localToDb = new Map<string, string>();
      if (sections.length > 0) {
        const toInsert = sections.map((s, idx) => ({
          survey_id: surveyId,
          title: s.title,
          description: s.description || null,
          order_index: idx,
        }));
        const { data: inserted, error } = await supabase
          .from("survey_sections" as never)
          .insert(toInsert)
          .select("id, title, order_index");
        if (error) throw error;
        const insertedTyped = (inserted as { id: string; title: string; order_index: number }[]) || [];
        // Map by order_index (since titles may repeat)
        sections.forEach((s, idx) => {
          const match = insertedTyped.find((row) => row.order_index === idx);
          if (match) localToDb.set(s.id, match.id);
        });
      }

      // Order questions: by section order, then by their current order
      const sectionOrder = new Map<string, number>();
      sections.forEach((s, idx) => sectionOrder.set(s.id, idx));

      const sortedQs = [...questions].sort((a, b) => {
        const ai = a.section_local_id ? sectionOrder.get(a.section_local_id) ?? 9999 : 9999;
        const bi = b.section_local_id ? sectionOrder.get(b.section_local_id) ?? 9999 : 9999;
        if (ai !== bi) return ai - bi;
        return a.order_index - b.order_index;
      });

      if (sortedQs.length > 0) {
        const toInsert = sortedQs.map((q, idx) => ({
          survey_id: surveyId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.length > 0 ? q.options : null,
          is_required: q.is_required,
          allow_other: q.allow_other,
          order_index: idx,
          skip_logic: q.skip_logic,
          section_id: q.section_local_id ? localToDb.get(q.section_local_id) ?? null : null,
        }));
        const { error } = await supabase.from("survey_questions").insert(toInsert);
        if (error) throw error;
      }

      toast.success("Sondage enregistré");
      await fetchSurvey();
    } catch (error) {
      console.error("Error saving survey:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

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

  // Group questions by section for display
  const sectionGroups: { section: Section | null; items: { q: Question; index: number }[] }[] = [];
  sections.forEach((s) => {
    sectionGroups.push({
      section: s,
      items: questions
        .map((q, i) => ({ q, index: i }))
        .filter(({ q }) => q.section_local_id === s.id),
    });
  });
  const orphan = questions.map((q, i) => ({ q, index: i })).filter(({ q }) => !q.section_local_id || !sections.find((s) => s.id === q.section_local_id));
  if (orphan.length > 0 || sections.length === 0) {
    sectionGroups.push({ section: null, items: orphan });
  }

  const renderQuestionCard = (question: Question, index: number, displayIndex: number) => (
    <Card key={question.id ?? `q-${index}`} className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 text-muted-foreground cursor-move">
            <GripVertical className="h-5 w-5" />
            <Badge variant="outline">{displayIndex}</Badge>
          </div>
          <div className="flex-1 space-y-3">
            <Input
              placeholder="Question..."
              value={question.question_text}
              onChange={(e) => handleUpdateQuestion(index, { question_text: e.target.value })}
              className="text-base font-medium"
            />
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={question.question_type}
                onValueChange={(value) => handleUpdateQuestion(index, { question_type: value })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {questionTypeCategories.map((cat) => {
                    const types = questionTypes.filter((t) => t.category === cat.key);
                    if (types.length === 0) return null;
                    return (
                      <div key={cat.key}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.label}</div>
                        {types.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>

              {sections.length > 0 && (
                <Select
                  value={question.section_local_id ?? NO_SECTION}
                  onValueChange={(v) => handleUpdateQuestion(index, { section_local_id: v === NO_SECTION ? null : v })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SECTION}>Sans section</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${index}`}
                  checked={question.is_required}
                  onCheckedChange={(c) => handleUpdateQuestion(index, { is_required: c })}
                />
                <Label htmlFor={`required-${index}`} className="text-sm">Obligatoire</Label>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteQuestion(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {typeNeedsOptions(question.question_type) && (
        <CardContent className="pt-2">
          <div className="space-y-2 ml-10">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Options</Label>
            {question.options.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                <Input
                  value={option}
                  onChange={(e) => handleUpdateOption(index, optIndex, e.target.value)}
                  className="flex-1"
                />
                {question.options.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteOption(index, optIndex)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="ml-6" onClick={() => handleAddOption(index)}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une option
            </Button>
            <div className="flex items-center gap-2 pt-2 ml-6">
              <Switch
                id={`other-${index}`}
                checked={question.allow_other}
                onCheckedChange={(c) => handleUpdateQuestion(index, { allow_other: c })}
              />
              <Label htmlFor={`other-${index}`} className="text-sm">Ajouter une option « Autre (à préciser) »</Label>
            </div>
          </div>

          {typeNeedsMatrixRows(question.question_type) && (
            <div className="space-y-2 ml-10 mt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Lignes de la matrice</Label>
              {(question.matrix_rows || []).map((row, ri) => (
                <div key={ri} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{ri + 1}</Badge>
                  <Input value={row} onChange={(e) => handleUpdateMatrixRow(index, ri, e.target.value)} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMatrixRow(index, ri)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="ml-6" onClick={() => handleAddMatrixRow(index)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une ligne
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  let runningIndex = 0;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/surveys")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{survey?.title}</h1>
            <p className="text-muted-foreground">
              {sections.length} partie{sections.length !== 1 ? "s" : ""} · {questions.length} question{questions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddSection}>
            <Layers className="h-4 w-4 mr-2" />
            Ajouter une partie
          </Button>
          <Button variant="outline" onClick={() => navigate(`/admin/surveys/${surveyId}/preview`)}>
            <Eye className="h-4 w-4 mr-2" />
            Prévisualiser
          </Button>
          <Button variant="default" className="gradient-primary" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {sectionGroups.map((group, gi) => (
          <div key={group.section?.id ?? `orphan-${gi}`} className="space-y-3">
            {group.section ? (
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Layers className="h-5 w-5 text-primary mt-2" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={group.section.title}
                        onChange={(e) => handleUpdateSection(group.section!.id, { title: e.target.value })}
                        className="text-lg font-semibold border-0 bg-background"
                        placeholder="Titre de la partie..."
                      />
                      <Textarea
                        value={group.section.description}
                        onChange={(e) => handleUpdateSection(group.section!.id, { description: e.target.value })}
                        placeholder="Description (optionnelle)..."
                        rows={2}
                        className="text-sm bg-background"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSection(group.section!.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              group.items.length > 0 && (
                <p className="text-sm text-muted-foreground font-medium">Questions sans section</p>
              )
            )}

            {group.items.map(({ q, index }) => {
              runningIndex += 1;
              return renderQuestionCard(q, index, runningIndex);
            })}

            <Card
              className="border-2 border-dashed hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => handleAddQuestion(group.section ? group.section.id : null)}
            >
              <CardContent className="p-4 text-center">
                <Plus className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-muted-foreground text-sm font-medium">
                  Ajouter une question {group.section ? `dans « ${group.section.title} »` : ""}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
