import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import { Copy, Check, Eye, Code, Rocket, CheckCircle2, Link } from "lucide-react";
import type { Funnel } from "@/types/funnel";

export function PublishTab({ funnel }: { funnel: Funnel }) {
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const hasUnsavedChanges = !funnel.saved_at || funnel.updated_at > funnel.saved_at;
  const url = `${window.location.origin}/f/${funnel.id}`;
  const embedCode = `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;

  const handlePublish = async () => {
    setPublishing(true);
    await saveFunnel(funnel.id);
    setPublishing(false);
    toast.success("¡Funnel publicado y listo!");
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8">
      <div className="text-center space-y-3">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm border inline-block">
            <QRCodeSVG value={url} size={160} level="M" />
          </div>
        </div>

        <h2 className="text-2xl font-bold">
          {hasUnsavedChanges ? "Publica tu funnel" : (
            <>Funnel is <span className="text-green-500">Live</span></>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasUnsavedChanges
            ? "Una vez publicado, tu funnel estará disponible en la URL de abajo."
            : `Última actualización: ${new Date(funnel.saved_at).toLocaleString()}`
          }
        </p>
      </div>

      {/* URL display */}
      <div className="border rounded-xl p-4 bg-card">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground shrink-0" />
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
            {copied === "URL" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
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
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button
          className="flex-1 gap-2 h-12"
          onClick={handlePublish}
          disabled={publishing}
        >
          {hasUnsavedChanges ? (
            <>
              <Rocket className="h-4 w-4" />
              {publishing ? "Publicando..." : "Publicar ahora"}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Funnel publicado
            </>
          )}
        </Button>
      </div>

      {/* Embed code */}
      <div className="border rounded-xl p-6 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
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
          {copied === "Embed" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copiar código embed
        </Button>
      </div>
    </div>
  );
}
