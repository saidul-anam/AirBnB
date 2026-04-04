import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and state
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "#717171",
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#222",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h3>
          <p style={{ marginBottom: 20, maxWidth: 400 }}>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "12px 28px",
              background: "#222",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            🔄 Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px",
              background: "#fff",
              color: "#222",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>

          {process.env.NODE_ENV === "development" && (
            <details
              style={{
                marginTop: "20px",
                textAlign: "left",
                maxWidth: "600px",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              <summary style={{ cursor: "pointer", marginBottom: "10px" }}>
                Error Details (Development)
              </summary>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "4px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack ||
                  "No component stack available"}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
