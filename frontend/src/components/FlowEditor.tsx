import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Selected edge styling - makes it clear what will be deleted
const edgeStyles = `
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: #ef4444 !important;
    stroke-width: 3px !important;
  }
  .react-flow__edge:hover .react-flow__edge-path {
    stroke: #f97316 !important;
  }
`;

import TextInputNode from "./nodes/TextInputNode";
import ImageUploadNode from "./nodes/ImageUploadNode";
import URLInputNode from "./nodes/URLInputNode";
import EnhanceTextNode from "./nodes/EnhanceTextNode";
import IPhonePhotoNode from "./nodes/IPhonePhotoNode";
import AnimateNode from "./nodes/AnimateNode";
import TextOverlayNode from "./nodes/TextOverlayNode";
import CropNode from "./nodes/CropNode";
import ImageOutputNode from "./nodes/ImageOutputNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  textInput: TextInputNode,
  imageUpload: ImageUploadNode,
  urlInput: URLInputNode,
  enhanceText: EnhanceTextNode,
  iphonePhoto: IPhonePhotoNode,
  animate: AnimateNode,
  textOverlay: TextOverlayNode,
  crop: CropNode,
  imageOutput: ImageOutputNode,
};

// Preset flows - hardcoded templates
interface PresetFlow {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

const presetFlows: PresetFlow[] = [
  {
    name: "Text to Photo",
    description: "Generate photo from text",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "output-1", type: "imageOutput", position: { x: 700, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "URL to Photo",
    description: "Article to photo",
    nodes: [
      { id: "url-1", type: "urlInput", position: { x: 100, y: 200 }, data: { value: "", articleText: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 420, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "output-1", type: "imageOutput", position: { x: 720, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "url-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Photo to Video",
    description: "Animate an uploaded image",
    nodes: [
      { id: "upload-1", type: "imageUpload", position: { x: 100, y: 200 }, data: { imageUrl: "" } },
      { id: "animate-1", type: "animate", position: { x: 400, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 700, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "upload-1", target: "animate-1", type: "smoothstep" },
      { id: "e2-3", source: "animate-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Text to Video",
    description: "Generate photo then animate",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "animate-1", type: "animate", position: { x: 700, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 1000, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "animate-1", type: "smoothstep" },
      { id: "e3-4", source: "animate-1", target: "output-1", type: "smoothstep" },
    ],
  },
  {
    name: "Video for Meta",
    description: "Generate video and crop to 4:5",
    nodes: [
      { id: "input-1", type: "textInput", position: { x: 100, y: 200 }, data: { value: "" } },
      { id: "photo-1", type: "iphonePhoto", position: { x: 400, y: 200 }, data: { inputValue: "", imageUrl: "", prompt: "", loading: false } },
      { id: "animate-1", type: "animate", position: { x: 700, y: 200 }, data: { imageUrl: "", inputValue: "", videoUrl: "" } },
      { id: "crop-1", type: "crop", position: { x: 1000, y: 200 }, data: { imageUrl: "", videoUrl: "", outputUrl: "" } },
      { id: "output-1", type: "imageOutput", position: { x: 1300, y: 200 }, data: { imageUrl: "", prompt: "" } },
    ],
    edges: [
      { id: "e1-2", source: "input-1", target: "photo-1", type: "smoothstep" },
      { id: "e2-3", source: "photo-1", target: "animate-1", type: "smoothstep" },
      { id: "e3-4", source: "animate-1", target: "crop-1", type: "smoothstep" },
      { id: "e4-5", source: "crop-1", target: "output-1", type: "smoothstep" },
    ],
  },
];

// Sidebar items
const sources = [
  { type: "textInput", label: "Text Input", icon: "T" },
  { type: "imageUpload", label: "Image Upload", icon: "I" },
  { type: "urlInput", label: "URL Input", icon: "U" },
];
const operations = [
  { type: "enhanceText", label: "Enhance Text", icon: "E", gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" },
  { type: "iphonePhoto", label: "iPhone Photo", icon: "P", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { type: "textOverlay", label: "Text Overlay", icon: "T", gradient: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)" },
  { type: "animate", label: "Animate", icon: "A", gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" },
  { type: "crop", label: "Crop", icon: "C", gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
];

export default function FlowEditor() {
  // Start with empty canvas
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodeIdCounter = useRef(1);

  // Load a preset flow
  const loadPreset = useCallback((preset: PresetFlow) => {
    // Check if canvas has content
    if (nodes.length > 0) {
      if (!confirm(`This will replace your current flow. Continue?`)) {
        return;
      }
    }

    setNodes(preset.nodes);
    setEdges(preset.edges);

    // Update node counter to avoid ID conflicts
    const maxId = preset.nodes.reduce((max, node) => {
      const match = node.id.match(/-(\d+)$/);
      const num = match ? parseInt(match[1]) : 0;
      return Math.max(max, num);
    }, 0);
    nodeIdCounter.current = maxId + 1;
  }, [nodes.length, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Add the edge
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds));

      // Propagate data from source to target when connection is made
      if (params.source && params.target) {
        const sourceNode = nodes.find((n) => n.id === params.source);
        if (sourceNode) {
          const sourceData = sourceNode.data;

          // Determine what data to propagate based on source node type
          const dataToPropagate: Record<string, unknown> = {};

          // Text input nodes have "value"
          if (sourceData.value !== undefined) {
            dataToPropagate.inputValue = sourceData.value;
          }

          // Operation nodes may have outputValue (enhance text)
          if (sourceData.outputValue) {
            dataToPropagate.inputValue = sourceData.outputValue;
          }

          // Image-producing nodes have imageUrl and prompt
          if (sourceData.imageUrl) {
            dataToPropagate.imageUrl = sourceData.imageUrl;
            dataToPropagate.inputValue = sourceData.prompt || sourceData.imageUrl;
          }
          if (sourceData.prompt) {
            dataToPropagate.prompt = sourceData.prompt;
          }

          // Video-producing nodes have videoUrl
          if (sourceData.videoUrl) {
            dataToPropagate.imageUrl = sourceData.videoUrl; // Output node uses imageUrl for both
            dataToPropagate.inputValue = sourceData.videoUrl;
          }

          // Text overlay has outputUrl
          if (sourceData.outputUrl) {
            dataToPropagate.imageUrl = sourceData.outputUrl;
          }

          // Update the target node if we have data to propagate
          if (Object.keys(dataToPropagate).length > 0) {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === params.target
                  ? { ...node, data: { ...node.data, ...dataToPropagate } }
                  : node
              )
            );
          }
        }
      }
    },
    [setEdges, nodes, setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
    },
    [setNodes]
  );

  const propagateData = useCallback(
    (sourceId: string, value: string) => {
      const outgoingEdges = edges.filter((e) => e.source === sourceId);
      if (outgoingEdges.length > 1) {
        console.log(`Multi-output: Propagating data from ${sourceId} to ${outgoingEdges.length} targets:`, outgoingEdges.map(e => e.target));
      }
      for (const edge of outgoingEdges) {
        updateNodeData(edge.target, { inputValue: value });
      }
    },
    [edges, updateNodeData]
  );

  const propagateOutput = useCallback(
    (sourceId: string, imageUrl: string, prompt: string) => {
      const outgoingEdges = edges.filter((e) => e.source === sourceId);
      if (outgoingEdges.length > 1) {
        console.log(`Multi-output: Propagating output from ${sourceId} to ${outgoingEdges.length} targets:`, outgoingEdges.map(e => e.target));
      }
      for (const edge of outgoingEdges) {
        // Set both imageUrl/prompt for output nodes AND inputValue for chaining to other operations
        updateNodeData(edge.target, { imageUrl, prompt, inputValue: prompt });
      }
    },
    [edges, updateNodeData]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = { x: event.clientX - 280, y: event.clientY - 100 };
      const newNode: Node = {
        id: `${type}-${nodeIdCounter.current++}`,
        type,
        position,
        data:
          type === "textInput"
            ? { value: "" }
            : type === "imageUpload"
            ? { imageUrl: "" }
            : type === "urlInput"
            ? { value: "", articleText: "" }
            : type === "imageOutput"
            ? { imageUrl: "", prompt: "" }
            : type === "enhanceText"
            ? { inputValue: "", outputValue: "" }
            : type === "animate"
            ? { imageUrl: "", inputValue: "", videoUrl: "" }
            : type === "textOverlay"
            ? { imageUrl: "", inputValue: "", outputUrl: "" }
            : type === "crop"
            ? { imageUrl: "", videoUrl: "", outputUrl: "" }
            : { inputValue: "", imageUrl: "", prompt: "", loading: false },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <style>{edgeStyles}</style>
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          background: "#fff",
          borderRight: "1px solid #e5e5e5",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.3px",
              marginBottom: "4px",
            }}
          >
            flow-ops
          </h1>
          <p style={{ fontSize: "13px", color: "#86868b" }}>
            Drag nodes to build
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Sources
          </h3>
          {sources.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#f5f5f7",
                borderRadius: "12px",
                marginBottom: "8px",
                cursor: "grab",
                transition: "background 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "#0071e3",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Operations
          </h3>
          {operations.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#f5f5f7",
                borderRadius: "12px",
                marginBottom: "8px",
                cursor: "grab",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8ed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f7";
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: item.gradient,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Output
          </h3>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "imageOutput")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: "#f5f5f7",
              borderRadius: "12px",
              cursor: "grab",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e8e8ed";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f5f5f7";
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              O
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Output</span>
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid #e5e5e5" }}>
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#86868b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Presets
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {presetFlows.map((preset) => (
              <button
                key={preset.name}
                onClick={() => loadPreset(preset)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  background: "#f5f5f7",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e8e8ed";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f5f7";
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{preset.name}</span>
                <span style={{ fontSize: "11px", color: "#86868b" }}>{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              updateNodeData,
              propagateData,
              propagateOutput,
            },
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Delete", "Backspace"]}
          style={{ background: "#fafafa" }}
          defaultEdgeOptions={{
            style: { stroke: "#d1d1d6", strokeWidth: 2 },
          }}
        >
          <Controls
            style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e5e5" }}
          />
          <Background color="#e5e5e5" gap={24} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
