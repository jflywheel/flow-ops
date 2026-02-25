import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { fetchStockInfo } from "../../api";

interface StockInfo {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  fundamentals: {
    marketCap?: string;
    peRatio?: number;
    dividend?: number;
    volume?: string;
  };
}

interface StockTickerNodeProps {
  id: string;
  data: {
    stockInfo?: StockInfo;
    updateNodeData?: (nodeId: string, data: Record<string, unknown>) => void;
    propagateData?: (sourceId: string, value: unknown) => void;
  };
}

export default function StockTickerNode({ id, data }: StockTickerNodeProps) {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(data.stockInfo || null);

  const handleLookup = async () => {
    if (!ticker.trim()) {
      setError("Enter a ticker symbol first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await fetchStockInfo(ticker.trim().toUpperCase());
      setStockInfo(result);

      const outputData = {
        ticker: result.ticker,
        name: result.name,
        price: result.price,
        fundamentals: result.fundamentals,
      };

      data.updateNodeData?.(id, { stockInfo: result });
      data.propagateData?.(id, outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock info");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatChange = (change: number, percent: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        width: "220px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "#27ae60",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          $
        </div>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
          Stock Ticker
        </span>
      </div>

      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        placeholder="AAPL, GOOGL, MSFT..."
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "10px",
          border: "1px solid #e5e5e5",
          fontSize: "12px",
          marginBottom: "8px",
          fontFamily: "inherit",
          boxSizing: "border-box",
          textTransform: "uppercase",
        }}
      />

      <button
        onClick={handleLookup}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          background: loading ? "#e5e5e5" : "#27ae60",
          color: loading ? "#86868b" : "#fff",
          cursor: loading ? "wait" : "pointer",
          fontSize: "13px",
          fontWeight: 500,
          transition: "transform 0.1s",
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
        {loading ? "Looking up..." : "Lookup"}
      </button>

      {error && (
        <div
          style={{
            color: "#ff3b30",
            fontSize: "11px",
            marginTop: "8px",
            padding: "6px 8px",
            background: "#fff5f5",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {stockInfo && !loading && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px",
            background: "#f0fdf4",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#166534",
            lineHeight: "1.5",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>
            {stockInfo.ticker}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#86868b",
              marginBottom: "6px",
            }}
          >
            {stockInfo.name.length > 30
              ? stockInfo.name.slice(0, 30) + "..."
              : stockInfo.name}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>
            {formatPrice(stockInfo.price)}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: stockInfo.change >= 0 ? "#16a34a" : "#dc2626",
              marginTop: "2px",
            }}
          >
            {formatChange(stockInfo.change, stockInfo.changePercent)}
          </div>
          {stockInfo.fundamentals.marketCap && (
            <div
              style={{
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid #dcfce7",
                fontSize: "10px",
                color: "#86868b",
              }}
            >
              Mkt Cap: {stockInfo.fundamentals.marketCap}
              {stockInfo.fundamentals.peRatio && (
                <span> | P/E: {stockInfo.fundamentals.peRatio.toFixed(1)}</span>
              )}
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: "12px",
          height: "12px",
          background: "#27ae60",
          border: "2px solid #fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}
