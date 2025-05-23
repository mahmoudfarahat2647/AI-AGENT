export type OutputFormat =
  | 'rewrite_perfectly'
  | 'claude_style'
  | 'json'
  | 'pseudo_dsl'
  | 'detailed_text';

export interface ModelDefinition {
  id: string; // API specific model ID
  name: string; // User-friendly name
  provider?: ApiProviderType; // Optional, can be inferred from context
}
export interface Agent {
  id: string;
  name: string;
  description: string;
  inputPlaceholderSetting: string;
  outputFormat: OutputFormat;
  customInstructions: string;
  apiProvider: ApiProviderType;
  modelId: string;
}

export interface OutputFormatStructures {
  rewrite_perfectly: string;
  claude_style: string;
  json: string;
  pseudo_dsl: string;
  detailed_text: string;
  [key: string]: string;
}

export type ApiProviderType = 'google' | 'openai' | 'anthropic' | 'custom' | 'openrouter';

export interface ApiProviderOption {
  value: ApiProviderType;
  label: string;
  apiKeyName: string;
  apiKeyPlaceholder: string;
  apiKeyLink?: string;
  defaultModelId?: string; // For display in settings or as default for new agents
  models: ModelDefinition[];
}
