import { useState, useEffect } from "react";
import { UserPlus, Trash2, Mail, Clock, Check } from "lucide-react";
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
import { toast } from "sonner";
import type { WorkspaceRole } from "@/store/workspaceStore";


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

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function TeamMembers({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, [workspaceId]);

  const loadData = async () => {
    // Load members
    const { data: membersData } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (membersData) {
      // Get emails for members
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

    // Load pending invitations
    const { data: invData } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");

    if (invData) {
      setInvitations(invData as Invitation[]);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Email no válido");
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
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("Ya existe una invitación para este email");
      } else {
        toast.error("Error al enviar la invitación");
      }
    } else {
      // Send invitation email
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      const inviterEmail = (await supabase.auth.getUser()).data.user?.email;

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "workspace-invitation",
          recipientEmail: trimmedEmail,
          idempotencyKey: `ws-invite-${inserted.id}`,
          templateData: {
            workspaceName: ws?.name || "Workspace",
            role: ROLE_LABELS[inviteRole],
            inviterEmail: inviterEmail || undefined,
            acceptUrl: `${window.location.origin}/dashboard`,
          },
        },
      });

      toast.success(`Invitación enviada a ${trimmedEmail}`);
      setInviteEmail("");
      loadData();
    }
    setSending(false);
  };

  const handleCancelInvitation = async (id: string) => {
    await supabase.from("workspace_invitations").delete().eq("id", id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    toast.success("Invitación cancelada");
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Miembro eliminado");
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Equipo
        </CardTitle>
        <CardDescription>Invita miembros a este workspace para colaborar</CardDescription>
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
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()}>
            <Mail className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : "Invitar"}
          </Button>
        </div>

        {/* Unified team list: members + pending invitations */}
        {(members.length > 0 || invitations.length > 0) && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Equipo</Label>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    {m.user_id === currentUserId ? "Tú" : m.user_id.slice(0, 8) + "..."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                  {m.role !== "owner" && m.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{inv.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    Invitación enviada
                  </Badge>
                  <Badge variant="secondary">{ROLE_LABELS[inv.role]}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
