import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoSlides } from "@/components/DemoSlides";
import { 
  Smartphone, 
  MapPin, 
  Wifi, 
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Globe,
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [publicSurveys, setPublicSurveys] = useState<{ id: string; title: string; description: string | null }[]>([]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("surveys")
        .select("id, title, description")
        .eq("is_public", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      setPublicSurveys(data || []);
    })();
  }, []);

  const features = [
    {
      icon: Smartphone,
      title: "Application mobile",
      description: "Collectez des données sur le terrain avec une interface optimisée",
    },
    {
      icon: MapPin,
      title: "Géolocalisation GPS",
      description: "Capturez automatiquement les coordonnées de chaque enquête",
    },
    {
      icon: Wifi,
      title: "Mode hors-ligne",
      description: "Travaillez sans connexion, synchronisez plus tard",
    },
    {
      icon: BarChart3,
      title: "Analyse en temps réel",
      description: "Suivez les réponses et exportez vos données facilement",
    },
  ];

  const questionTypes = [
    "Choix unique",
    "Choix multiples",
    "Texte court/long",
    "Numérique",
    "Échelle Likert",
    "Date",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo size="xl" variant="icon" />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative container px-4 py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-8"
            >
              <Logo size="xl" variant="full" className="[&_span]:text-primary-foreground" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl lg:text-5xl font-extrabold text-primary-foreground mb-6"
            >
              Collecte de données terrain simplifiée
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-lg lg:text-xl text-primary-foreground/80 mb-10"
            >
              Créez des sondages, assignez-les à vos enquêteurs ou ouvrez-les au public — et collectez des réponses géolocalisées, même hors-ligne.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
                Commencer maintenant
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button variant="outline-light" size="xl" onClick={() => navigate("/auth")}>
                Se connecter
              </Button>
            </motion.div>

          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 leading-[0]">
          <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="block w-full h-[80px] lg:h-[120px]">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </header>

      {/* Public Surveys Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-primary/5">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 max-w-2xl mx-auto"
          >
            <Badge variant="outline" className="border-primary/40 text-primary gap-1 mb-4">
              <Globe className="h-3 w-3" /> Sans compte
            </Badge>
            <h2 className="text-2xl lg:text-4xl font-bold mb-4">
              Répondez aux enquêtes publiques en ligne
            </h2>
            <p className="text-lg text-muted-foreground">
              Aucune inscription requise. Les administrateurs peuvent ouvrir un sondage au grand public en un clic.
            </p>
          </motion.div>

          {publicSurveys.length === 0 ? (
            <div className="max-w-xl mx-auto">
              <Card className="border-dashed border-2 border-primary/20 bg-card/50">
                <CardContent className="p-8 text-center">
                  <Globe className="h-10 w-10 text-primary/60 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Aucune enquête publique pour le moment. Revenez bientôt !
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {publicSurveys.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <Card className="h-full border-primary/10 hover:border-primary/40 hover:shadow-xl transition-all group">
                    <CardContent className="p-6 flex flex-col h-full">
                      <Badge variant="secondary" className="self-start mb-3 gap-1">
                        <Globe className="h-3 w-3" /> Publique
                      </Badge>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{s.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                        {s.description || "Participez à cette enquête sans inscription."}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => navigate(`/s/${s.id}`)}
                      >
                        Répondre <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl lg:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une solution complète pour la collecte de données sur le terrain
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl gradient-primary-soft border border-primary/10 hover:shadow-lg transition-shadow animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Slides Section */}
      <DemoSlides />

      {/* Question Types Section */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl lg:text-4xl font-bold mb-4">
                Types de questions supportés
              </h2>
              <p className="text-lg text-muted-foreground">
                Créez des sondages riches avec différents types de questions
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {questionTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl lg:text-4xl font-bold mb-6">
              Prêt à commencer ?
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Créez votre premier sondage en quelques minutes et déployez-le sur le terrain.
            </p>
            <Button
              variant="gradient"
              size="xl"
              onClick={() => navigate("/auth")}
            >
              Créer un compte gratuit
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" variant="full" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} WASWIA - CAC International Bank Comores. Application de collecte de données terrain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
