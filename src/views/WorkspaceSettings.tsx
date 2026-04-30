'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Trash, MagnifyingGlass, Users } from "@phosphor-icons/react";
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
import { cn } from "@/lib/utils";
import { useWorkspaceMemberRole } from "@/hooks/useWorkspaceMemberRole";
import {
  canAccessWorkspaceTeamSettings,
  canManageWorkspaceAppearanceAndDanger,
} from "@/lib/workspaceRoles";

export default function WorkspaceSettings() {
  const router = useRouter();
  const { workspaces, getCurrentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const workspace = getCurrentWorkspace();

  const [name, setName] = useState(workspace?.name || "");
  const [logoUrl, setLogoUrl] = useState((workspace as any)?.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<"general" | "team" | "danger">("general");
  const [navQuery, setNavQuery] = useState("");

  const SECTIONS = [
    { id: "general" as const, label: "General", description: "Nombre e imagen del workspace", icon: null },
    { id: "team" as const, label: "Usuarios", description: "Miembros y permisos", icon: Users },
    { id: "danger" as const, label: "Zona de peligro", description: "Acciones irreversibles", icon: Trash },
  ];

  const { role: memberRole, loading: roleLoading } = useWorkspaceMemberRole(workspace?.id);

  useEffect(() => {
    if (!workspace || roleLoading) return;
    if (memberRole === "editor" || memberRole === "viewer") {
      toast.error("No tienes permiso para la configuracion del workspace.");
      router.replace("/dashboard");
    }
  }, [workspace, roleLoading, memberRole, router]);

  useEffect(() => {
    if (roleLoading || !workspace || !memberRole) return;
    const allowed: Array<typeof activeSection> = [];
    if (canManageWorkspaceAppearanceAndDanger(memberRole)) {
      allowed.push("general", "danger");
    }
    if (canAccessWorkspaceTeamSettings(memberRole)) {
      allowed.push("team");
    }
    if (!allowed.includes(activeSection) && allowed[0]) setActiveSection(allowed[0]);
  }, [roleLoading, memberRole, activeSection, workspace]);

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

  if (roleLoading || memberRole === "editor" || memberRole === "viewer") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-12">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const pageSubtitle = workspace.name;

  const navigableSections = SECTIONS.filter((s) => {
    if (s.id === "team") return canAccessWorkspaceTeamSettings(memberRole);
    return canManageWorkspaceAppearanceAndDanger(memberRole);
  });

  const filteredSections = navigableSections.filter((s) => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return true;
    return `${s.label} ${s.description}`.toLowerCase().includes(q);
  });

  const pageTitle = "Configuración";

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Button
            variant="ghost"
            className="mb-2 -ml-2 gap-2 px-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" weight="bold" /> Volver
          </Button>
          <h1 className="text-2xl font-bold leading-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground truncate">{pageSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
        {/* Sidebar */}
        <aside className="rounded-lg border bg-background p-3">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" weight="bold" />
            <Input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-9 pl-9"
            />
          </div>
          <div className="mt-3 space-y-1">
            {filteredSections.map((s) => {
              const Icon = s.icon;
              const active = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition",
                    active ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" weight="bold" /> : null}
                        {s.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-6">
          {activeSection === "general" && (
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
                          aria-label="Quitar logo"
                          type="button"
                        >
                          <X className="h-3 w-3" weight="bold" />
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
                        <Upload className="h-4 w-4" weight="bold" />
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
          )}

          {activeSection === "team" && (
            <div className="space-y-6">
              <TeamMembers workspaceId={workspace.id} />
            </div>
          )}

          {activeSection === "danger" && (
            <Card className="border-destructive/50">
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
                      <Trash className="h-4 w-4" weight="bold" /> Eliminar workspace
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
          )}
        </section>
      </div>
    </div>
  );
}
