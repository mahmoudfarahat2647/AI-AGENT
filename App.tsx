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
      
      // Enhanced error display with proper spacing and list formatting
      let userError = error.message;
      if (error.message.includes('\n')) {
        // Add subtle divider between sections if needed
        userError = userError.replace(/\n\n/g, '\n\n---\n\n');
        // Enhance bullet points if they exist
        userError = userError.replace(/^\s*•\s*/gm, '→ ');
        userError = userError.replace(/^\s*-\s*/gm, '→ ');
      }

      // Add error prefix if not already an "Error:"
      const errorPrefix = !userError.toLowerCase().startsWith('error:') ? 'Error:\n\n' : '';
      setOutputArea(`${errorPrefix}${userError}`);
    } finally {
      setIsLoading(false);
      setSubmitBtnText("Optimize Prompt"); // Reset button text
    }
  }, [apiKeys, currentAgent, userInput, handleOpenAgentModal]);
  
  const commonInputClass = "w-full p-2.5 bg-slate-900/70 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-500 text-sm custom-scrollbar";


  return (
    <div className="flex h-screen w-screen text-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <AgentSidebar
        agents={agents}
        currentAgentId={currentAgentId}
        onSelectAgent={handleSelectAgent}
        onOpenAgentModal={handleOpenAgentModal}
        onDeleteAgent={handleDeleteAgent}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />
      
      <main className="flex-1 p-8 md:p-12 flex flex-col backdrop-blur-sm bg-slate-900/20 overflow-y-auto custom-scrollbar">
        <header className="mb-8 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 blur-3xl -z-10"></div>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-200 via-sky-300 to-indigo-300 tracking-tight mb-2">
            {mainTitle}
          </h1>
          {currentAgent && (
            <p className="text-xs font-light text-slate-300/80 max-w-xl mx-auto mt-2">
              {agentDescriptionUI}
            </p>
          )}
           {(!currentAgent && agents.length > 0) && (
            <p className="text-sm font-light text-slate-300/90">Please select an agent from the sidebar.</p>
          )}
        </header>
        
        {currentAgent ? (
          <>
            <div className="flex-1 flex justify-center items-start min-h-[500px]">
              {/* Single Container for both input and output */}
              <div className="bg-gradient-to-b from-slate-800/90 to-slate-800/70 px-7 py-6 rounded-2xl border border-slate-700/50 shadow-2xl w-[75%] max-w-[2000px] h-full max-h-[1000px] backdrop-blur-md relative overflow-hidden"> 
                <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 via-transparent to-indigo-500/5"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full relative">
                  {/* Input Column */}
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3">
                      <label htmlFor="userInput" className="text-sm font-medium text-slate-200 flex items-center">
                        <span className="material-icons-outlined text-teal-300 mr-2 text-base">edit_note</span>
                        Prompt to optimize
                      </label>
                      <button
                        onClick={() => setUserInput('')}
                        title="Clear Prompt"
                        aria-label="Clear prompt input"
                        className="flex items-center space-x-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-700/50"
                      >
                        <span className="material-icons-outlined text-base leading-none">refresh</span>
                        <span className="text-xs font-light">Reset</span>
                      </button>
                    </div>
                    <div className="relative w-full mb-4"> {/* Added relative container */}
                      <textarea
                        id="userInput"
                        value={userInput}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
                        className="bg-white/90 p-4 rounded-xl border border-slate-200/20 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/30 outline-none resize-none custom-scrollbar-light text-sm overflow-y-auto shadow-lg transition-all duration-200 hover:bg-white/95 w-full"
                        placeholder={userPlaceholder}
                        style={{ height: '180px' }}
                        aria-label="Prompt to optimize"
                      />
                    </div>
                    
                    <button
                      onClick={handleSubmit} 
                      disabled={isLoading || !currentAgent}
                      className="w-full px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-lg transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-red-500/10 hover:translate-y-[-1px]"
                    >
                      {isLoading ? <div className="loader mx-auto"></div> : submitBtnText}
                    </button>
                  </div>

                  {/* Output Column */}
                  <div className="flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3">
                      <label id="outputAreaLabel" htmlFor="outputAreaDisplay" className="text-sm font-medium text-slate-200 flex items-center">
                        Optimized prompt
                        {currentAgent && (
                          <span className="ml-2 px-2 py-0.5 bg-slate-700 text-teal-300 text-xs font-mono rounded-full">
                            {currentAgent.outputFormat.toUpperCase()}
                          </span>
                        )}
                      </label>
                      <button
                        onClick={handleCopy}
                        title={copyButtonText}
                        aria-label="Copy output to clipboard"
                        className="flex items-center space-x-1.5 text-slate-400 hover:text-teal-300 transition-colors text-sm px-2 py-1 rounded-lg hover:bg-slate-700/50"
                      >
                        <span className="material-icons-outlined text-base leading-none">content_copy</span>
                        <span className="text-xs font-light">{copyButtonText}</span>
                      </button>
                    </div>                      <div
                        id="outputAreaContainer"
                        aria-labelledby="outputAreaLabel"
                        className="flex-1 rounded-xl custom-scrollbar border border-slate-600/30 relative bg-slate-700/50 shadow-inner backdrop-blur-md"
                        style={{ minHeight: '300px' }}
                    >
                      <div
                        id="outputAreaDisplay"
                        className="p-4 text-slate-200 whitespace-pre-wrap text-sm absolute inset-0 overflow-auto font-light"
                        aria-live="polite"
                      >
                        {(outputArea && outputArea.trim()) ? outputArea.trim() : "The optimized prompt will be generated here..."}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4 text-center">
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
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Active Provider Settings</h3>
                <SettingField label="Default API Provider" id="apiProviderGlobal">
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
                    rows={2} 
                    placeholder={currentGlobalProviderConfig.apiKeyPlaceholder}
                    className={`${commonInputClass} min-h-[60px] resize-y text-xs`}
                  />
                </SettingField>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3">All Saved API Keys</h3>
                <div className="space-y-4">
                  {API_PROVIDER_OPTIONS.filter(provider => provider.value !== selectedApiProvider).map(provider => (
                    <SettingField 
                      key={provider.value}
                      label={provider.apiKeyName}
                      id={`apiKey_${provider.value}`}
                    >
                      <div className="relative">
                        <textarea 
                          value={apiKeys[provider.value] || ''}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.value]: e.target.value }))}
                          rows={2}
                          placeholder={provider.apiKeyPlaceholder}
                          className={`${commonInputClass} min-h-[60px] resize-y text-xs pr-20`}
                        />
                        {provider.apiKeyLink && (
                          <a 
                            href={provider.apiKeyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-2 top-2 text-xs text-teal-400 hover:text-teal-300 hover:underline"
                          >
                            Get Key
                          </a>
                        )}
                      </div>
                    </SettingField>
                  ))}
                </div>
              </div>

              {currentGlobalProviderConfig.defaultModelId && currentGlobalProviderConfig.models.length > 0 && (
                 <div className="text-xs text-center text-slate-400 bg-slate-900/50 p-3 rounded-md mt-2 border border-slate-700">
                    Default model for new agents using {currentGlobalProviderConfig.label}: <br/>
                    <span className="font-medium text-slate-300">
                      {currentGlobalProviderConfig.models.find(m=>m.id === currentGlobalProviderConfig.defaultModelId)?.name || currentGlobalProviderConfig.defaultModelId}
                    </span>
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
