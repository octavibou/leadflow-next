'use client';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-sidebar">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 p-2 pl-0">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-chrome-border bg-chrome shadow-sm">
            {/* Cromado Leadflow */}
            <header className="flex h-12 items-center px-4 text-chrome-fg">
              <SidebarTrigger className="text-chrome-fg-muted hover:bg-chrome-hover hover:text-chrome-fg" />
            </header>
            {/* Main content with rounded top corners */}
            <main className="flex-1 overflow-auto bg-background rounded-t-2xl">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
