import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import { Copy, Check, Eye, Code, Rocket, CheckCircle, Link } from "@phosphor-icons/react";
import type { Funnel } from "@/types/funnel";

export function PublishTab({ funnel }: { funnel: Funnel }) {
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const isPublished = !!funnel.saved_at && funnel.saved_at !== funnel.updated_at;
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${funnel.id}`;
  const embedCode = `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await saveFunnel(funnel.id);
      toast.success("¡Funnel publicado!");
    } catch (err) {
      toast.error("Error al publicar");
    }
    setPublishing(false);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8">
      {/* Status indicator */}
      <div className="border rounded-xl p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Estado actual</p>
            <div className="flex items-center gap-2">
              {isPublished ? (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <p className="text-sm font-semibold text-green-600">Publicado</p>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                  <p className="text-sm font-semibold text-yellow-600">Borrador</p>
                </>
              )}
            </div>
          </div>
          {isPublished && (
            <p className="text-xs text-muted-foreground">
              Publicado: {new Date(funnel.saved_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="text-center space-y-3">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm border inline-block">
            <QRCodeSVG value={url} size={160} level="M" />
          </div>
        </div>

        <h2 className="text-2xl font-bold">
          {!isPublished && "Publica tu funnel"}
          {isPublished && <>Funnel <span className="text-green-500">en vivo</span></>}
        </h2>
        <p className="text-sm text-muted-foreground">
          {!isPublished && "Una vez publicado, tu funnel estará disponible y generará leads."}
          {isPublished && "Tu funnel está activo y generando leads."}
        </p>
      </div>

      {/* URL display */}
      <div className="border rounded-xl p-4 bg-card">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground shrink-0" weight="bold" />
          <Input
            readOnly
            value={url}
            className="h-9 text-sm border-0 bg-transparent focus-visible:ring-0 p-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copy(url, "URL")}
            className="shrink-0 gap-1.5"
          >
            {copied === "URL" ? <Check className="h-3.5 w-3.5" weight="bold" /> : <Copy className="h-3.5 w-3.5" weight="bold" />}
            Copiar
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2 h-12"
          onClick={() => window.open(url, "_blank")}
        >
          <Eye className="h-4 w-4" weight="bold" />
          Preview
        </Button>
        {!isPublished ? (
          <Button
            className="flex-1 gap-2 h-12"
            onClick={handlePublish}
            disabled={publishing}
          >
            <Rocket className="h-4 w-4" weight="bold" />
            {publishing ? "Publicando..." : "Publicar ahora"}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1 gap-2 h-12"
            disabled
          >
            <CheckCircle className="h-4 w-4" weight="bold" />
            Publicado
          </Button>
        )}
      </div>

      {/* Embed code */}
      <div className="border rounded-xl p-6 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" weight="bold" />
          <h3 className="text-sm font-semibold">Embed en tu web</h3>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <code className="text-xs text-muted-foreground break-all block">{embedCode}</code>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(embedCode, "Embed")}
          className="gap-1.5"
        >
          {copied === "Embed" ? <Check className="h-3.5 w-3.5" weight="bold" /> : <Copy className="h-3.5 w-3.5" weight="bold" />}
          Copiar código embed
        </Button>
      </div>
    </div>
  );
}
