"use client";

import React, { Component, ErrorInfo, ReactNode, useEffect } from "react";
import { reportClientError } from "@/lib/clientLogger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ReactErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError({
      source: "react",
      message: error.message || "React Render Error",
      stack: error.stack,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center", color: "#fff", background: "#18181b", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Что-то пошло не так в интерфейсе</h2>
          <p style={{ color: "#a1a1aa", maxWidth: 400, marginBottom: 20, fontSize: 14 }}>
            Мы уже зафиксировали ошибку в системе мониторинга. Попробуйте перезагрузить страницу.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 16px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      reportClientError({
        source: "general",
        message: event.message || "Uncaught Error",
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError({
        source: "unhandled_rejection",
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        context: {
          rawReason: typeof reason === "object" ? JSON.stringify(reason) : String(reason),
        },
      });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return <ReactErrorBoundary>{children}</ReactErrorBoundary>;
}
