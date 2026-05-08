import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, MapPin, X, GripVertical, Upload } from "lucide-react";

interface QuestionRendererProps {
  questionId: string;
  questionType: string;
  options: string[] | null;
  value: unknown;
  onChange: (value: unknown) => void;
  onMultipleChoice?: (option: string, checked: boolean) => void;
  matrixRows?: string[];
  allowOther?: boolean;
}

const OTHER_PREFIX = "__other__:";
const OTHER_LABEL = "Autre (à préciser)";

export function QuestionRenderer({
  questionId,
  questionType,
  options,
  value,
  onChange,
  onMultipleChoice,
  matrixRows,
  allowOther,
}: QuestionRendererProps) {
  const id = questionId;

  switch (questionType) {
    // ===== BASIC =====
    case "single_choice": {
      const strVal = (value as string) || "";
      const isOther = strVal.startsWith(OTHER_PREFIX);
      const otherText = isOther ? strVal.slice(OTHER_PREFIX.length) : "";
      const radioVal = isOther ? "__other__" : strVal;
      return (
        <RadioGroup value={radioVal} onValueChange={(val) => onChange(val === "__other__" ? OTHER_PREFIX : val)} className="space-y-3">
          {options?.map((option, i) => (
            <div key={i} className="flex items-center space-x-3 p-4 rounded-lg border-2 border-muted hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onChange(option)}>
              <RadioGroupItem value={option} id={`${id}-${i}`} />
              <Label htmlFor={`${id}-${i}`} className="flex-1 cursor-pointer font-medium">{option}</Label>
            </div>
          ))}
          {allowOther && (
            <div className={`p-4 rounded-lg border-2 transition-colors ${isOther ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`}>
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onChange(OTHER_PREFIX + otherText)}>
                <RadioGroupItem value="__other__" id={`${id}-other`} />
                <Label htmlFor={`${id}-other`} className="flex-1 cursor-pointer font-medium">{OTHER_LABEL}</Label>
              </div>
              {isOther && (
                <Input
                  autoFocus
                  value={otherText}
                  onChange={(e) => onChange(OTHER_PREFIX + e.target.value)}
                  placeholder="Précisez votre réponse..."
                  className="mt-3"
                />
              )}
            </div>
          )}
        </RadioGroup>
      );
    }

    case "multiple_choice": {
      const arr = (value as string[]) || [];
      const otherEntry = arr.find((v) => v.startsWith(OTHER_PREFIX));
      const otherChecked = !!otherEntry;
      const otherText = otherEntry ? otherEntry.slice(OTHER_PREFIX.length) : "";
      return (
        <div className="space-y-3">
          {options?.map((option, i) => {
            const checked = arr.includes(option);
            return (
              <div key={i} className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${checked ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`} onClick={() => onMultipleChoice?.(option, !checked)}>
                <Checkbox checked={checked} onCheckedChange={(c) => onMultipleChoice?.(option, c as boolean)} id={`${id}-${i}`} />
                <Label htmlFor={`${id}-${i}`} className="flex-1 cursor-pointer font-medium">{option}</Label>
              </div>
            );
          })}
          {allowOther && (
            <div className={`p-4 rounded-lg border-2 transition-colors ${otherChecked ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`}>
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {
                const next = arr.filter((v) => !v.startsWith(OTHER_PREFIX));
                if (!otherChecked) next.push(OTHER_PREFIX + "");
                onChange(next);
              }}>
                <Checkbox checked={otherChecked} id={`${id}-other`} />
                <Label htmlFor={`${id}-other`} className="flex-1 cursor-pointer font-medium">{OTHER_LABEL}</Label>
              </div>
              {otherChecked && (
                <Input
                  autoFocus
                  value={otherText}
                  onChange={(e) => {
                    const next = arr.filter((v) => !v.startsWith(OTHER_PREFIX));
                    next.push(OTHER_PREFIX + e.target.value);
                    onChange(next);
                  }}
                  placeholder="Précisez votre réponse..."
                  className="mt-3"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    case "text_short":
      return <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="Votre réponse..." className="text-base h-12" />;

    case "text_long":
      return <Textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="Votre réponse détaillée..." rows={5} className="text-base resize-none" />;

    case "numeric":
      return <Input type="number" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="0" className="text-base h-12 text-center text-2xl font-semibold" />;

    case "date":
      return <Input type="date" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className="text-base h-12" />;

    // ===== ADVANCED =====
    case "likert":
      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground px-2">
            <span>Pas du tout</span>
            <span>Totalement</span>
          </div>
          <RadioGroup value={value as string} onValueChange={(val) => onChange(val)} className="flex justify-between">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="text-center">
                <RadioGroupItem value={String(num)} id={`${id}-${num}`} className="h-12 w-12 border-2" />
                <Label htmlFor={`${id}-${num}`} className="block mt-1 text-sm font-medium">{num}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "ranking":
      return <RankingQuestion id={id} options={options} value={value} onChange={onChange} />;

    case "matrix_single":
      return <MatrixQuestion id={id} options={options} rows={matrixRows} value={value} onChange={onChange} multiple={false} />;

    case "matrix_multiple":
      return <MatrixQuestion id={id} options={options} rows={matrixRows} value={value} onChange={onChange} multiple={true} />;

    case "numeric_scale": {
      const current = value as string;
      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground px-2">
            <span>1</span>
            <span>10</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                type="button"
                variant={current === String(num) ? "default" : "outline"}
                className="w-12 h-12 text-lg font-bold"
                onClick={() => onChange(String(num))}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    case "nps": {
      const npsVal = value as string;
      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground px-2">
            <span>Pas du tout probable</span>
            <span>Très probable</span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({ length: 11 }, (_, i) => i).map((num) => {
              let color = "bg-destructive/10 hover:bg-destructive/20 text-destructive";
              if (num >= 7 && num <= 8) color = "bg-warning/10 hover:bg-warning/20 text-warning";
              if (num >= 9) color = "bg-success/10 hover:bg-success/20 text-success";
              const selected = npsVal === String(num);
              return (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  className={`w-11 h-11 text-sm font-bold ${selected ? "ring-2 ring-primary border-primary" : color}`}
                  onClick={() => onChange(String(num))}
                >
                  {num}
                </Button>
              );
            })}
          </div>
        </div>
      );
    }

    case "slider": {
      const sliderVal = value !== undefined && value !== null && value !== "" ? [Number(value)] : [50];
      return (
        <div className="space-y-6 px-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0</span>
            <span className="text-2xl font-bold text-foreground">{sliderVal[0]}</span>
            <span>100</span>
          </div>
          <Slider
            value={sliderVal}
            onValueChange={(v) => onChange(String(v[0]))}
            min={0}
            max={100}
            step={1}
          />
        </div>
      );
    }

    // ===== INPUT =====
    case "email":
      return <Input type="email" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="example@email.com" className="text-base h-12" />;

    case "phone":
      return <Input type="tel" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="+243 ..." className="text-base h-12" />;

    case "url":
      return <Input type="url" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="text-base h-12" />;

    case "file_upload":
      return (
        <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">Appuyez pour choisir un fichier</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, Image, Document (max 10 Mo)</p>
          <Input
            type="file"
            className="mt-4"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(file.name);
            }}
          />
        </div>
      );

    case "signature":
      return <SignatureCanvas id={id} value={value} onChange={onChange} />;

    // ===== LOCATION & TIME =====
    case "time":
      return <Input type="time" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className="text-base h-12" />;

    case "datetime":
      return <Input type="datetime-local" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className="text-base h-12" />;

    case "location":
      return <LocationCapture value={value} onChange={onChange} />;

    // ===== MULTIMEDIA =====
    case "image_choice":
      return (
        <div className="grid grid-cols-2 gap-3">
          {options?.map((option, i) => {
            const selected = value === option;
            return (
              <div
                key={i}
                className={`p-4 rounded-lg border-2 text-center cursor-pointer transition-all ${selected ? "border-primary bg-primary/5 shadow-md" : "border-muted hover:border-primary/30"}`}
                onClick={() => onChange(option)}
              >
                <div className="w-full h-20 bg-muted rounded mb-2 flex items-center justify-center text-3xl">🖼️</div>
                <p className="text-sm font-medium">{option}</p>
              </div>
            );
          })}
        </div>
      );

    // ===== UX =====
    case "buttons":
      return (
        <div className="flex flex-wrap gap-3">
          {options?.map((option, i) => {
            const selected = value === option;
            return (
              <Button
                key={i}
                type="button"
                variant={selected ? "default" : "outline"}
                className={`px-6 py-3 text-base ${selected ? "shadow-md" : ""}`}
                onClick={() => onChange(option)}
              >
                {option}
              </Button>
            );
          })}
        </div>
      );

    case "dropdown":
      return (
        <Select value={(value as string) || ""} onValueChange={(val) => onChange(val)}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Sélectionnez une option..." />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option, i) => (
              <SelectItem key={i} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "autocomplete":
      return <AutocompleteInput options={options || []} value={(value as string) || ""} onChange={(v) => onChange(v)} />;

    case "tag_input":
      return <TagInput value={(value as string[]) || []} onChange={onChange} />;

    // ===== FEEDBACK =====
    case "emoji_rating": {
      const emojis = ["😡", "😞", "😐", "😊", "😍"];
      return (
        <div className="flex justify-center gap-4">
          {emojis.map((emoji, i) => {
            const selected = value === String(i + 1);
            return (
              <button
                key={i}
                type="button"
                className={`text-4xl p-3 rounded-xl transition-all ${selected ? "bg-primary/10 scale-125 ring-2 ring-primary" : "hover:scale-110 opacity-60 hover:opacity-100"}`}
                onClick={() => onChange(String(i + 1))}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      );
    }

    case "star_rating": {
      const starVal = Number(value) || 0;
      return (
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              className="transition-all hover:scale-110"
              onClick={() => onChange(String(num))}
            >
              <Star
                className={`h-10 w-10 ${num <= starVal ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
              />
            </button>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-muted-foreground italic">Type de question non supporté : {questionType}</p>;
  }
}

// ===== SUB-COMPONENTS =====

function RankingQuestion({ id, options, value, onChange }: { id: string; options: string[] | null; value: unknown; onChange: (v: unknown) => void }) {
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(value) && value.length > 0) return value as string[];
    return options || [];
  });

  const moveItem = (from: number, direction: "up" | "down") => {
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= items.length) return;
    const newItems = [...items];
    [newItems[from], newItems[to]] = [newItems[to], newItems[from]];
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">Réorganisez les éléments par ordre de préférence</p>
      {items.map((item, i) => (
        <div key={item} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-bold">{i + 1}</Badge>
          <span className="flex-1 font-medium">{item}</span>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => moveItem(i, "up")}>↑</Button>
            <Button type="button" variant="ghost" size="sm" disabled={i === items.length - 1} onClick={() => moveItem(i, "down")}>↓</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatrixQuestion({ id, options, rows, value, onChange, multiple }: { id: string; options: string[] | null; rows?: string[]; value: unknown; onChange: (v: unknown) => void; multiple: boolean }) {
  const matrixRows = rows?.length ? rows : ["Ligne 1", "Ligne 2", "Ligne 3"];
  const cols = options?.length ? options : ["Col 1", "Col 2", "Col 3"];
  const matrixValue = (value as Record<string, string | string[]>) || {};

  const handleCellClick = (row: string, col: string) => {
    const newVal = { ...matrixValue };
    if (multiple) {
      const current = (newVal[row] as string[]) || [];
      newVal[row] = current.includes(col) ? current.filter(c => c !== col) : [...current, col];
    } else {
      newVal[row] = col;
    }
    onChange(newVal);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left" />
            {cols.map((col) => (
              <th key={col} className="p-2 text-center font-medium text-muted-foreground">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrixRows.map((row) => (
            <tr key={row} className="border-t">
              <td className="p-3 font-medium">{row}</td>
              {cols.map((col) => {
                const isSelected = multiple
                  ? ((matrixValue[row] as string[]) || []).includes(col)
                  : matrixValue[row] === col;
                return (
                  <td key={col} className="p-2 text-center">
                    <button
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      onClick={() => handleCellClick(row, col)}
                    >
                      {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SignatureCanvas({ id, value, onChange }: { id: string; value: unknown; onChange: (v: unknown) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full border-2 border-muted rounded-lg cursor-crosshair bg-card touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>Effacer</Button>
    </div>
  );
}

function LocationCapture({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [loading, setLoading] = useState(false);
  const loc = value as { latitude: number; longitude: number } | null;

  const capture = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 text-center">
      <Button type="button" variant="outline" onClick={capture} disabled={loading} className="gap-2">
        <MapPin className="h-4 w-4" />
        {loading ? "Capture..." : "Capturer la position"}
      </Button>
      {loc && (
        <p className="text-sm text-muted-foreground">
          📍 {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}

function AutocompleteInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Tapez pour rechercher..."
        className="text-base h-12"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((option, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
              onMouseDown={() => { onChange(option); setOpen(false); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (v: unknown) => void }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 text-sm">
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
          placeholder="Ajouter un tag..."
          className="text-base h-10"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
      </div>
    </div>
  );
}
