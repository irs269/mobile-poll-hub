import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  RefreshCw,
  ChevronRight,
  Wifi,
  WifiOff,
  User,
  CloudUpload,
  CloudDownload,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { syncAll, getPendingResponseCount, getLastSyncTime } from "@/services/syncService";
import { getOfflineSurveys } from "@/services/offlineStorage";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

interface SurveyAssignment {
  id: string;
  survey_id: string;
  surveys: Survey;
}

interface DashboardStats {
  totalAssigned: number;
  completed: number;
  pending: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut, roles, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<SurveyAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalAssigned: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadData();
      loadSyncInfo();
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, authLoading, navigate]);

  const loadSyncInfo = async () => {
    const count = await getPendingResponseCount();
    setPendingCount(count);
    const sync = await getLastSyncTime();
    setLastSync(sync);
  };

  const loadData = async () => {
    if (isOnline) {
      await fetchAssignmentsOnline();
    } else {
      await loadOfflineData();
    }
  };

  const loadOfflineData = async () => {
    try {
      const offlineSurveys = await getOfflineSurveys();
      const typedData: SurveyAssignment[] = offlineSurveys.map((survey) => ({
        id: survey.id,
        survey_id: survey.id,
        surveys: survey,
      }));
      setAssignments(typedData);
      setStats({
        totalAssigned: typedData.length,
        completed: 0,
        pending: typedData.filter(a => a.surveys.is_active).length,
      });
    } catch (error) {
      console.error("Error loading offline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsOnline = async () => {
    try {
      const isAdmin = roles.includes("admin") || roles.includes("supervisor");
      
      if (isAdmin) {
        const { data: surveysData, error: surveysError } = await supabase
          .from("surveys")
          .select("id, title, description, is_active")
          .order("created_at", { ascending: false });

        if (surveysError) throw surveysError;

        const typedData: SurveyAssignment[] = (surveysData || []).map((survey) => ({
          id: survey.id,
          survey_id: survey.id,
          surveys: survey as Survey,
        }));
        setAssignments(typedData);

        const { data: responses, error: responsesError } = await supabase
          .from("survey_responses")
          .select("id, completed_at");

        if (responsesError) throw responsesError;

        const completed = responses?.filter(r => r.completed_at).length || 0;

        setStats({
          totalAssigned: typedData.length,
          completed,
          pending: typedData.filter(a => a.surveys.is_active).length,
        });
      } else {
        const { data, error } = await supabase
          .from("survey_assignments")
          .select(`id, survey_id, surveys (id, title, description, is_active)`)
          .eq("surveyor_id", user?.id);

        if (error) throw error;

        const typedData = data as unknown as SurveyAssignment[];
        setAssignments(typedData || []);

        const { data: responses, error: responsesError } = await supabase
          .from("survey_responses")
          .select("id, completed_at")
          .eq("surveyor_id", user?.id);

        if (responsesError) throw responsesError;

        const completed = responses?.filter(r => r.completed_at).length || 0;
        const pending = (typedData?.length || 0) - completed;

        setStats({
          totalAssigned: typedData?.length || 0,
          completed,
          pending: pending > 0 ? pending : 0,
        });
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Erreur réseau, chargement des données locales...");
      await loadOfflineData();
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("Vous devez être connecté à internet pour synchroniser");
      return;
    }
    if (!user) return;

    setSyncing(true);
    setSyncProgress("Envoi des réponses en attente...");

    try {
      const result = await syncAll(user.id, roles);

      setSyncProgress(null);

      const messages: string[] = [];
      if (result.responsesUploaded > 0) {
        messages.push(`${result.responsesUploaded} réponse(s) envoyée(s)`);
      }
      if (result.responsesFailed > 0) {
        messages.push(`${result.responsesFailed} réponse(s) échouée(s)`);
      }
      if (result.surveysDownloaded > 0) {
        messages.push(`${result.surveysDownloaded} sondage(s) synchronisé(s)`);
      }
      if (result.questionsDownloaded > 0) {
        messages.push(`${result.questionsDownloaded} question(s) téléchargée(s)`);
      }

      if (result.errors.length > 0) {
        toast.error(`Synchronisation partielle: ${result.errors[0]}`);
      } else {
        toast.success(messages.join(" • ") || "Tout est à jour !");
      }

      await loadData();
      await loadSyncInfo();
    } catch (error) {
      toast.error("Erreur de synchronisation");
      setSyncProgress(null);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSurveyClick = (surveyId: string) => {
    navigate(`/survey/${surveyId}`);
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

  const isAdminOrSupervisor = roles.includes("admin") || roles.includes("supervisor");
  const formatLastSync = lastSync 
    ? new Date(lastSync).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : "Jamais";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-primary shadow-lg">
        <div className="container flex items-center justify-between h-16 px-4">
          <Logo size="sm" variant="full" className="[&_span]:text-primary-foreground" />
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline 
                ? "bg-success/20 text-success-foreground" 
                : "bg-destructive/20 text-destructive-foreground"
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? "En ligne" : "Hors ligne"}
            </div>

            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Bonjour 👋</h1>
          <p className="text-muted-foreground">{user?.email}</p>
          {roles.length > 0 && (
            <div className="flex gap-2 mt-2">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role === "surveyor" ? "Enquêteur" : role === "admin" ? "Admin" : "Superviseur"}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sync Card */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-semibold">Synchronisation</span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleSync}
                disabled={syncing || !isOnline}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sync..." : "Synchroniser"}
              </Button>
            </div>

            {syncProgress && (
              <p className="text-sm text-muted-foreground animate-pulse">{syncProgress}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CloudUpload className="h-4 w-4 text-warning" />
                <span>
                  <strong>{pendingCount}</strong> réponse(s) en attente
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CloudDownload className="h-4 w-4 text-success" />
                <span>Dernière sync: {formatLastSync}</span>
              </div>
            </div>

            {pendingCount > 0 && !isOnline && (
              <p className="text-xs text-warning">
                ⚠️ Connectez-vous à internet pour envoyer les {pendingCount} réponse(s) en attente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalAssigned}</p>
              <p className="text-xs text-muted-foreground">Sondages</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Terminés</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Link */}
        {isAdminOrSupervisor && (
          <Card 
            className="border-0 shadow-md gradient-primary-soft cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin")}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Back-Office</p>
                  <p className="text-sm text-muted-foreground">Gérer les sondages et enquêteurs</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Surveys List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Mes sondages
            {!isOnline && <Badge variant="outline" className="ml-2 text-xs">Mode hors ligne</Badge>}
          </h2>
          
          {assignments.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucun sondage disponible</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {isOnline ? "Les sondages apparaîtront ici une fois assignés" : "Synchronisez pour télécharger vos sondages"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                  onClick={() => handleSurveyClick(assignment.survey_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{assignment.surveys.title}</h3>
                          {assignment.surveys.is_active ? (
                            <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactif
                            </Badge>
                          )}
                        </div>
                        {assignment.surveys.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.surveys.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
