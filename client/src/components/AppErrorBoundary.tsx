import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application rendering failed", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-16 text-center text-charcoal"><div className="max-w-md"><p className="eyebrow text-burgundy/65">A quiet interruption</p><h1 className="mt-4 font-display text-4xl">This page needs a fresh start.</h1><p className="mt-4 text-sm leading-6 text-charcoal/65">Something unexpected happened while loading this space. Your account and conversations are still safe.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => window.location.reload()} className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-cream">Refresh page</button><a href="/" className="rounded-full border border-charcoal/15 px-5 py-3 text-sm font-semibold text-burgundy">Back home</a></div></div></main>;
  }
}
