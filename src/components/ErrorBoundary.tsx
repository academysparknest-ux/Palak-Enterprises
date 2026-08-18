import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("[Palak Error Boundary caught error]:", error, errorInfo);

    // If chunk loading failed (new build deployment), auto-reload once to fetch fresh assets
    const isChunkError =
      error.message &&
      (error.message.includes("Failed to fetch dynamically imported module") ||
        error.message.includes("Importing a module script failed") ||
        error.message.includes("Loading chunk") ||
        error.message.includes("error loading dynamically imported module"));

    if (isChunkError) {
      const reloadKey = "palak_chunk_reload_attempted";
      const hasReloaded = sessionStorage.getItem(reloadKey);
      if (!hasReloaded) {
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem("palak_chunk_reload_attempted");
    window.location.reload();
  };

  private handleGoHome = () => {
    sessionStorage.removeItem("palak_chunk_reload_attempted");
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-lg space-y-5">
            <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                A new version of the website or network update was detected. Please refresh the page to load the latest content.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
