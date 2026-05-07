import { useState, useEffect, useCallback } from "react";
import { UserPlus, Trash, Envelope, Clock, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { toast } from "sonner";
import type { WorkspaceRole } from "@/store/workspaceStore";

import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  INVITE_COLLABORATOR_HELPER,
  WORKSPACE_ROLE_LABELS_ES,
} from "@/lib/workspaceRoles";

interface Member {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  email?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  created_at: string;
}

async function formatFunctionsInvokeError(invokeError: {
  message?: string;
  context?: unknown;
}): Promise<string> {
  let detail = invokeError?.message ?? "Error al llamar a la funcion";
  try {
    const ctx = invokeError?.context;
    if (ctx && typeof ctx === "object" && "clone" in ctx && typeof (ctx as Response).clone === "function") {
      const body = (await (ctx as Response).clone().json()) as Record<string, unknown>;
      const parts: string[] = [];
      if (typeof body.error === "string") parts.push(body.error);
      if (typeof body.message === "string") parts.push(body.message);
      if (typeof body.detail === "string") parts.push(body.detail);
      if (typeof body.hint === "string") parts.push(body.hint);
      if (parts.length) detail = `${detail}. ${parts.join(" — ")}`;
    }
  } catch {
    /* ignore */
  }
  return detail;
}

export function TeamMembers({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [sending, setSending] = useState(false);
  const { user, isReady: authReady } = useAuthReady();
  const currentUserId = user?.id ?? null;
  const {
    canInviteMember,
    inviteBlockedBySeats,
    refresh: refreshPlanLimits,
  } = usePlanLimits();

  const loadData = useCallback(async () => {
    const { data: membersData } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (membersData) {
      const membersList: Member[] = [];
      for (const m of membersData) {
        membersList.push({
          id: m.id,
          user_id: m.user_id,
          role: m.role as WorkspaceRole,
        });
      }
      setMembers(membersList);
    }

    const { data: invData } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");

    if (invData) {
      setInvitations(invData as Invitation[]);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!authReady || !currentUserId) {
      toast.error("Sesion no disponible. Recarga la pagina.");
      return;
    }
    if (!canInviteMember) {
      toast.error("Has alcanzado el número de asientos de tu plan");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Email no valido");
      return;
    }

    setSending(true);
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    const { data: inserted, error } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: trimmedEmail,
        role: inviteRole,
        invited_by: currentUserId!,
      })
      .select("id, token")
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Ya existe una invitacion para este email");
      } else {
        toast.error("Error al enviar la invitacion");
      }
      setSending(false);
      return;
    }

    if (!inserted?.id || !inserted?.token) {
      toast.error("Error al enviar la invitacion");
      setSending(false);
      return;
    }

    try {
      // Send invitation email
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      const inviterEmail = (await supabase.auth.getUser()).data.user?.email;

      const inviteUrl = `${window.location.origin}/invite?t=${encodeURIComponent(inserted.token)}`;

      const { error: invokeError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "workspace-invitation",
          invitationId: inserted.id,
          idempotencyKey: `ws-invite-${inserted.id}`,
          templateData: {
            workspaceName: ws?.name || "Workspace",
            role: WORKSPACE_ROLE_LABELS_ES[inviteRole],
            inviterEmail: inviterEmail || undefined,
            acceptUrl: inviteUrl,
          },
        },
      });

      if (invokeError) {
        const detail = await formatFunctionsInvokeError(invokeError);
        toast.error(`Invitacion creada pero el correo no se pudo encolar (${detail})`);
      } else {
        toast.success(`Invitacion enviada a ${trimmedEmail}`);
      }
      refreshPlanLimits();
      setInviteEmail("");
      loadData();
    } catch {
      toast.error("Error al enviar la invitacion");
    }
    setSending(false);
  };

  const inviteDisabled =
    sending || !inviteEmail.trim() || !authReady || !canInviteMember || !currentUserId;

  const handleCancelInvitation = async (id: string) => {
    await supabase.from("workspace_invitations").delete().eq("id", id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    toast.success("Invitacion cancelada");
    refreshPlanLimits();
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Miembro eliminado");
    refreshPlanLimits();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" weight="bold" /> Equipo
        </CardTitle>
        <CardDescription>
          Invita miembros a este workspace para colaborar. {INVITE_COLLABORATOR_HELPER}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite form */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="nombre@empresa.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div className="w-32 space-y-1.5">
            <Label>Rol</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Solo lectura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={inviteDisabled}>
            <Envelope className="h-4 w-4 mr-2" weight="bold" />
            {sending ? "Enviando..." : "Invitar"}
          </Button>
        </div>
        {inviteBlockedBySeats ? (
          <p className="text-sm text-muted-foreground">
            Has alcanzado el limite de asientos de tu plan para este workspace. Revisa tu suscripcion para
            invitar mas personas.
          </p>
        ) : null}

        {/* Unified team list: members + pending invitations */}
        {(members.length > 0 || invitations.length > 0) && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Equipo</Label>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" weight="bold" />
                  </div>
                  <p className="text-sm font-medium">
                    {m.user_id === currentUserId ? "Tu" : m.user_id.slice(0, 8) + "..."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{WORKSPACE_ROLE_LABELS_ES[m.role]}</Badge>
                  {m.role !== "owner" && m.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      <Trash className="h-4 w-4" weight="bold" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" weight="bold" />
                  </div>
                  <p className="text-sm font-medium">{inv.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    Invitacion enviada
                  </Badge>
                  <Badge variant="secondary">{WORKSPACE_ROLE_LABELS_ES[inv.role]}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <Trash className="h-4 w-4" weight="bold" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
