import { useState, useEffect } from "react";
import { checkAuth } from "./api";
import Login from "./components/Login";
import FlowEditor from "./components/FlowEditor";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if already logged in
    checkAuth().then(setIsAuthenticated);
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  // Not logged in, show login
  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Logged in, show flow editor
  return <FlowEditor />;
}
