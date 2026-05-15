import { supabase } from "@/integrations/supabase/client";
import {
  saveSurveysOffline,
  saveQuestionsOffline,
  saveSectionsOffline,
  getPendingResponses,
  markResponseSynced,
  setLastSyncTime,
  getLastSyncTime,
  getPendingResponseCount,
} from "./offlineStorage";

export interface SyncResult {
  surveysDownloaded: number;
  questionsDownloaded: number;
  responsesUploaded: number;
  responsesFailed: number;
  errors: string[];
}

export async function syncAll(userId: string, roles: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    surveysDownloaded: 0,
    questionsDownloaded: 0,
    responsesUploaded: 0,
    responsesFailed: 0,
    errors: [],
  };

  // 1. Upload pending responses first
  try {
    const pending = await getPendingResponses();
    for (const response of pending) {
      try {
        const { error } = await supabase.from("survey_responses").insert([{
          survey_id: response.survey_id,
          surveyor_id: response.surveyor_id,
          responses: JSON.parse(JSON.stringify(response.responses)),
          gps_start: response.gps_start ? JSON.parse(JSON.stringify(response.gps_start)) : null,
          gps_end: response.gps_end ? JSON.parse(JSON.stringify(response.gps_end)) : null,
          started_at: response.started_at,
          completed_at: response.completed_at,
        }]);

        if (error) {
          result.responsesFailed++;
          result.errors.push(`Réponse ${response.localId}: ${error.message}`);
        } else {
          await markResponseSynced(response.localId);
          result.responsesUploaded++;
        }
      } catch (err) {
        result.responsesFailed++;
        result.errors.push(`Réponse ${response.localId}: ${String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Erreur upload réponses: ${String(err)}`);
  }

  // 2. Download surveys
  try {
    const isAdmin = roles.includes("admin") || roles.includes("supervisor");

    let surveys: { id: string; title: string; description: string | null; is_active: boolean | null }[] = [];

    if (isAdmin) {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, description, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      surveys = data || [];
    } else {
      const { data, error } = await supabase
        .from("survey_assignments")
        .select("survey_id, surveys(id, title, description, is_active)")
        .eq("surveyor_id", userId);
      if (error) throw error;
      surveys = (data || []).map((a: any) => a.surveys).filter(Boolean);
    }

    const normalizedSurveys = surveys.map(s => ({
      ...s,
      is_active: s.is_active ?? true,
    }));

    await saveSurveysOffline(normalizedSurveys);
    result.surveysDownloaded = normalizedSurveys.length;

    // 3. Download questions for each survey
    const surveyIds = normalizedSurveys.map(s => s.id);
    if (surveyIds.length > 0) {
      const { data: questions, error: qError } = await supabase
        .from("survey_questions")
        .select("*")
        .in("survey_id", surveyIds)
        .order("order_index", { ascending: true });

      if (qError) throw qError;

      const typedQuestions = (questions || []).map((q: any) => ({
        id: q.id,
        survey_id: q.survey_id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options as string[] | null,
        is_required: q.is_required ?? true,
        order_index: q.order_index,
        skip_logic: q.skip_logic as { condition: string; target_question: number } | null,
        section_id: q.section_id ?? null,
        allow_other: q.allow_other ?? false,
      }));

      await saveQuestionsOffline(typedQuestions);
      result.questionsDownloaded = typedQuestions.length;

      // 4. Download sections
      try {
        const { data: sections } = await (supabase
          .from("survey_sections" as never) as unknown as {
            select: (cols: string) => { in: (col: string, vals: string[]) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: any[] | null }> } };
          })
          .select("*")
          .in("survey_id", surveyIds)
          .order("order_index", { ascending: true });
        await saveSectionsOffline((sections || []).map((s: any) => ({
          id: s.id,
          survey_id: s.survey_id,
          title: s.title,
          description: s.description ?? null,
          order_index: s.order_index ?? 0,
        })));
      } catch (e) {
        // sections optional
      }
    }
  } catch (err) {
    result.errors.push(`Erreur téléchargement sondages: ${String(err)}`);
  }

  await setLastSyncTime(new Date().toISOString());
  return result;
}

export { getPendingResponseCount, getLastSyncTime };
