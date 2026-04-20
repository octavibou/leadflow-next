'use client';

import { Suspense, Component, ReactNode, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import FunnelEditor from "@/views/FunnelEditor";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log("[v0] ErrorBoundary caught error:", error.message);
    console.log("[v0] Error stack:", error.stack);
    console.log("[v0] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error al cargar el editor</h1>
          <pre className="bg-red-50 p-4 rounded text-left text-sm overflow-auto max-w-2xl mx-auto">
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <ErrorBoundary>
          <Suspense>
            <FunnelEditor />
          </Suspense>
        </ErrorBoundary>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}
