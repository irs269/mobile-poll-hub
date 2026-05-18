import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Copy,
  Globe,
  Link as LinkIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  is_public?: boolean;
  created_at: string;
  question_count?: number;
}

export default function SurveysPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select(`
          *,
          survey_questions (id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const surveysWithCounts = (data || []).map((s) => ({
        ...s,
        question_count: s.survey_questions?.length || 0,
      }));

      setSurveys(surveysWithCounts);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      toast.error("Erreur lors du chargement des sondages");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("surveys")
        .insert({
          title: formData.title,
          description: formData.description || null,
          is_active: formData.is_active,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Sondage créé avec succès");
      setIsCreateDialogOpen(false);
      setFormData({ title: "", description: "", is_active: true });
      navigate(`/admin/surveys/${data.id}/edit`);
    } catch (error) {
      console.error("Error creating survey:", error);
      toast.error("Erreur lors de la création du sondage");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSurvey) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", selectedSurvey.id);

      if (error) throw error;

      toast.success("Sondage supprimé");
      setIsDeleteDialogOpen(false);
      setSelectedSurvey(null);
      fetchSurveys();
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (survey: Survey) => {
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ is_active: !survey.is_active })
        .eq("id", survey.id);

      if (error) throw error;

      setSurveys((prev) =>
        prev.map((s) =>
          s.id === survey.id ? { ...s, is_active: !s.is_active } : s
        )
      );
      toast.success(survey.is_active ? "Sondage désactivé" : "Sondage activé");
    } catch (error) {
      console.error("Error toggling survey:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleTogglePublic = async (survey: Survey) => {
    try {
      const newValue = !survey.is_public;
      const { error } = await supabase
        .from("surveys")
        .update({ is_public: newValue } as never)
        .eq("id", survey.id);
      if (error) throw error;
      setSurveys((prev) => prev.map((s) => (s.id === survey.id ? { ...s, is_public: newValue } : s)));
      toast.success(newValue ? "Sondage ouvert au public" : "Accès public désactivé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const copyPublicLink = async (survey: Survey) => {
    const url = `${window.location.origin}/s/${survey.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien public copié !");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const filteredSurveys = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Sondages</h1>
          <p className="text-muted-foreground">Gérez vos questionnaires</p>
        </div>
        <Button variant="default" className="gradient-primary" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sondage
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un sondage..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Surveys List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSurveys.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "Aucun sondage trouvé" : "Aucun sondage créé"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un sondage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveys.map((survey) => (
            <Card
              key={survey.id}
              className="border-0 shadow-md hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{survey.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {survey.description || "Pas de description"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/surveys/${survey.id}/preview`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePublic(survey)}>
                        <Globe className="h-4 w-4 mr-2" />
                        {survey.is_public ? "Rendre privé" : "Ouvrir au public"}
                      </DropdownMenuItem>
                      {survey.is_public && (
                        <DropdownMenuItem onClick={() => copyPublicLink(survey)}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Copier le lien public
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedSurvey(survey);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={survey.is_active ? "default" : "secondary"}>
                      {survey.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    {survey.is_public && (
                      <Badge variant="outline" className="border-primary/40 text-primary gap-1">
                        <Globe className="h-3 w-3" /> Public
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {survey.question_count} question{survey.question_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Switch
                    checked={survey.is_active}
                    onCheckedChange={() => handleToggleActive(survey)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau sondage</DialogTitle>
            <DialogDescription>
              Créez un nouveau questionnaire pour vos enquêteurs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Enquête satisfaction client"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du sondage..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Activer immédiatement</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="default" className="gradient-primary" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Création..." : "Créer et éditer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le sondage</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedSurvey?.title}" ? Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
