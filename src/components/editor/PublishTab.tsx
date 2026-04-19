import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import { Copy, Check, Eye, Code, Rocket, CheckCircle, Link, Archive, Undo } from "@phosphor-icons/react";
import type { Funnel } from "@/types/funnel";

export function PublishTab({ funnel }: { funnel: Funnel }) {
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const publishFunnel = useFunnelStore((s) => s.publishFunnel);
  const archiveFunnel = useFunnelStore((s) => s.archiveFunnel);
  const unarchiveFunnel = useFunnelStore((s) => s.unarchiveFunnel);
  const [copied, setCopied] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const hasUnsavedChanges = !funnel.saved_at || funnel.updated_at > funnel.saved_at;
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${funnel.id}`;
  const embedCode = `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await saveFunnel(funnel.id);
      await publishFunnel(funnel.id);
      toast.success("¡Funnel publicado!");
    } catch (err) {
      toast.error("Error al publicar");
    }
    setPublishing(false);
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await archiveFunnel(funnel.id);
      toast.success("Funnel archivado");
    } catch (err) {
      toast.error("Error al archivar");
    }
    setArchiving(false);
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      await unarchiveFunnel(funnel.id);
      toast.success("Funnel restaurado");
    } catch (err) {
      toast.error("Error al restaurar");
    }
    setArchiving(false);
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
              {funnel.status === "published" && (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <p className="text-sm font-semibold text-green-600">Publicado</p>
                </>
              )}
              {funnel.status === "draft" && (
                <>
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                  <p className="text-sm font-semibold text-yellow-600">Borrador</p>
                </>
              )}
              {funnel.status === "archived" && (
                <>
                  <div className="h-2 w-2 bg-gray-500 rounded-full" />
                  <p className="text-sm font-semibold text-gray-600">Archivado</p>
                </>
              )}
            </div>
          </div>
          {funnel.published_at && (
            <p className="text-xs text-muted-foreground">
              Publicado: {new Date(funnel.published_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="text-center space-y-3">
        {/* QR Code */}
        {funnel.status !== "archived" && (
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-sm border inline-block">
              <QRCodeSVG value={url} size={160} level="M" />
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold">
          {funnel.status === "draft" && "Publica tu funnel"}
          {funnel.status === "published" && <>Funnel <span className="text-green-500">en vivo</span></>}
          {funnel.status === "archived" && <>Funnel <span className="text-gray-500">archivado</span></>}
        </h2>
        <p className="text-sm text-muted-foreground">
          {funnel.status === "draft" && "Una vez publicado, tu funnel estará disponible y generará leads."}
          {funnel.status === "published" && "Tu funnel está activo y generando leads. Puedes archivarlo si deseas desactivarlo."}
          {funnel.status === "archived" && "Este funnel está archivado y no está generando leads ni contando en tu cuota."}
        </p>
      </div>

      {funnel.status !== "archived" && (
        <>
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
            {funnel.status === "draft" ? (
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
                variant="destructive"
                className="flex-1 gap-2 h-12"
                onClick={handleArchive}
                disabled={archiving}
              >
                <Archive className="h-4 w-4" weight="bold" />
                {archiving ? "Archivando..." : "Archivar"}
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
        </>
      )}

      {funnel.status === "archived" && (
        <div className="border rounded-xl p-6 bg-muted/50 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Este funnel está archivado. Restauralo si deseas que vuelva a estar activo.
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleUnarchive}
            disabled={archiving}
          >
            <Undo className="h-4 w-4" weight="bold" />
            {archiving ? "Restaurando..." : "Restaurar funnel"}
          </Button>
        </div>
      )}
    </div>
  );
}
