import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { HelpCircle } from "lucide-react";

interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  order_index: number;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  surveyor_id: string | null;
  responses: Record<string, unknown>;
  completed_at: string | null;
}

interface QuestionStatsCardProps {
  question: SurveyQuestion;
  responses: SurveyResponse[];
}

const CHART_COLORS = [
  "hsl(275, 55%, 45%)",
  "hsl(180, 100%, 41%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(200, 80%, 50%)",
  "hsl(320, 70%, 50%)",
  "hsl(60, 80%, 45%)",
];

const questionTypeLabels: Record<string, string> = {
  single_choice: "Choix unique",
  multiple_choice: "Choix multiples",
  text_short: "Texte court",
  text_long: "Texte long",
  numeric: "Numérique",
  likert: "Échelle de Likert",
  date: "Date",
};

export default function QuestionStatsCard({ question, responses }: QuestionStatsCardProps) {
  const stats = useMemo(() => {
    const questionResponses = responses
      .filter((r) => r.completed_at && r.responses[question.id] !== undefined)
      .map((r) => r.responses[question.id]);

    const totalResponses = questionResponses.length;

    if (totalResponses === 0) {
      return { totalResponses: 0, data: [], average: null, mode: null };
    }

    // For choice-based questions
    if (question.question_type === "single_choice" || question.question_type === "likert") {
      const optionCounts = new Map<string, number>();
      
      questionResponses.forEach((answer) => {
        const value = String(answer);
        optionCounts.set(value, (optionCounts.get(value) || 0) + 1);
      });

      const data = (question.options || []).map((option) => ({
        name: option,
        count: optionCounts.get(option) || 0,
        percentage: ((optionCounts.get(option) || 0) / totalResponses) * 100,
      }));

      // Find mode (most common answer)
      let mode = "";
      let maxCount = 0;
      optionCounts.forEach((count, value) => {
        if (count > maxCount) {
          maxCount = count;
          mode = value;
        }
      });

      // For likert, calculate average if options are numeric-ish
      let average: number | null = null;
      if (question.question_type === "likert" && question.options) {
        const numericValues = questionResponses.map((v) => {
          const idx = question.options!.indexOf(String(v));
          return idx >= 0 ? idx + 1 : 0;
        }).filter((v) => v > 0);

        if (numericValues.length > 0) {
          average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }
      }

      return { totalResponses, data, average, mode };
    }

    // For multiple choice questions
    if (question.question_type === "multiple_choice") {
      const optionCounts = new Map<string, number>();
      
      questionResponses.forEach((answer) => {
        if (Array.isArray(answer)) {
          answer.forEach((v) => {
            const value = String(v);
            optionCounts.set(value, (optionCounts.get(value) || 0) + 1);
          });
        }
      });

      const data = (question.options || []).map((option) => ({
        name: option,
        count: optionCounts.get(option) || 0,
        percentage: ((optionCounts.get(option) || 0) / totalResponses) * 100,
      }));

      return { totalResponses, data, average: null, mode: null };
    }

    // For numeric questions
    if (question.question_type === "numeric") {
      const numericValues = questionResponses
        .map((v) => Number(v))
        .filter((v) => !isNaN(v));

      if (numericValues.length === 0) {
        return { totalResponses, data: [], average: null, mode: null };
      }

      const average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);

      // Create histogram bins
      const binCount = Math.min(10, numericValues.length);
      const binSize = (max - min) / binCount || 1;
      const bins = new Array(binCount).fill(0);
      const binLabels: string[] = [];

      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = min + (i + 1) * binSize;
        binLabels.push(`${Math.round(binStart)}-${Math.round(binEnd)}`);
      }

      numericValues.forEach((v) => {
        const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
        bins[binIndex]++;
      });

      const data = bins.map((count, i) => ({
        name: binLabels[i],
        count,
        percentage: (count / totalResponses) * 100,
      }));

      return { totalResponses, data, average, mode: null, min, max };
    }

    // For text questions, just show count
    return { totalResponses, data: [], average: null, mode: null };
  }, [question, responses]);

  const renderChart = () => {
    if (stats.data.length === 0) {
      if (question.question_type === "text_short" || question.question_type === "text_long" || question.question_type === "date") {
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>{stats.totalResponses} réponse{stats.totalResponses !== 1 ? "s" : ""} textuelles collectées</p>
          </div>
        );
      }
      return (
        <div className="text-center py-8 text-muted-foreground">
          Aucune donnée à afficher
        </div>
      );
    }

    if (question.question_type === "single_choice" || question.question_type === "likert") {
      return (
        <div className="space-y-3">
          {stats.data.map((item, index) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2">{item.name}</span>
                <span className="text-muted-foreground">
                  {item.count} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={item.percentage} 
                className="h-2"
                style={{ 
                  // @ts-ignore
                  "--progress-background": CHART_COLORS[index % CHART_COLORS.length] 
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (question.question_type === "multiple_choice") {
      return (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  `${value} (${((value / stats.totalResponses) * 100).toFixed(1)}%)`,
                  "Réponses"
                ]}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(180, 100%, 41%)" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (question.question_type === "numeric") {
      return (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(275, 55%, 45%)" 
                radius={[4, 4, 0, 0]}
                name="Fréquence"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium leading-tight">
              Q{question.order_index + 1}. {question.question_text}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {questionTypeLabels[question.question_type] || question.question_type}
            </Badge>
          </div>
          <div className="text-right text-sm text-muted-foreground shrink-0">
            <p>{stats.totalResponses} réponses</p>
            {stats.average !== null && (
              <p className="font-medium text-foreground">
                Moyenne: {stats.average.toFixed(2)}
              </p>
            )}
            {stats.mode && (
              <p className="font-medium text-foreground">
                Mode: {stats.mode}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
