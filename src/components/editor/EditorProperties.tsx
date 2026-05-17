import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Trash, Plus, DotsSixVertical, Monitor, DeviceMobile } from "@phosphor-icons/react";
import type { Funnel, FunnelStep, QuestionOption, ContactField, ThankYouNextStep } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { ResultsPropertiesAdvanced } from "./ResultsPropertiesAdvanced";

interface Props {
  step: FunnelStep;
  funnel: Funnel;
  onUpdateStep: (stepId: string, updates: Partial<FunnelStep>) => void;
}

export function EditorProperties({ step, funnel, onUpdateStep }: Props) {
  const update = (updates: Partial<FunnelStep>) => onUpdateStep(step.id, updates);

  return (
    <div className="flex min-h-0 min-w-0 w-80 shrink-0 flex-col border-l bg-background">
      <div className="shrink-0 border-b px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Propiedades</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 space-y-4">
          {step.type === "intro" && <IntroProps step={step} update={update} />}
          {step.type === "question" && <QuestionProps step={step} update={update} />}
          {step.type === "contact" && <ContactProps step={step} funnel={funnel} update={update} />}
          {step.type === "results" && <ResultsPropertiesAdvanced step={step} funnel={funnel} onUpdateStep={onUpdateStep} />}
          {step.type === "booking" && <BookingProps step={step} update={update} />}
          {step.type === "vsl" && <VslProps step={step} update={update} />}
          {step.type === "delivery" && <DeliveryProps step={step} update={update} />}
          {step.type === "thankyou" && <ThankYouProps step={step} update={update} />}
        </div>
      </ScrollArea>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <Textarea
        className="text-sm resize-none"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function IntroProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const c = step.introConfig || { headline: "", description: "", cta: "", showVideo: false };
  const set = (k: string, v: any) => update({ introConfig: { ...c, [k]: v } });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const prefix = device === "mobile" ? "mobile" : "";
  const hKey = prefix ? "mobileHeadlineFontSize" : "headlineFontSize";
  const dKey = prefix ? "mobileDescriptionFontSize" : "descriptionFontSize";
  const cKey = prefix ? "mobileCtaFontSize" : "ctaFontSize";
  const sKey = prefix ? "mobileElementSpacing" : "elementSpacing";

  const hDefault = device === "mobile" ? 20 : 30;
  const dDefault = device === "mobile" ? 14 : 18;
  const cDefault = device === "mobile" ? 14 : 16;
  const sDefault = device === "mobile" ? 12 : 16;

  return (
    <>
      <Field label="Título" value={c.headline} onChange={(v) => set("headline", v)} />
      <TextArea label="Descripción" value={c.description} onChange={(v) => set("description", v)} />
      <Field label="Texto del botón" value={c.cta} onChange={(v) => set("cta", v)} />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar video</Label>
        <Switch checked={c.showVideo} onCheckedChange={(v) => set("showVideo", v)} />
      </div>
      {c.showVideo && <Field label="URL del video" value={c.videoUrl || ""} onChange={(v) => set("videoUrl", v)} />}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Mostrar línea divisoria (logo / contenido)</Label>
        <Switch checked={Boolean(c.showLandingDivider)} onCheckedChange={(v) => set("showLandingDivider", v)} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Tamaño y espaciado</Label>
        <div className="flex gap-1 border rounded-lg p-0.5">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor className="h-3.5 w-3.5" weight="bold" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <DeviceMobile className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Título — {(c as any)[hKey] || hDefault}px</Label>
        <Slider min={12} max={60} step={1} value={[(c as any)[hKey] || hDefault]} onValueChange={([v]) => set(hKey, v)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Descripción — {(c as any)[dKey] || dDefault}px</Label>
        <Slider min={10} max={32} step={1} value={[(c as any)[dKey] || dDefault]} onValueChange={([v]) => set(dKey, v)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Botón — {(c as any)[cKey] || cDefault}px</Label>
        <Slider min={10} max={28} step={1} value={[(c as any)[cKey] || cDefault]} onValueChange={([v]) => set(cKey, v)} className="mt-1" />
      </div>
      <Separator />
      <div>
        <Label className="text-xs text-muted-foreground">Espacio entre elementos — {(c as any)[sKey] || sDefault}px</Label>
        <Slider min={4} max={48} step={2} value={[(c as any)[sKey] || sDefault]} onValueChange={([v]) => set(sKey, v)} className="mt-1" />
      </div>
    </>
  );
}

function QuestionProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const q = step.question;
  if (!q) return null;

  const setQ = (updates: Partial<typeof q>) => update({ question: { ...q, ...updates } });
  const setOpt = (optId: string, updates: Partial<QuestionOption>) => {
    setQ({ options: q.options.map((o) => o.id === optId ? { ...o, ...updates } : o) });
  };
  const addOpt = () => {
    const newOpt: QuestionOption = { id: crypto.randomUUID(), question_id: q.id, label: "Nueva opción", emoji: "👍", value: `option-${Date.now()}`, qualifies: true, score: 2 };
    setQ({ options: [...q.options, newOpt] });
  };
  const delOpt = (optId: string) => setQ({ options: q.options.filter((o) => o.id !== optId) });

  return (
    <>
      <Field label="Texto de la pregunta" value={q.text} onChange={(v) => setQ({ text: v })} />

      {/* Variable toggle at question level */}
      <div className="pl-1 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={!!q.variableName}
            onCheckedChange={(checked) => {
              if (checked) {
                setQ({ variableName: q.text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "").substring(0, 20) });
              } else {
                setQ({ variableName: undefined });
              }
            }}
          />
          <span className="text-[10px] text-muted-foreground">Usar como variable en resultados</span>
        </label>
        {q.variableName && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-foreground shrink-0">Variable:</span>
            <Input
              className="h-6 text-xs font-mono flex-1"
              value={q.variableName}
              onChange={(e) => setQ({ variableName: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
              placeholder="ej: llamadas_dia"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Disposición</Label>
        <div className="flex gap-1">
          <Button size="sm" variant={q.layout === "opts-col" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setQ({ layout: "opts-col" })}>Columna</Button>
          <Button size="sm" variant={q.layout === "opts-2" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setQ({ layout: "opts-2" })}>2 Cols</Button>
        </div>
      </div>
      <Separator />
      <Label className="text-xs">Opciones</Label>
      <div className="space-y-2">
        {q.options.map((opt) => (
          <div key={opt.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <DotsSixVertical className="h-3 w-3 text-muted-foreground" weight="bold" />
              <Input className="h-7 text-sm w-12 text-center" value={opt.emoji} onChange={(e) => setOpt(opt.id, { emoji: e.target.value })} />
              <Input className="h-7 text-sm flex-1" value={opt.label} onChange={(e) => setOpt(opt.id, { label: e.target.value, value: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
              <button onClick={() => delOpt(opt.id)} className="text-muted-foreground hover:text-destructive"><Trash className="h-3.5 w-3.5" weight="bold" /></button>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <Badge
                variant="outline"
                className={cn(
                  "h-auto cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-medium shadow-none transition-colors",
                  opt.qualifies
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-950/35 dark:text-emerald-200"
                    : "bg-rose-100 text-rose-800 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:text-rose-200",
                )}
                onClick={() => setOpt(opt.id, { qualifies: !opt.qualifies })}
              >
                {opt.qualifies ? "Cualificado" : "Descualificado"}
              </Badge>
              <span className="text-xs text-muted-foreground">Puntos:</span>
              <select
                className="h-6 text-xs border rounded px-1 bg-background"
                value={opt.score}
                onChange={(e) => setOpt(opt.id, { score: parseInt(e.target.value) })}
              >
                {[0, 1, 2, 3, 4].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Numeric value — only shown when question has a variable */}
            {q.variableName && (
              <div className="flex items-center gap-2 pl-5">
                <span className="text-[10px] font-semibold text-foreground shrink-0">Valor:</span>
                <Input
                  type="number"
                  className="h-6 text-xs w-20 text-center"
                  value={opt.numericValue ?? ""}
                  onChange={(e) => setOpt(opt.id, { numericValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addOpt} className="w-full">
        <Plus className="h-4 w-4 mr-1" weight="bold" /> Añadir opción
      </Button>
    </>
  );
}

function ContactProps({ step, funnel, update }: { step: FunnelStep; funnel: Funnel; update: (u: Partial<FunnelStep>) => void }) {
  const fields = step.contactFields || [];
  const otherSteps = funnel.steps.filter((s) => s.id !== step.id);

  const stepLabel = (s: FunnelStep) => {
    const labels: Record<string, string> = { intro: "Intro", question: s.question?.text || "Pregunta", contact: "Contacto", results: "Resultados", booking: "Booking", thankyou: "Gracias", vsl: "VSL", delivery: "Entrega" };
    return `${s.order + 1}. ${labels[s.type] || s.type}`;
  };

  const isApellidosLabel = (label: string) => label.toLowerCase().includes("apellido");
  const nombreLikeField = fields.find((f) => f.fieldType === "text" && !isApellidosLabel(f.label));
  const hasLegacyApellidosField = fields.some((f) => isApellidosLabel(f.label));

  const NOMBRE_TOGGLE = {
    key: "nombre" as const,
    label: "Nombre completo",
    fieldType: "text" as const,
    placeholder: "Ej.: María Pérez",
  };
  const emailTelToggles = [
    { key: "email" as const, label: "Email", fieldType: "email" as const, placeholder: "Email" },
    { key: "tel" as const, label: "Teléfono", fieldType: "tel" as const, placeholder: "Teléfono" },
  ];

  const fieldOrder = ["Nombre completo", "Nombre", "Apellidos", "Email", "Teléfono"];
  const sortFields = (list: typeof fields) =>
    [...list].sort((a, b) => fieldOrder.indexOf(a.label) - fieldOrder.indexOf(b.label));

  type ContactFieldToggle = typeof NOMBRE_TOGGLE | (typeof emailTelToggles)[number];

  const toggleField = (toggle: ContactFieldToggle) => {
    if (toggle.key === "nombre") {
      const exists = nombreLikeField;
      if (exists) {
        update({ contactFields: fields.filter((f) => f.id !== exists.id) });
      } else {
        const newFields = [
          ...fields,
          {
            id: crypto.randomUUID(),
            step_id: step.id,
            fieldType: "text" as const,
            label: "Nombre completo",
            placeholder: toggle.placeholder,
            required: true,
          },
        ];
        update({ contactFields: sortFields(newFields) });
      }
      return;
    }
    const exists = fields.find((f) => f.label === toggle.label);
    if (exists) {
      update({ contactFields: fields.filter((f) => f.id !== exists.id) });
    } else {
      const newFields = [
        ...fields,
        {
          id: crypto.randomUUID(),
          step_id: step.id,
          fieldType: toggle.fieldType,
          label: toggle.label,
          placeholder: toggle.placeholder,
          required: true,
        },
      ];
      update({ contactFields: sortFields(newFields) });
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs shrink-0">{NOMBRE_TOGGLE.label}</Label>
          <Switch checked={Boolean(nombreLikeField)} onCheckedChange={() => toggleField(NOMBRE_TOGGLE)} />
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Un solo campo en el funnel. Si escriben «María Pérez», tomamos la última palabra como apellido y el resto como
          nombre; en el webhook van separados como{" "}
          <span className="font-mono text-[9px] text-foreground/80">firstName</span> /{" "}
          <span className="font-mono text-[9px] text-foreground/80">lastName</span> (y lo mismo en{" "}
          <span className="font-mono text-[9px] text-foreground/80">first_name</span> /{" "}
          <span className="font-mono text-[9px] text-foreground/80">last_name</span>) para automatizaciones.
        </p>
      </div>
      {hasLegacyApellidosField ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-2.5 py-2">
          <p className="text-[10px] text-muted-foreground leading-snug">
            Este paso aún tiene un campo «Apellidos» antiguo guardado. Ya no se usa el doble campo; puedes quitarlo para
            alinearlo con el nombre completo único.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 self-start text-xs"
            onClick={() => update({ contactFields: fields.filter((f) => !isApellidosLabel(f.label)) })}
          >
            Quitar campo Apellidos
          </Button>
        </div>
      ) : null}
      {emailTelToggles.map((toggle) => (
        <div key={toggle.key} className="flex items-center justify-between">
          <Label className="text-xs">{toggle.label}</Label>
          <Switch checked={fields.some((f) => f.label === toggle.label)} onCheckedChange={() => toggleField(toggle)} />
        </div>
      ))}
      <Separator />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-xs">Mostrar casilla de consentimiento</Label>
          <p className="mt-0.5 text-[10px] text-muted-foreground">«He leído y acepto…» bajo los campos</p>
        </div>
        <Switch
          checked={step.showContactConsentCheckbox !== false}
          onCheckedChange={(on) => update({ showContactConsentCheckbox: on ? undefined : false })}
          aria-label="Mostrar casilla de consentimiento"
        />
      </div>
      <TextArea label="Texto de consentimiento" value={step.contactConsent || ""} onChange={(v) => update({ contactConsent: v })} />
      <Field label="Texto del botón (CTA)" value={step.contactCta || ""} onChange={(v) => update({ contactCta: v })} placeholder="Ej.: Obtener mi resultado →" />

      <Separator />
      <Label className="text-xs font-semibold">Copia del paso (conversión)</Label>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Si vacías un campo, se usa el texto recomendado según el idioma del funnel (“casi listo”, envío del resultado, etc.).
      </p>
      <Field
        label="Titular"
        value={step.contactHeadline ?? ""}
        onChange={(v) => update({ contactHeadline: v.trim() ? v : undefined })}
        placeholder="¡Casi listo! Solo un paso más"
      />
      <TextArea
        label="Subtítulo"
        value={step.contactSubheadline ?? ""}
        onChange={(v) => update({ contactSubheadline: v.trim() ? v : undefined })}
        placeholder="Indica dónde enviarte el resultado..."
      />
      <Field
        label="Frase de confianza"
        value={step.contactTrustLine ?? ""}
        onChange={(v) => update({ contactTrustLine: v.trim() ? v : undefined })}
        placeholder="Datos cifrados · Sin spam"
      />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar frase de confianza</Label>
        <Switch
          checked={step.contactShowTrustBadge !== false}
          onCheckedChange={(v) => update({ contactShowTrustBadge: v ? true : false })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Barra “casi completado”</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">Solo en el pie fijo de la página</p>
        </div>
        <Switch
          checked={step.contactShowNearCompleteProgress !== false}
          onCheckedChange={(v) => update({ contactShowNearCompleteProgress: v ? true : false })}
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Porcentaje mostrado (80–99)</Label>
        <Input
          type="number"
          min={80}
          max={99}
          className="h-9 text-sm mt-1"
          value={step.contactProgressPercent ?? ""}
          placeholder="92"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              update({ contactProgressPercent: undefined });
              return;
            }
            const n = parseInt(raw, 10);
            if (Number.isNaN(n)) return;
            update({ contactProgressPercent: Math.min(99, Math.max(80, n)) });
          }}
        />
      </div>

      <Separator />

      {/* Routing */}
      <Label className="text-xs font-semibold">Enrutamiento</Label>
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1 block">✅ Calificado → ir a</Label>
        <select
          className="w-full h-9 border rounded-md px-3 text-sm bg-background"
          value={step.qualifiedRoute ?? ""}
          onChange={(e) => update({ qualifiedRoute: e.target.value ? parseInt(e.target.value) : undefined })}
        >
          <option value="">Siguiente paso</option>
          {otherSteps.map((s) => (
            <option key={s.id} value={s.order}>{stepLabel(s)}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Saltar para descualificados</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">No verán el formulario de contacto</p>
        </div>
        <Switch checked={!!step.skipContactIfDisqualified} onCheckedChange={(v) => update({ skipContactIfDisqualified: v })} />
      </div>

      {step.skipContactIfDisqualified && (
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">❌ Descualificado → ir a</Label>
          <select
            className="w-full h-9 border rounded-md px-3 text-sm bg-background"
            value={step.disqualifiedRoute ?? ""}
            onChange={(e) => update({ disqualifiedRoute: e.target.value ? parseInt(e.target.value) : undefined })}
          >
            <option value="">Siguiente paso</option>
            {otherSteps.map((s) => (
              <option key={s.id} value={s.order}>{stepLabel(s)}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

// ResultsProps removed — now using ResultsPropertiesAdvanced component

function BookingProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const c = step.bookingConfig || { bookingUrl: "" };
  return (
    <>
      <Field label="URL de reserva" value={c.bookingUrl} onChange={(v) => update({ bookingConfig: { bookingUrl: v } })} placeholder="Pega la URL de tu widget de calendario" />
      <p className="text-xs text-muted-foreground">Pega la URL del widget de calendario de GHL o cualquier página de reservas embebible.</p>
    </>
  );
}

function VslProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const c = step.vslConfig || { videoUrl: "", ctaLabel: "", ctaUrl: "" };
  const set = (k: string, v: string) => update({ vslConfig: { ...c, [k]: v } });
  return (
    <>
      <Field label="URL del video" value={c.videoUrl} onChange={(v) => set("videoUrl", v)} placeholder="URL de YouTube o Vimeo" />
      <Separator />
      <Field label="Texto del botón CTA" value={c.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
      <Field label="URL del botón CTA" value={c.ctaUrl} onChange={(v) => set("ctaUrl", v)} />
    </>
  );
}

function DeliveryProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const c = step.deliveryConfig || { resourceTitle: "", resourceDescription: "", downloadButtonLabel: "", downloadUrl: "" };
  const set = (k: string, v: string) => update({ deliveryConfig: { ...c, [k]: v } });
  return (
    <>
      <Field label="Título del recurso" value={c.resourceTitle} onChange={(v) => set("resourceTitle", v)} />
      <TextArea label="Descripción del recurso" value={c.resourceDescription} onChange={(v) => set("resourceDescription", v)} />
      <Field label="Texto del botón de descarga" value={c.downloadButtonLabel} onChange={(v) => set("downloadButtonLabel", v)} />
      <Field label="URL de descarga" value={c.downloadUrl} onChange={(v) => set("downloadUrl", v)} />
    </>
  );
}

function ThankYouProps({ step, update }: { step: FunnelStep; update: (u: Partial<FunnelStep>) => void }) {
  const c = step.thankYouConfig || { headline: "", subtitle: "", nextSteps: [], mode: "steps" as const };
  const mode = c.mode || "steps";
  const set = (k: string, v: any) => update({ thankYouConfig: { ...c, [k]: v } });

  const addNextStep = () => {
    const ns: ThankYouNextStep = { number: c.nextSteps.length + 1, title: "Nuevo paso", description: "Descripción" };
    set("nextSteps", [...c.nextSteps, ns]);
  };
  const updateNs = (i: number, updates: Partial<ThankYouNextStep>) => {
    const ns = [...c.nextSteps];
    ns[i] = { ...ns[i], ...updates };
    set("nextSteps", ns);
  };
  const removeNs = (i: number) => {
    const ns = c.nextSteps.filter((_: any, idx: number) => idx !== i).map((s: ThankYouNextStep, idx: number) => ({ ...s, number: idx + 1 }));
    set("nextSteps", ns);
  };

  return (
    <>
      <Field label="Título" value={c.headline} onChange={(v) => set("headline", v)} />
      <Field label="Subtítulo" value={c.subtitle} onChange={(v) => set("subtitle", v)} />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Mostrar emoji 🎉</Label>
        <Switch checked={c.showEmoji !== false} onCheckedChange={(v) => set("showEmoji", v)} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Contenido</Label>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "steps" ? "default" : "outline"} className="h-7 text-xs" onClick={() => set("mode", "steps")}>Pasos</Button>
          <Button size="sm" variant={mode === "button" ? "default" : "outline"} className="h-7 text-xs" onClick={() => set("mode", "button")}>Botón</Button>
        </div>
      </div>

      {mode === "steps" && (
        <>
          <Label className="text-xs">Próximos pasos</Label>
          {c.nextSteps.map((ns: ThankYouNextStep, i: number) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Paso {ns.number}</Badge>
                <button onClick={() => removeNs(i)} className="text-muted-foreground hover:text-destructive"><Trash className="h-3.5 w-3.5" weight="bold" /></button>
              </div>
              <Field label="Título" value={ns.title} onChange={(v) => updateNs(i, { title: v })} />
              <Field label="Descripción" value={ns.description} onChange={(v) => updateNs(i, { description: v })} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addNextStep} className="w-full">
            <Plus className="h-4 w-4 mr-1" weight="bold" /> Añadir paso
          </Button>
        </>
      )}

      {mode === "button" && (
        <>
          <Field label="Texto del botón" value={c.buttonLabel || ""} onChange={(v) => set("buttonLabel", v)} placeholder="Ir a mi sitio web" />
          <Field label="URL de destino" value={c.buttonUrl || ""} onChange={(v) => set("buttonUrl", v)} placeholder="https://ejemplo.com" />
        </>
      )}
    </>
  );
}
