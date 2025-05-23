import React from 'react';
import { Agent } from '../types';

interface AgentSidebarProps {
  agents: Agent[];
  currentAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onOpenAgentModal: (agentToEdit?: Agent | null) => void;
  onDeleteAgent: (agentId: string) => void;
  onOpenGlobalSettings: () => void;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  currentAgentId,
  onSelectAgent,
  onOpenAgentModal,
  onDeleteAgent,
  onOpenGlobalSettings,
}) => {
  return (
    <aside className="w-80 bg-slate-900/70 backdrop-blur-md p-6 flex flex-col justify-between border-r border-slate-800 h-screen">
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-teal-400">Agents</h2>
          <button
            onClick={() => onOpenAgentModal(null)}
            title="Create New Agent"
            aria-label="Create New Agent"
            className="p-2 rounded-lg hover:bg-teal-500/20 text-teal-400 transition-colors"
          >
            <span className="material-icons-outlined">add</span>
          </button>
        </div>
        <nav className="space-y-3 overflow-y-auto custom-scrollbar max-h-[calc(100vh-220px)] pr-2 pb-4"> {/* Adjusted max-h and added pb for spacing */}
          {agents.map(agent => {
            const isActive = currentAgentId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectAgent(agent.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-colors duration-150
                  ${isActive 
                    ? 'bg-teal-600/20 border-teal-500' 
                    : 'bg-slate-800 border-slate-700 hover:border-teal-500'
                  }`}
              >
                <div className="flex justify-between items-start mb-1"> {/* items-start for better alignment if name wraps */}
                  <h3 
                    className={`font-medium truncate pr-2 ${isActive ? 'text-teal-300' : 'text-slate-200'}`}
                    title={agent.name}
                  >
                    {agent.name || "Untitled Agent"}
                  </h3>
                  <div className={`flex space-x-1.5 flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenAgentModal(agent); }} 
                      title="Edit Agent"
                      aria-label={`Edit agent ${agent.name}`}
                      className={`p-0.5 rounded hover:text-teal-300 transition-colors ${isActive ? '' : 'hover:text-teal-400'}`}
                    >
                      <span className="material-icons-outlined text-base">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteAgent(agent.id); }} 
                      title="Delete Agent"
                      aria-label={`Delete agent ${agent.name}`}
                      className={`p-0.5 rounded transition-colors ${isActive ? 'hover:text-red-400' : 'hover:text-red-500'}`}
                    >
                      <span className="material-icons-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
                <p 
                  className={`text-sm truncate ${isActive ? 'text-teal-400/90' : 'text-slate-400'}`} 
                  title={agent.description}
                >
                  {agent.description || "No description"}
                </p>
              </div>
            );
          })}
          {agents.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">No agents yet. Click '+' to add one.</p>
          )}
        </nav>
      </div>
      <button 
        onClick={onOpenGlobalSettings} 
        title="Global Settings"
        aria-label="Open Global Settings"
        className="w-full flex items-center space-x-3 p-3 mt-4 bg-slate-800 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        <span className="material-icons-outlined text-slate-400">settings</span>
        <span className="text-slate-300 text-sm">Global Settings</span>
      </button>
    </aside>
  );
};