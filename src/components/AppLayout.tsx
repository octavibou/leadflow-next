'use client';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-sidebar">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 p-2 pl-0">
          <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            {/* Dark header */}
            <header className="h-12 flex items-center px-4 text-zinc-100">
              <SidebarTrigger className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" />
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
