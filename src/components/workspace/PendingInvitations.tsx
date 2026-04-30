import { useState, useEffect } from "react";
import { Mail, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { toast } from "sonner";
import { formatWorkspaceRoleEs } from "@/lib/workspaceRoles";

interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  workspace_name?: string;
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const { fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from("workspace_invitations")
      .select("*")
      .eq("email", user.user.email?.toLowerCase() ?? "")
      .eq("status", "pending");

    if (data && data.length > 0) {
      const wsIds = data.map((d) => d.workspace_id);
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("id, name")
        .in("id", wsIds);

      const wsMap = new Map((wsData || []).map((w) => [w.id, w.name]));

      setInvitations(
        data.map((inv) => ({
          ...inv,
          workspace_name: wsMap.get(inv.workspace_id) || "Workspace",
        }))
      );
    }
  };

  const handleAccept = async (invitationId: string, workspaceId: string) => {
    const { error } = await supabase.rpc("accept_workspace_invitation", {
      invitation_id: invitationId,
    });

    if (error) {
      toast.error("Error al aceptar la invitación");
    } else {
      toast.success("¡Te has unido al workspace!");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      // Reload workspaces and switch
      useWorkspaceStore.setState({ loaded: false });
      await fetchWorkspaces();
      setCurrentWorkspace(workspaceId);
    }
  };

  const handleDecline = async (invitationId: string) => {
    await supabase
      .from("workspace_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);

    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    toast.info("Invitación rechazada");
  };

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {invitations.map((inv) => (
        <Card key={inv.id} className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Te han invitado a <span className="font-semibold">{inv.workspace_name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Rol: {formatWorkspaceRoleEs(inv.role)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleAccept(inv.id, inv.workspace_id)} className="gap-1">
                <Check className="h-4 w-4" /> Aceptar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDecline(inv.id)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
