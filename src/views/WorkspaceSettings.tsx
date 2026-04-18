'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamMembers } from "@/components/workspace/TeamMembers";

export default function WorkspaceSettings() {
  const router = useRouter();
  const { workspaces, getCurrentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const workspace = getCurrentWorkspace();

  const [name, setName] = useState(workspace?.name || "");
  const [logoUrl, setLogoUrl] = useState((workspace as any)?.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setLogoUrl((workspace as any)?.logo_url || "");
    }
  }, [workspace]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no puede superar 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${workspace.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("funnel-thumbnails")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Error al subir el logo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("funnel-thumbnails")
      .getPublicUrl(path);

    const newUrl = urlData.publicUrl;
    setLogoUrl(newUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);

    const updates: any = { name: name.trim() };
    if (logoUrl !== ((workspace as any)?.logo_url || "")) {
      updates.logo_url = logoUrl || null;
    }

    const { error } = await supabase
      .from("workspaces")
      .update(updates)
      .eq("id", workspace.id);

    if (error) {
      toast.error("Error al guardar");
    } else {
      updateWorkspace(workspace.id, { name: name.trim(), logo_url: logoUrl || null });
      toast.success("Workspace actualizado");
    }
    setSaving(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  if (!workspace) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push("/dashboard")}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>

      <h1 className="text-2xl font-bold mb-6">Configuración del Workspace</h1>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Nombre y logo de tu workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative h-16 w-16 rounded-xl border overflow-hidden bg-muted">
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Subiendo..." : "Subir logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG. Máx 2MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadLogo}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-name">Nombre</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del workspace"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      <TeamMembers workspaceId={workspace.id} />

      <Card className="border-destructive/50 mt-6">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de peligro</CardTitle>
          <CardDescription>
            Eliminar este workspace borrará todos los funnels, leads y configuraciones asociadas. Esta acción no se puede deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={workspaces.length <= 1}>
                <Trash2 className="h-4 w-4" /> Eliminar workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar "{workspace.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán permanentemente todos los funnels, campañas, leads y datos de este workspace. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const ok = await deleteWorkspace(workspace.id);
                    if (ok) {
                      toast.success("Workspace eliminado");
                      router.push("/dashboard");
                    } else {
                      toast.error("Error al eliminar el workspace");
                    }
                  }}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {workspaces.length <= 1 && (
            <p className="text-xs text-muted-foreground mt-2">No puedes eliminar tu único workspace.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
