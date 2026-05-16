import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { DemoSlides } from "@/components/DemoSlides";
import { 
  Smartphone, 
  MapPin, 
  Wifi, 
  BarChart3,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

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
            <div className="flex justify-center mb-8 animate-fade-in">
              <Logo size="xl" variant="full" className="[&_span]:text-primary-foreground" />
            </div>
            
            <h1 className="text-3xl lg:text-5xl font-extrabold text-primary-foreground mb-6 animate-slide-up">
              Collecte de données terrain simplifiée
            </h1>
            
            <p className="text-lg lg:text-xl text-primary-foreground/80 mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Créez des sondages, assignez-les à vos enquêteurs et collectez des réponses géolocalisées, même hors-ligne.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate("/auth")}
              >
                Commencer maintenant
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                variant="outline-light"
                size="xl"
                onClick={() => navigate("/auth")}
              >
                Se connecter
              </Button>
            </div>

            {/* Play Store Badge */}
            <div className="mt-10 flex flex-col items-center gap-3 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <p className="text-sm text-primary-foreground/80 font-medium">
                Application mobile disponible sur
              </p>
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-black/80 hover:bg-black border border-white/20 transition-all hover:scale-105 shadow-lg"
                aria-label="Télécharger sur Google Play Store"
              >
                <svg viewBox="0 0 512 512" className="h-9 w-9" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#34A853" d="M325.3 234.3L104.6 13l280.8 161.2z"/>
                  <path fill="#FBBC04" d="M104.6 13l220.7 221.3-220.7 221.3z"/>
                  <path fill="#EA4335" d="M385.4 174.2L104.6 13l220.7 221.3z"/>
                  <path fill="#4285F4" d="M104.6 455.6l280.8-161.2-60.1-60.1z"/>
                </svg>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] text-white/80 uppercase tracking-wide">Disponible sur</span>
                  <span className="text-lg font-semibold text-white">Google Play</span>
                </div>
              </a>
              <p className="text-xs text-primary-foreground/70 max-w-md text-center mt-2">
                Bientôt disponible — solution complète pour vos campagnes d'enquêtes terrain.
              </p>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </header>

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
