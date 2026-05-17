'use client';

import { useRouter, usePathname } from "next/navigation";
import { Lightning, ChartBar, User, SignOut, CaretDown, Plus, Gear, Users, Path, GraduationCap, Globe, ChatCircle, Question, Sparkle, ArrowRight } from "@phosphor-icons/react";
import logoMark from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PLANS } from "@/lib/pricing";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAppAssistant } from "@/contexts/AppAssistantContext";
import { useWorkspaceMemberRole } from "@/hooks/useWorkspaceMemberRole";
import { canAccessWorkspaceTeamSettings } from "@/lib/workspaceRoles";

const tabs = [
  { label: "Funnels", path: "/dashboard", icon: Lightning },
  { label: "Analytics", path: "/analytics", icon: ChartBar },
  { label: "Route", path: "/routing", icon: Path, soon: true },
];

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaces, currentWorkspaceId, setCurrentWorkspace, getCurrentWorkspace, createWorkspace, updateWorkspace } = useWorkspaceStore();
  const { planName } = usePlanLimits();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const { open: assistantOpen, setOpen: setAssistantOpen } = useAppAssistant();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserEmail(u?.email || "");
      const meta = (u?.user_metadata || {}) as Record<string, any>;
      const name = meta.full_name || meta.name || (u?.email ? u.email.split("@")[0] : "");
      setUserName(name);
    });
  }, []);

  const currentWorkspace = getCurrentWorkspace();
  const { role: wsNavRole, loading: wsNavRoleLoading } = useWorkspaceMemberRole(currentWorkspaceId);
  const canOpenWorkspaceSettings =
    !!currentWorkspaceId && !wsNavRoleLoading && canAccessWorkspaceTeamSettings(wsNavRole);

  const initials = (userName || userEmail || "QF")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "QF";
  const planLabel = PLANS.find((p) => p.name === planName)?.label || "Starter";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const ws = await createWorkspace(newWorkspaceName.trim());
    if (ws) {
      setCurrentWorkspace(ws.id);
    }
    setNewWorkspaceName("");
    setCreateDialogOpen(false);
  };

  const handleSaveName = () => {
    if (tempName.trim() && currentWorkspace && tempName.trim() !== currentWorkspace.name) {
      updateWorkspace(currentWorkspace.id, { name: tempName.trim() });
      toast.success("Nombre actualizado");
    }
    setEditingName(false);
  };

  const handleWorkspaceClick = () => {
    if (editingName) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setTempName(currentWorkspace?.name || "");
      setEditingName(true);
      setDropdownOpen(false);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setDropdownOpen((prev) => !prev);
      }, 250);
    }
  };

  return (
    <header className="h-14 flex shrink-0 items-center gap-6 bg-chrome px-4 text-chrome-fg">
      {/* Left section with Workspace */}
      <div className="flex items-center gap-2">
        {/* Workspace Switcher */}
        {editingName ? (
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-lg bg-brand-lime flex items-center justify-center shrink-0 overflow-hidden">
              {currentWorkspace?.logo_url ? (
                <img src={currentWorkspace.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-brand-dark">
                  {currentWorkspace?.name?.charAt(0).toUpperCase() || "Q"}
                </span>
              )}
            </div>
            <Input
              className="h-7 w-40 text-sm font-semibold"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
            />
          </div>
        ) : (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 px-2 text-sm font-medium text-chrome-fg hover:bg-chrome-hover hover:text-white"
                onClick={(e) => {
                  e.preventDefault();
                  handleWorkspaceClick();
                }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-chrome-muted">
                  {currentWorkspace?.logo_url ? (
                    <img src={currentWorkspace.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-chrome-fg">
                      {currentWorkspace?.name?.charAt(0).toUpperCase() || "Q"}
                    </span>
                  )}
                </div>
                <span className="max-w-[160px] truncate">
                  {currentWorkspace?.name || "Workspace"}
                </span>
                <CaretDown className="h-3.5 w-3.5 text-chrome-fg-muted" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Workspace</DropdownMenuLabel>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setCurrentWorkspace(ws.id)}
                  className={cn(
                    "gap-2",
                    ws.id === currentWorkspaceId && "bg-accent"
                  )}
                >
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate">{ws.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {canOpenWorkspaceSettings && (
                <DropdownMenuItem onClick={() => { setDropdownOpen(false); router.push("/workspace-settings"); }}>
                  <Gear className="h-4 w-4 mr-2" weight="bold" /> Configuracion
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setDropdownOpen(false); setCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" weight="bold" /> Nuevo Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center tabs */}
      <nav className="flex items-center gap-1.5 flex-1 justify-center">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          const disabled = !!(tab as any).soon;
          const Icon = tab.icon;
          
          if (active) {
            return (
              <PlasticButton
                key={tab.label}
                variant="brand-lime"
                onClick={() => router.push(tab.path)}
                className="h-8 px-3"
              >
                <Icon className="h-3.5 w-3.5" weight="fill" />
                {tab.label}
              </PlasticButton>
            );
          }
          
          return (
            <Button
              key={tab.label}
              variant="ghost"
              onClick={() => !disabled && router.push(tab.path)}
              disabled={disabled}
              className="h-8 gap-2 px-3 text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
            >
              <Icon className="h-3.5 w-3.5" weight="bold" />
              {tab.label}
              {disabled && (
                <span className="text-[9px] bg-white/20 text-white/60 rounded px-1.5 py-0.5 font-medium ml-0.5">soon</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Academy button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open("https://www.skool.com/leadcommerce-4121", "_blank", "noopener,noreferrer")}
          className="h-8 w-8 rounded-lg text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
        >
          <GraduationCap className="h-4 w-4" weight="bold" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAssistantOpen(!assistantOpen)}
          className="h-8 w-8 rounded-lg text-chrome-fg hover:bg-chrome-hover hover:text-white"
          aria-label={assistantOpen ? "Cerrar asistente" : "Abrir asistente"}
        >
          <Sparkle className="h-4 w-4" weight="fill" />
        </Button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-chrome-hover">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="text-xs bg-brand-lime text-brand-dark font-semibold rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold truncate">{userName || "Usuario"}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="h-4 w-4 mr-2" weight="bold" />
              Settings
            </DropdownMenuItem>
            {canOpenWorkspaceSettings ? (
              <DropdownMenuItem onClick={() => router.push("/workspace-settings")}>
                <Globe className="h-4 w-4 mr-2" weight="bold" />
                Workspace
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => window.open("mailto:soporte@leadflow.es", "_blank")}>
              <ChatCircle className="h-4 w-4 mr-2" weight="bold" />
              Contact Support
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open("https://www.skool.com/leadcommerce-4121", "_blank", "noopener,noreferrer")}>
              <Question className="h-4 w-4 mr-2" weight="bold" />
              Help &amp; Tips
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {planName === "starter" && (
              <>
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <Sparkle className="h-4 w-4 mr-2" weight="fill" />
                  Mejorar plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <SignOut className="h-4 w-4 mr-2" weight="bold" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nombre del workspace"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
