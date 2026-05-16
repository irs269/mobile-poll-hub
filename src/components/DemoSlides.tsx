import { useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  ClipboardList,
  Users,
  MapPin,
  BarChart3,
  WifiOff,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Slide {
  title: string;
  description: string;
  icon: React.ElementType;
  bullets: string[];
  badge: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    badge: "01 — Création",
    title: "Concevez vos sondages en quelques clics",
    description:
      "Éditeur visuel complet : sections, choix unique/multiple, échelles, logique conditionnelle, option « Autre » avec saisie libre.",
    icon: ClipboardList,
    bullets: [
      "Sections et parties (Profil, Opinions, etc.)",
      "8+ types de questions",
      "Aperçu en temps réel",
    ],
    gradient: "from-primary to-secondary",
  },
  {
    badge: "02 — Enquêteurs",
    title: "Gérez vos équipes terrain",
    description:
      "Créez des comptes enquêteurs, assignez-les à des campagnes et suivez leur activité en temps réel depuis le dashboard admin.",
    icon: Users,
    bullets: [
      "Rôles : admin, superviseur, enquêteur",
      "Assignation multi-sondages",
      "Suivi des performances",
    ],
    gradient: "from-secondary to-primary",
  },
  {
    badge: "03 — Mobile",
    title: "Application Android optimisée",
    description:
      "Interface large et tactile, pensée pour les tablettes terrain. Vos enquêteurs collectent partout, même sans connexion.",
    icon: Smartphone,
    bullets: [
      "Disponible bientôt sur Play Store",
      "Boutons larges et lisibles",
      "Transitions fluides",
    ],
    gradient: "from-primary via-secondary to-primary",
  },
  {
    badge: "04 — Hors-ligne",
    title: "Mode offline-first",
    description:
      "Les réponses sont stockées localement et synchronisées automatiquement dès le retour de la connexion. Aucune donnée perdue.",
    icon: WifiOff,
    bullets: [
      "IndexedDB sur l'appareil",
      "Synchronisation automatique",
      "Indicateur d'état en direct",
    ],
    gradient: "from-secondary to-primary",
  },
  {
    badge: "05 — Géolocalisation",
    title: "Coordonnées GPS automatiques",
    description:
      "Chaque enquête est horodatée et géolocalisée au démarrage et à la fin. Idéal pour vérifier la qualité de collecte terrain.",
    icon: MapPin,
    bullets: [
      "GPS début et fin",
      "Export avec coordonnées",
      "Traçabilité complète",
    ],
    gradient: "from-primary to-secondary",
  },
  {
    badge: "06 — Reporting",
    title: "Analyses en temps réel",
    description:
      "Dashboard centralisé avec KPIs, filtres multi-critères, statistiques par question et export Excel/CSV prêt à l'emploi.",
    icon: BarChart3,
    bullets: [
      "KPIs en direct",
      "Filtres par enquêteur, date, lieu",
      "Export Excel avec GPS",
    ],
    gradient: "from-secondary via-primary to-secondary",
  },
];

export function DemoSlides() {
  const autoplay = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-muted/40">
      <div className="container px-4">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Démo en images
          </span>
          <h2 className="text-2xl lg:text-4xl font-bold mb-4">
            Découvrez la plateforme en 6 étapes
          </h2>
          <p className="text-lg text-muted-foreground">
            De la création du sondage à l'analyse des résultats terrain.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
            <div className="flex">
              {slides.map((slide, idx) => {
                const Icon = slide.icon;
                return (
                  <div
                    key={idx}
                    className="flex-[0_0_100%] min-w-0 px-2"
                  >
                    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${slide.gradient} p-8 lg:p-14 shadow-2xl min-h-[420px] lg:min-h-[460px]`}>
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wOCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />

                      <div className="relative grid lg:grid-cols-2 gap-8 items-center h-full">
                        <div className="text-primary-foreground">
                          <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold tracking-wider uppercase mb-5">
                            {slide.badge}
                          </span>
                          <h3 className="text-2xl lg:text-4xl font-extrabold mb-4 leading-tight">
                            {slide.title}
                          </h3>
                          <p className="text-base lg:text-lg text-primary-foreground/90 mb-6">
                            {slide.description}
                          </p>
                          <ul className="space-y-2.5">
                            {slide.bullets.map((b) => (
                              <li key={b} className="flex items-center gap-3">
                                <span className="h-2 w-2 rounded-full bg-white shrink-0" />
                                <span className="text-primary-foreground/95 font-medium">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="hidden lg:flex justify-center items-center">
                          <div className="relative">
                            <div className="absolute -inset-8 bg-white/10 rounded-full blur-3xl" />
                            <div className="relative w-48 h-48 lg:w-64 lg:h-64 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl">
                              <Icon className="h-24 w-24 lg:h-32 lg:w-32 text-white" strokeWidth={1.4} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              aria-label="Slide précédente"
              className="rounded-full h-11 w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-2 px-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className="h-2 w-2 rounded-full bg-primary/30 hover:bg-primary transition-colors"
                  aria-label={`Aller à la slide ${i + 1}`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              aria-label="Slide suivante"
              className="rounded-full h-11 w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
