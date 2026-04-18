'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FunnelStep } from "@/types/funnel";

interface OnboardingFunnel {
  id: string;
  name: string;
  steps: FunnelStep[];
}

const ClientOnboarding = () => {
  const params = useParams();
  const token = params?.token as string | undefined;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [funnels, setFunnels] = useState<OnboardingFunnel[]>([]);
  const [selections, setSelections] = useState<Record<string, Record<string, string[]>>>({});
  const [clientName, setClientName] = useState("");
  const [clientWebhook, setClientWebhook] = useState("");

  useEffect(() => {
    if (!token) return;
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/route-onboarding?token=${token}`, {
      headers: { "apikey": process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data.invitation);
          setFunnels(data.funnels || []);
          setSelections(data.existingAnswers || {});
          setClientName(data.invitation?.client_name || "");
          setClientWebhook(data.invitation?.client_webhook_url || "");
          if (data.invitation?.status === "completed") {
            setSubmitted(true);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar la invitación");
        setLoading(false);
      });
  }, [token]);

  const toggleOption = (funnelId: string, questionId: string, optionId: string) => {
    setSelections((prev) => {
      const funnelAnswers = prev[funnelId] || {};
      const current = funnelAnswers[questionId] || [];
      const newAnswers = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [funnelId]: { ...funnelAnswers, [questionId]: newAnswers },
      };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/route-onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({
          token,
          qualifyingAnswers: selections,
          clientName,
          clientWebhookUrl: clientWebhook,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch {
      setError("Error de conexión");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold mb-2">Enlace no válido</p>
            <p className="text-sm text-gray-500">Este enlace de onboarding ha expirado o no es válido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-semibold">¡Configuración guardada!</p>
            <p className="text-sm text-gray-500">Tus respuestas cualificadas han sido registradas. Empezarás a recibir leads que coincidan con tu selección.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const funnelsWithQuestions = funnels.filter((f) =>
    f.steps?.some((s: FunnelStep) =>
      s.type === "question" && s.question && s.question.options.some((o) => o.qualifies)
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Configura tus leads</h1>
          <p className="text-gray-500 mt-2">
            Selecciona las respuestas que cualifican para ti. Solo recibirás leads que coincidan con tu selección.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tu nombre o empresa</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej: Clínica Dental Madrid" />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input value={clientWebhook} onChange={(e) => setClientWebhook(e.target.value)} placeholder="https://hooks.example.com/..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {funnelsWithQuestions.map((funnel) => {
          const questionSteps = funnel.steps.filter(
            (s: FunnelStep) => s.type === "question" && s.question && s.question.options.some((o) => o.qualifies)
          );
          const funnelSelections = selections[funnel.id] || {};
          const selectedCount = Object.values(funnelSelections).reduce((s, opts) => s + opts.length, 0);

          return (
            <Card key={funnel.id}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600">{funnel.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-semibold">{funnel.name}</span>
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{selectedCount} seleccionada{selectedCount !== 1 ? "s" : ""}</Badge>
                  )}
                </div>

                {questionSteps.map((step: FunnelStep) => {
                  const q = step.question!;
                  const qualifiedOptions = q.options.filter((o) => o.qualifies);
                  const selected = funnelSelections[q.id] || [];

                  return (
                    <div key={q.id} className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{q.text}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {qualifiedOptions.map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <Checkbox
                              checked={selected.includes(opt.id)}
                              onCheckedChange={() => toggleOption(funnel.id, q.id, opt.id)}
                            />
                            <span className="text-sm">
                              {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {funnelsWithQuestions.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-gray-500">No hay preguntas configuradas todavía.</p>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar selección
        </Button>
      </div>
    </div>
  );
};

export default ClientOnboarding;
