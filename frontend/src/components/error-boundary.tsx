"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught client-side error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border bg-card p-6 text-center shadow-sm space-y-4">
          <div className="rounded-full bg-destructive/15 p-3 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Application Component Error</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {this.state.error?.message || "An unexpected client-side error occurred."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
