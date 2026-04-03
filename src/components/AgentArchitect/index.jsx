import React, { useState, useCallback } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useForgeStore } from "../../store/index.js";
import { AgentNode } from "./AgentNode.jsx";
import { CapabilitiesPanel } from "./CapabilitiesPanel.jsx";
import { GitBranch, Plus, Save, Trash2 } from "lucide-react";

const NODE_TYPES = { agentNode: AgentNode };

const DEFAULT_NODES = [
  {
    id: "supervisor",
    type: "agentNode",
    position: { x: 300, y: 80 },
    data: {
      label: "Supervisor Agent",
      role: "supervisor",
      capabilities: ["read_files", "run_commands", "spawn_agents"],
    },
  },
];

export function AgentArchitect() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [archName, setArchName] = useState("My Architecture");
  const saveArchitecture = useForgeStore((s) => s.saveArchitecture);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#f97316" } }, eds)),
    []
  );

  function addAgent() {
    const id = `agent-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "agentNode",
        position: { x: 100 + Math.random() * 400, y: 250 + Math.random() * 150 },
        data: { label: "New Agent", role: "worker", capabilities: ["read_files"] },
      },
    ]);
  }

  function updateNodeData(nodeId, data) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }

  function deleteSelected() {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }

  function save() {
    const arch = {
      id: `arch-${Date.now()}`,
      name: archName,
      nodes,
      edges,
      updatedAt: Date.now(),
    };
    saveArchitecture(arch);
    fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arch),
    });
  }

  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-forge-border flex items-center gap-3">
          <GitBranch size={14} className="text-forge-accent" />
          <input
            value={archName}
            onChange={(e) => setArchName(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none text-forge-text w-48"
          />
          <div className="ml-auto flex items-center gap-2">
            {selectedNode && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-red hover:border-forge-red transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
            <button
              onClick={addAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-text hover:border-forge-muted transition-colors"
            >
              <Plus size={12} />
              Add Agent
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-accent text-xs text-white hover:bg-orange-500 transition-colors"
            >
              <Save size={12} />
              Save
            </button>
          </div>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1" style={{ background: "#0e0e10" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
          >
            <Background color="#27272a" gap={20} size={1} />
            <Controls className="!bg-forge-surface !border-forge-border" />
            <MiniMap
              nodeColor="#f97316"
              maskColor="rgba(14,14,16,0.8)"
              style={{ background: "#18181b", border: "1px solid #27272a" }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Capabilities panel */}
      {selectedNode && (
        <CapabilitiesPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
