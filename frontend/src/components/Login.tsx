import { useState } from "react";
import { login } from "../api";

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(username, password);

    if (success) {
      onSuccess();
    } else {
      setError("Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "linear-gradient(180deg, #fff 0%, #f5f5f7 100%)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          minWidth: "360px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            marginBottom: "8px",
            letterSpacing: "-0.5px",
          }}
        >
          flow-ops
        </h1>
        <p style={{ color: "#86868b", marginBottom: "32px", fontSize: "15px" }}>
          Transform ideas into images
        </p>

        {error && (
          <div
            style={{
              color: "#ff3b30",
              marginBottom: "16px",
              fontSize: "14px",
              padding: "12px 16px",
              background: "#fff5f5",
              borderRadius: "12px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              background: "#fafafa",
              color: "#1d1d1f",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0071e3";
              e.target.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e5e5e5";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              background: "#fafafa",
              color: "#1d1d1f",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0071e3";
              e.target.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e5e5e5";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "none",
            background: loading ? "#86868b" : "#0071e3",
            color: "#fff",
            cursor: loading ? "wait" : "pointer",
            fontSize: "16px",
            fontWeight: 500,
            transition: "background 0.2s, transform 0.1s",
          }}
          onMouseDown={(e) => {
            if (!loading) e.currentTarget.style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
