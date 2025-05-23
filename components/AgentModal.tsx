import React, { useState, useEffect, FormEvent } from 'react';
import { Agent, OutputFormat, ApiProviderType, ModelDefinition } from '../types';
import { DEFAULT_AGENT_PROPERTIES, OUTPUT_FORMAT_OPTIONS, API_PROVIDER_OPTIONS } from '../constants';
import { SettingField } from './SettingField';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentData: Omit<Agent, 'id'> | Agent) => void;
  agent: Agent | null;
}

export const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, onSave, agent }) => {
  const getInitialFormData = (): Agent | Omit<Agent, 'id'> => {
    if (agent) return { ...agent };
    
    const initialProviderValue = DEFAULT_AGENT_PROPERTIES.apiProvider;
    const providerConfig = API_PROVIDER_OPTIONS.find(p => p.value === initialProviderValue) || API_PROVIDER_OPTIONS.find(p => p.models.length > 0) || API_PROVIDER_OPTIONS[0];
    
    const initialModelId = providerConfig?.models.find(m => m.id === DEFAULT_AGENT_PROPERTIES.modelId && m.provider === initialProviderValue)?.id 
                         || providerConfig?.defaultModelId 
                         || providerConfig?.models[0]?.id 
                         || '';

    return { 
        ...DEFAULT_AGENT_PROPERTIES, 
        name: agent?.name || DEFAULT_AGENT_PROPERTIES.name, // Use default if creating new
        description: agent?.description || DEFAULT_AGENT_PROPERTIES.description,
        apiProvider: providerConfig.value,
        modelId: initialModelId
    };
  };

  const [formData, setFormData] = useState<Agent | Omit<Agent, 'id'>>(getInitialFormData());
  const [availableModels, setAvailableModels] = useState<ModelDefinition[]>([]);

  useEffect(() => {
    if (isOpen) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
      const providerConfig = API_PROVIDER_OPTIONS.find(p => p.value === newFormData.apiProvider);
      setAvailableModels(providerConfig?.models || []);
    }
  }, [agent, isOpen]);

  useEffect(() => {
    const providerConfig = API_PROVIDER_OPTIONS.find(p => p.value === formData.apiProvider);
    const currentModels = providerConfig?.models || [];
    setAvailableModels(currentModels);

    if (!currentModels.find(m => m.id === formData.modelId)) {
      setFormData(prev => ({
        ...prev,
        modelId: providerConfig?.defaultModelId || currentModels[0]?.id || ''
      }));
    }
  }, [formData.apiProvider]);


  if (!isOpen) return null;

  const handleChange = (key: keyof (Omit<Agent, 'id'> | Agent), value: string | OutputFormat | ApiProviderType) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Agent Name is required.");
      return;
    }
    if (!formData.customInstructions.trim()) {
      alert("Custom Instructions are required.");
      return;
    }
    if (!formData.apiProvider) {
        alert("API Provider selection is required.");
        return;
    }
    if (!formData.modelId && availableModels.length > 0) {
        alert("Model selection is required.");
        return;
    }
    onSave(formData);
  };

  const commonInputClass = "w-full p-2.5 bg-slate-900/70 border border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-500 text-sm custom-scrollbar";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title">
      <div className="bg-slate-800/80 backdrop-blur-lg border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 id="agent-modal-title" className="text-xl font-semibold text-teal-400">
            {agent && 'id' in agent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-slate-700/50">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmitForm} className="flex-grow overflow-y-auto custom-scrollbar pr-3 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <SettingField label="Agent Name" id="agentNameModal" required>
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Frontend Expert" maxLength={70} className={commonInputClass} />
            </SettingField>
            <SettingField label="Output Format" id="outputFormatModal">
              <select value={formData.outputFormat} onChange={(e) => handleChange('outputFormat', e.target.value as OutputFormat)} className={commonInputClass}>
                {OUTPUT_FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </SettingField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <SettingField label="API Provider" id="apiProviderModal" required>
                <select 
                    value={formData.apiProvider} 
                    onChange={(e) => handleChange('apiProvider', e.target.value as ApiProviderType)} 
                    className={commonInputClass}
                >
                    {API_PROVIDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </SettingField>
            <SettingField label="Model" id="modelIdModal" required={availableModels.length > 0}>
                <select 
                    value={formData.modelId} 
                    onChange={(e) => handleChange('modelId', e.target.value)}
                    className={commonInputClass}
                    disabled={availableModels.length === 0}
                    aria-describedby={availableModels.length === 0 ? "model-disabled-description" : undefined}
                >
                    {availableModels.length === 0 && <option id="model-disabled-description" value="">{formData.apiProvider ? `No models listed for ${formData.apiProvider}` : "Select provider first"}</option>}
                    {availableModels.map(model => (
                        <option key={model.id} value={model.id} title={model.id}>{model.name}</option>
                    ))}
                </select>
            </SettingField>
          </div>
          <SettingField label="Agent Description" id="agentDescriptionModal">
            <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} placeholder="e.g., Helps with crafting frontend code snippets and advice." maxLength={200} className={`${commonInputClass} min-h-[60px] resize-y`}></textarea>
          </SettingField>
          <SettingField label="Input Box Placeholder Text" id="inputPlaceholderModal">
            <textarea value={formData.inputPlaceholderSetting} onChange={(e) => handleChange('inputPlaceholderSetting', e.target.value)} rows={2} placeholder="e.g., Ask about a React component..." maxLength={150} className={`${commonInputClass} min-h-[30px] resize-y`}></textarea>
          </SettingField>
          <SettingField label="Custom Instructions / System Prompt" id="customInstructionsModal" required>
            <textarea value={formData.customInstructions} onChange={(e) => handleChange('customInstructions', e.target.value)} rows={7} placeholder="You are a helpful AI assistant specialized in..." className={`${commonInputClass} min-h-[120px] resize-y`}></textarea>
          </SettingField>
          
          <div className="mt-8 flex-shrink-0 pt-5 border-t border-slate-700">
            <button type="submit"
              className="w-full px-6 py-3 text-sm bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800">
              {agent && 'id' in agent ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};