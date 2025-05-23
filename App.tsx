import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Agent, OutputFormat, ApiProviderType, ApiProviderOption, ModelDefinition } from './types';
import { DEFAULT_AGENT_PROPERTIES, API_PROVIDER_OPTIONS } from './constants';
import { generateContent } from './services/aiService';
import { AgentSidebar } from './components/AgentSidebar';
import { AgentModal } from './components/AgentModal';
import { SettingField } from './components/SettingField';

const generateId = () => `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

function App(): React.ReactNode {
  const [selectedApiProvider, setSelectedApiProvider] = useState<ApiProviderType>(() => {
    return (localStorage.getItem('selectedApiProvider_v1') as ApiProviderType | null) || 'google';
  });

  const [apiKeys, setApiKeys] = useState<Partial<Record<ApiProviderType, string>>>(() => {
    const savedKeys = localStorage.getItem('apiKeys_v3');
    return savedKeys ? JSON.parse(savedKeys) : {};
  });

  const [agents, setAgents] = useState<Agent[]>(() => {
    const savedAgents = localStorage.getItem('aiAgents_v2');
    if (savedAgents) {
      try {
        const parsedAgents = JSON.parse(savedAgents);
        return parsedAgents.map((agent: any) => {
          const providerExists = API_PROVIDER_OPTIONS.find(p => p.value === agent.apiProvider);
          const provider = providerExists ? agent.apiProvider : DEFAULT_AGENT_PROPERTIES.apiProvider;
          
          const providerConfig = API_PROVIDER_OPTIONS.find(p => p.value === provider);
          const modelExists = providerConfig?.models.some(m => m.id === agent.modelId);
          const modelId = modelExists ? agent.modelId : (providerConfig?.defaultModelId || providerConfig?.models[0]?.id || '');

          return {
            ...DEFAULT_AGENT_PROPERTIES,
            ...agent,                  
            apiProvider: provider,      
            modelId: modelId            
          };
        });
      } catch (error) {
        console.error("Failed to parse saved agents, initializing with default:", error);
      }
    }
    const defaultProviderConfig = API_PROVIDER_OPTIONS.find(p => p.value === DEFAULT_AGENT_PROPERTIES.apiProvider) || API_PROVIDER_OPTIONS[0];
    const defaultModel = defaultProviderConfig.defaultModelId || defaultProviderConfig.models[0]?.id || '';
    const defaultAgent: Agent = { 
        id: generateId(), 
        ...DEFAULT_AGENT_PROPERTIES, 
        apiProvider: defaultProviderConfig.value,
        modelId: defaultModel
    };
    return [defaultAgent];
  });

  const [currentAgentId, setCurrentAgentId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('currentAgentId_v2');
    const firstAgentId = agents.length > 0 ? agents[0].id : null;
    if (savedId && agents.find(a => a.id === savedId)) return savedId;
    return firstAgentId;
  });

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [outputArea, setOutputArea] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState<string>("Copy to clipboard");


  const currentAgent = useMemo(() => {
    return agents.find(agent => agent.id === currentAgentId) || (agents.length > 0 ? agents[0] : null);
  }, [agents, currentAgentId]);
  
  const currentGlobalProviderConfig = useMemo(() => API_PROVIDER_OPTIONS.find(p => p.value === selectedApiProvider) || API_PROVIDER_OPTIONS[0], [selectedApiProvider]);
  const activeGlobalApiKey = useMemo(() => apiKeys[selectedApiProvider] || '', [apiKeys, selectedApiProvider]);
  
  const setActiveGlobalApiKey = useCallback((key: string) => {
    setApiKeys(prev => ({ ...prev, [selectedApiProvider]: key }));
  }, [selectedApiProvider]);

  const [mainTitle, setMainTitle] = useState<string>('');
  const [agentDescriptionUI, setAgentDescriptionUI] = useState<string>('');
  const [submitBtnText, setSubmitBtnText] = useState<string>("Optimize Prompt");
  const [userPlaceholder, setUserPlaceholder] = useState<string>(DEFAULT_AGENT_PROPERTIES.inputPlaceholderSetting);

  useEffect(() => {
    if (currentAgent) {
      const agentName = currentAgent.name.trim() || "AI Agent";
      setMainTitle(agentName);
      setAgentDescriptionUI(currentAgent.description.trim() || "This agent helps you process content.");
      setUserPlaceholder(currentAgent.inputPlaceholderSetting.trim() || "E.g. \"Debug a snippet of code\"");
      setSubmitBtnText("Optimize Prompt"); 
      document.title = `${agentName} - AI Agent`;
    } else {
      setMainTitle("No Agent Selected");
      setAgentDescriptionUI("Please create or select an agent from the sidebar.");
      setUserPlaceholder(DEFAULT_AGENT_PROPERTIES.inputPlaceholderSetting);
      setSubmitBtnText("Select or Create Agent");
      document.title = "AI Agent Interface";
    }
  }, [currentAgent]);

  useEffect(() => {
    localStorage.setItem('selectedApiProvider_v1', selectedApiProvider);
  }, [selectedApiProvider]);

  useEffect(() => {
    localStorage.setItem('apiKeys_v3', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('aiAgents_v2', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    if (currentAgentId) {
      localStorage.setItem('currentAgentId_v2', currentAgentId);
    } else {
      localStorage.removeItem('currentAgentId_v2');
    }
  }, [currentAgentId]);
  
  useEffect(() => {
    if (agents.length > 0 && !agents.find(a => a.id === currentAgentId)) {
      setCurrentAgentId(agents[0].id);
    } else if (agents.length === 0 && currentAgentId !== null) {
      setCurrentAgentId(null);
    }
  }, [agents, currentAgentId]);

  const handleSelectAgent = useCallback((agentId: string) => {
    setCurrentAgentId(agentId);
    setUserInput('');
    setOutputArea('');
    setCopyButtonText("Copy to clipboard");
  }, []);

  const handleOpenAgentModal = useCallback((agentToEdit: Agent | null = null) => {
    setEditingAgent(agentToEdit);
    setIsAgentModalOpen(true);
  }, []);

  const handleSaveAgent = useCallback((agentData: Omit<Agent, 'id'> | Agent) => {
    if ('id' in agentData && agentData.id) { 
      setAgents(prev => prev.map(a => a.id === (agentData as Agent).id ? { ...(agentData as Agent) } : a));
    } else { 
      const providerConf = API_PROVIDER_OPTIONS.find(p => p.value === (agentData as Omit<Agent, 'id'>).apiProvider);
      const modelIdIsValid = providerConf?.models.some(m => m.id === (agentData as Omit<Agent, 'id'>).modelId);
      const finalModelId = modelIdIsValid ? (agentData as Omit<Agent, 'id'>).modelId : (providerConf?.defaultModelId || providerConf?.models[0]?.id || '');

      const newAgent: Agent = { 
          id: generateId(), 
          ...DEFAULT_AGENT_PROPERTIES, 
          ...(agentData as Omit<Agent, 'id'>), 
          modelId: finalModelId 
      };
      setAgents(prev => [...prev, newAgent]);
      setCurrentAgentId(newAgent.id);
    }
    setIsAgentModalOpen(false);
    setEditingAgent(null);
  }, []);

  const handleDeleteAgent = useCallback((agentIdToDelete: string) => {
    if (agents.length <= 1 && agents.find(a => a.id === agentIdToDelete)) {
      alert("You cannot delete the last agent. Create another one first or edit this one.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this agent?")) {
      const remainingAgents = agents.filter(a => a.id !== agentIdToDelete);
      setAgents(remainingAgents);
      if (currentAgentId === agentIdToDelete) {
        setCurrentAgentId(remainingAgents.length > 0 ? remainingAgents[0].id : null);
      }
    }
  }, [agents, currentAgentId]);

  const handleCopy = useCallback(() => {
    if (!outputArea) return;
    navigator.clipboard.writeText(outputArea).then(() => {
      setCopyButtonText("Copied!");
      setTimeout(() => setCopyButtonText("Copy to clipboard"), 1500);
    }).catch(err => console.error("Copy failed", err));
  }, [outputArea]);

  const handleSubmit = useCallback(async () => {
    if (!currentAgent) { alert("Please select or create an agent first."); return; }
    
    const agentApiKey = apiKeys[currentAgent.apiProvider];
    const agentProviderConfig = API_PROVIDER_OPTIONS.find(p => p.value === currentAgent.apiProvider);

    if (!agentApiKey) { 
        alert(`Please set the API Key for ${agentProviderConfig?.label || currentAgent.apiProvider} in Global Settings.`); 
        setIsGlobalSettingsOpen(true); 
        return; 
    }
    if (!currentAgent.customInstructions) { alert("The selected agent has no custom instructions. Please edit the agent."); handleOpenAgentModal(currentAgent); return;}
    if (!userInput.trim()) { alert("Please enter some input content."); return; }
    if (!currentAgent.modelId && agentProviderConfig && agentProviderConfig.models.length > 0) {
        alert(`The agent "${currentAgent.name}" does not have a model selected. Please edit the agent and choose a model.`);
        handleOpenAgentModal(currentAgent);
        return;
    }

    setIsLoading(true);
    setOutputArea("Generating...");
    setSubmitBtnText("Optimizing..."); // Update button text during loading
    setCopyButtonText("Copy to clipboard");

    try {
      const generatedText = await generateContent({
        provider: currentAgent.apiProvider,
        apiKey: agentApiKey,
        modelId: currentAgent.modelId,
        userInput: userInput,
        customInstructions: currentAgent.customInstructions,
        outputFormat: currentAgent.outputFormat,
      });
      setOutputArea(generatedText);
    } catch (error: any) {
      console.error(`Error generating content with ${currentAgent.apiProvider} / ${currentAgent.modelId}:`, error);
      setOutputArea(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setSubmitBtnText("Optimize Prompt"); // Reset button text
    }
  }, [apiKeys, currentAgent, userInput, handleOpenAgentModal]);
  
  const commonInputClass = "w-full p-2.5 bg-slate-900/70 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-500 text-sm custom-scrollbar";


  return (
    <div className="flex h-screen w-screen text-slate-100">
      <AgentSidebar
        agents={agents}
        currentAgentId={currentAgentId}
        onSelectAgent={handleSelectAgent}
        onOpenAgentModal={handleOpenAgentModal}
        onDeleteAgent={handleDeleteAgent}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />
      
      <main className="flex-1 p-8 md:p-12 flex flex-col bg-gradient-to-br from-slate-900 to-indigo-950 overflow-y-auto custom-scrollbar">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-sky-400 to-indigo-400 mb-2">
            {mainTitle}
          </h1>
          {currentAgent && (
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
              {agentDescriptionUI}
            </p>
          )}
           {(!currentAgent && agents.length > 0) && (
            <p className="text-lg text-slate-400">Please select an agent from the sidebar.</p>
          )}
        </header>
        
        {currentAgent ? (
          <>
            <div className="flex-1 min-h-[250px] md:min-h-[280px] flex justify-center">
              {/* Single Container for both input and output */}
              <div className="bg-black px-4 py-4 rounded-xl border border-zinc-700 shadow-md w-[83%]"> 
                <div className="grid grid-cols-2 gap-6">
                  {/* Input Column */}
                  <div className="flex flex-col">
                    <label htmlFor="userInput" className="text-sm font-semibold text-zinc-200 mb-2">Prompt to optimize</label>
                    <textarea 
                      id="userInput" 
                      value={userInput} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
                      className="bg-white p-3 rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none custom-scrollbar-light text-sm overflow-y-auto mb-4" 
                      placeholder={userPlaceholder}
                      rows={8} 
                      aria-label="Prompt to optimize"
                    />
                    
                    <button 
                      onClick={handleSubmit} 
                      disabled={isLoading || !currentAgent}
                      className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <div className="loader mx-auto"></div> : submitBtnText}
                    </button>
                  </div>

                  {/* Output Column */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <label id="outputAreaLabel" htmlFor="outputAreaDisplay" className="text-sm font-semibold text-zinc-300">Optimized prompt</label>
                      <button 
                        onClick={handleCopy} 
                        title={copyButtonText}
                        aria-label="Copy output to clipboard" 
                        className="flex items-center space-x-1.5 text-zinc-400 hover:text-zinc-200 transition-colors text-sm p-1.5 rounded-md hover:bg-zinc-800"
                      >
                        <span className="material-icons-outlined text-base leading-none">content_copy</span> 
                        <span className="text-xs">{copyButtonText}</span>
                      </button>
                    </div>
                    <div
                      id="outputAreaContainer"
                      aria-labelledby="outputAreaLabel"
                      className="flex-1 rounded-md custom-scrollbar overflow-y-auto border border-zinc-700 h-[600px]"
                      style={{ height: '400px', minHeight: '400px' }}
                    >
                      <div
                        id="outputAreaDisplay"
                        className="p-3 text-zinc-300 whitespace-pre-wrap text-sm bg-gray-700 min-h-full"
                        style={{ height: '100%' }}
                        aria-live="polite"
                      >
                        {(outputArea && outputArea.trim()) ? outputArea.trim() : "The optimized prompt will be generated here..."}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  Prompt Optimizer version 2.1.1 - Last updated: 24th May 2024
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <span className="material-icons-outlined text-6xl text-teal-500 mb-6 opacity-70">hub</span>
            <h3 className="text-3xl font-semibold text-slate-200 mb-3">
              {agents.length > 0 ? "No Agent Selected" : "Welcome!"}
            </h3>
            <p className="text-slate-400 mb-8 max-w-md">
              {agents.length > 0 
                ? "Please select an agent from the sidebar on the left to get started." 
                : "No agents found. Let's create your first AI agent to begin."}
            </p>
            {agents.length === 0 && (
              <button 
                onClick={() => handleOpenAgentModal(null)}
                className="px-8 py-3 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-teal-500/30 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900 text-base">
                Create First Agent
              </button>
            )}
          </div>
        )}
      </main>

      {isGlobalSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[70]" role="dialog" aria-modal="true" aria-labelledby="global-settings-title">
          <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 id="global-settings-title" className="text-xl font-semibold text-teal-400">Global Settings</h2>
              <button onClick={() => setIsGlobalSettingsOpen(false)} aria-label="Close settings modal" className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-slate-700/50">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-3 space-y-5">
              <SettingField label="Default API Provider (for this screen)" id="apiProviderGlobal">
                <select 
                  value={selectedApiProvider} 
                  onChange={(e) => setSelectedApiProvider(e.target.value as ApiProviderType)}
                  className={commonInputClass}
                >
                  {API_PROVIDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </SettingField>

              <SettingField 
                label={currentGlobalProviderConfig.apiKeyName} 
                id="activeApiKeyGlobal" 
                required 
                description={
                  currentGlobalProviderConfig.apiKeyLink ? 
                  <>Need an API key for {currentGlobalProviderConfig.label}? <a href={currentGlobalProviderConfig.apiKeyLink} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">Get one here.</a> Your key is stored locally.</>
                  : "Your API key is stored locally in your browser."
                }
              >
                <textarea 
                  value={activeGlobalApiKey} 
                  onChange={(e) => setActiveGlobalApiKey(e.target.value)} 
                  rows={3} 
                  placeholder={currentGlobalProviderConfig.apiKeyPlaceholder}
                  className={`${commonInputClass} min-h-[70px] resize-y text-xs`}
                />
              </SettingField>
              {currentGlobalProviderConfig.defaultModelId && currentGlobalProviderConfig.models.length > 0 && (
                 <div className="text-xs text-center text-slate-400 bg-slate-900/50 p-3 rounded-md mt-2 border border-slate-700">
                    Default model for new agents using {currentGlobalProviderConfig.label}: <br/><span className="font-medium text-slate-300">{currentGlobalProviderConfig.models.find(m=>m.id === currentGlobalProviderConfig.defaultModelId)?.name || currentGlobalProviderConfig.defaultModelId}</span>.
                    <br/>
                    <span className="text-slate-500">(Models are configured per agent during creation/editing.)</span>
                </div>
              )}
            </div>
            <div className="mt-8 flex-shrink-0 pt-5 border-t border-slate-700">
              <button onClick={() => setIsGlobalSettingsOpen(false)}
                className="w-full px-6 py-3 text-sm bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AgentModal 
        isOpen={isAgentModalOpen} 
        onClose={() => setIsAgentModalOpen(false)} 
        onSave={handleSaveAgent}
        agent={editingAgent}
      />
    </div>
  );
}

export default App;
