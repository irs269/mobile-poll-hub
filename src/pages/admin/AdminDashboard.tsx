import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  Users, 
  FileCheck, 
  Activity,
  TrendingUp
} from "lucide-react";

interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  totalSurveyors: number;
  totalResponses: number;
  todayResponses: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    totalSurveyors: 0,
    totalResponses: 0,
    todayResponses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch surveys count
      const { count: totalSurveys } = await supabase
        .from("surveys")
        .select("*", { count: "exact", head: true });

      const { count: activeSurveys } = await supabase
        .from("surveys")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch surveyors count
      const { count: totalSurveyors } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "surveyor");

      // Fetch responses count
      const { count: totalResponses } = await supabase
        .from("survey_responses")
        .select("*", { count: "exact", head: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todayResponses } = await supabase
        .from("survey_responses")
        .select("*", { count: "exact", head: true })
        .gte("completed_at", today.toISOString());

      setStats({
        totalSurveys: totalSurveys || 0,
        activeSurveys: activeSurveys || 0,
        totalSurveyors: totalSurveyors || 0,
        totalResponses: totalResponses || 0,
        todayResponses: todayResponses || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Sondages",
      value: stats.totalSurveys,
      subtitle: `${stats.activeSurveys} actifs`,
      icon: ClipboardList,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Enquêteurs",
      value: stats.totalSurveyors,
      subtitle: "Utilisateurs actifs",
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Réponses totales",
      value: stats.totalResponses,
      subtitle: "Collectées",
      icon: FileCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Aujourd'hui",
      value: stats.todayResponses,
      subtitle: "Nouvelles réponses",
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-md">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl lg:text-3xl font-bold mt-1">
                    {loading ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-2 lg:p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actions rapides
          </CardTitle>
          <CardDescription>
            Gérez vos sondages et votre équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/surveys"
              className="p-4 rounded-lg border-2 border-dashed hover:border-primary/50 hover:bg-accent/50 transition-colors text-center"
            >
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Créer un sondage</p>
              <p className="text-sm text-muted-foreground">Nouveau questionnaire</p>
            </a>
            <a
              href="/admin/surveyors"
              className="p-4 rounded-lg border-2 border-dashed hover:border-secondary/50 hover:bg-accent/50 transition-colors text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="font-medium">Gérer les enquêteurs</p>
              <p className="text-sm text-muted-foreground">Équipe & assignations</p>
            </a>
            <a
              href="/admin/responses"
              className="p-4 rounded-lg border-2 border-dashed hover:border-success/50 hover:bg-accent/50 transition-colors text-center"
            >
              <FileCheck className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="font-medium">Voir les réponses</p>
              <p className="text-sm text-muted-foreground">Export & analyse</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
