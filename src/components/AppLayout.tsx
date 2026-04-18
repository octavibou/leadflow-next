'use client';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-sidebar">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 p-2 pl-0">
          <div className="flex-1 bg-background rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <header className="h-12 flex items-center px-4 border-b">
              <SidebarTrigger />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
