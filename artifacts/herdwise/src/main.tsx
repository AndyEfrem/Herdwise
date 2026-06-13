import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Herdwise failed to render", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto mt-20 max-w-xl rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Herdwise could not start</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the frontend terminal and environment settings, then reload this page.
          </p>
          <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
            {this.state.error.message}
          </pre>
        </div>
      </main>
    );
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
