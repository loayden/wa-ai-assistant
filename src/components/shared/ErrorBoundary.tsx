// FILE: src/components/shared/ErrorBoundary.tsx
"use client";

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Error boundaries remain client components and provide a compact
 * recovery surface for unexpected render failures.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = Readonly<{
  children: React.ReactNode;
}>;

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Render error", { error, errorInfo });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Alert className="border-destructive/40">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mb-3">Refresh the page or return to the dashboard.</AlertDescription>
          <Button size="sm" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}
