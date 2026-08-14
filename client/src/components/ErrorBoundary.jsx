import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <div className="p-8 max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Something went wrong.</h1>
            <p className="text-sm opacity-80 mb-4 font-mono overflow-auto max-h-32">
              {this.state.error?.toString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-moss text-white rounded hover:bg-moss/90 dark:bg-glow dark:text-black dark:hover:bg-glow/90 transition text-sm font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 transition text-sm font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
