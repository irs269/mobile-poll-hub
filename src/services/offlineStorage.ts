import { openDB, DBSchema, IDBPDatabase } from "idb";

interface OfflineSurvey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

interface OfflineQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  skip_logic: { condition: string; target_question: number } | null;
  section_id?: string | null;
  allow_other?: boolean;
}

interface OfflineSection {
  id: string;
  survey_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface PendingResponse {
  localId: string;
  survey_id: string;
  surveyor_id: string;
  responses: Record<string, unknown>;
  gps_start: Record<string, unknown> | null;
  gps_end: Record<string, unknown> | null;
  started_at: string;
  completed_at: string;
  synced: boolean;
  created_at: string;
}

interface WaswiaDB extends DBSchema {
  surveys: {
    key: string;
    value: OfflineSurvey;
  };
  questions: {
    key: string;
    value: OfflineQuestion;
    indexes: { "by-survey": string };
  };
  pending_responses: {
    key: string;
    value: PendingResponse;
    indexes: { "by-synced": number; "by-survey": string };
  };
  sync_meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = "waswia-offline";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<WaswiaDB> | null = null;

async function getDB(): Promise<IDBPDatabase<WaswiaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WaswiaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("surveys")) {
        db.createObjectStore("surveys", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("questions")) {
        const qStore = db.createObjectStore("questions", { keyPath: "id" });
        qStore.createIndex("by-survey", "survey_id");
      }
      if (!db.objectStoreNames.contains("pending_responses")) {
        const rStore = db.createObjectStore("pending_responses", { keyPath: "localId" });
        rStore.createIndex("by-synced", "synced");
        rStore.createIndex("by-survey", "survey_id");
      }
      if (!db.objectStoreNames.contains("sync_meta")) {
        db.createObjectStore("sync_meta", { keyPath: "key" });
      }
    },
  });

  return dbInstance;
}

// === Surveys ===
export async function saveSurveysOffline(surveys: OfflineSurvey[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("surveys", "readwrite");
  await Promise.all([
    ...surveys.map((s) => tx.store.put(s)),
    tx.done,
  ]);
}

export async function getOfflineSurveys(): Promise<OfflineSurvey[]> {
  const db = await getDB();
  return db.getAll("surveys");
}

export async function getOfflineSurvey(id: string): Promise<OfflineSurvey | undefined> {
  const db = await getDB();
  return db.get("surveys", id);
}

// === Questions ===
export async function saveQuestionsOffline(questions: OfflineQuestion[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("questions", "readwrite");
  await Promise.all([
    ...questions.map((q) => tx.store.put(q)),
    tx.done,
  ]);
}

export async function getOfflineQuestions(surveyId: string): Promise<OfflineQuestion[]> {
  const db = await getDB();
  return db.getAllFromIndex("questions", "by-survey", surveyId);
}

// === Pending Responses ===
export async function savePendingResponse(response: PendingResponse): Promise<void> {
  const db = await getDB();
  await db.put("pending_responses", response);
}

export async function getPendingResponses(): Promise<PendingResponse[]> {
  const db = await getDB();
  const all = await db.getAll("pending_responses");
  return all.filter((r) => !r.synced);
}

export async function getPendingResponseCount(): Promise<number> {
  const responses = await getPendingResponses();
  return responses.length;
}

export async function markResponseSynced(localId: string): Promise<void> {
  const db = await getDB();
  const response = await db.get("pending_responses", localId);
  if (response) {
    response.synced = true;
    await db.put("pending_responses", response);
  }
}

export async function getAllResponses(): Promise<PendingResponse[]> {
  const db = await getDB();
  return db.getAll("pending_responses");
}

// === Sync Meta ===
export async function setLastSyncTime(time: string): Promise<void> {
  const db = await getDB();
  await db.put("sync_meta", { key: "last_sync", value: time });
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDB();
  const meta = await db.get("sync_meta", "last_sync");
  return meta?.value ?? null;
}
