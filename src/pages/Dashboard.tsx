import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  LogOut, 
  RefreshCw,
  ChevronRight,
  Wifi,
  WifiOff,
  User
} from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchAssignments();
    }

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, authLoading, navigate]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("survey_assignments")
        .select(`
          id,
          survey_id,
          surveys (
            id,
            title,
            description,
            is_active
          )
        `)
        .eq("surveyor_id", user?.id);

      if (error) throw error;

      // Type assertion for the nested query result
      const typedData = data as unknown as SurveyAssignment[];
      setAssignments(typedData || []);

      // Fetch response stats
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
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Erreur lors du chargement des sondages");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Sync local data logic would go here
      await fetchAssignments();
      toast.success("Synchronisation terminée");
    } catch (error) {
      toast.error("Erreur de synchronisation");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-primary shadow-lg">
        <div className="container flex items-center justify-between h-16 px-4">
          <Logo size="sm" variant="full" className="[&_span]:text-primary-foreground" />
          
          <div className="flex items-center gap-3">
            {/* Online Status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline 
                ? "bg-success/20 text-success-foreground" 
                : "bg-destructive/20 text-destructive-foreground"
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? "En ligne" : "Hors ligne"}
            </div>

            {/* Sync Button */}
            <Button 
              variant="outline-light" 
              size="icon-sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>

            {/* Sign Out */}
            <Button variant="outline-light" size="icon-sm" onClick={handleSignOut}>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalAssigned}</p>
              <p className="text-xs text-muted-foreground">Assignés</p>
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
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin/Supervisor Link */}
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

        {/* Assigned Surveys */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Mes sondages</h2>
          
          {assignments.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Aucun sondage assigné</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Les sondages apparaîtront ici une fois assignés
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
