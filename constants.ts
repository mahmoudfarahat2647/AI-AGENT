import { Agent, OutputFormat, OutputFormatStructures, ApiProviderOption, ApiProviderType, ModelDefinition } from './types';

export const DEFAULT_AGENT_PROPERTIES: Omit<Agent, 'id'> = {
    name: 'Frontend Design & Harmony Expert',
    description: 'Helps craft beautiful, functional UIs with expert advice on code, design patterns, and color psychology.',
    inputPlaceholderSetting: "How can I improve the UX of my e-commerce checkout page? or e.g. Provide a React component for a re...",
    outputFormat: 'rewrite_perfectly' as OutputFormat, // Changed to match example button
    customInstructions: `You are an AI Frontend Design & Harmony Expert. Your primary task is to take the user's input (a design question, code snippet, UI problem, or a request for UI elements) and generate a well-structured, insightful, and actionable output.
The structure of your output is CRITICALLY defined by the "OUTPUT FORMAT INSTRUCTIONS" that will be provided to you. You MUST adhere strictly to the specified format.
Your goal is to provide expert-level advice, code, or structured content related to frontend development, UI/UX design, design patterns, and even color psychology, all within the chosen output format.
If the user's input is a request for you to perform an action (e.g., "critique this landing page design"), then perform that action and present the result within the chosen output format.
If the user's input is raw content or a problem statement, then analyze it and provide solutions/insights structured according to the chosen output format.

Key Principles:
1.  **Adhere to Format:** The selected "Output Format" and its example structure are paramount.
2.  **Expert Insights:** Provide valuable, actionable, and well-reasoned frontend and design advice.
3.  **Clarity & Conciseness:** Within the given structure, aim for clear and concise content.

Your output MUST ONLY be the structured content in the specified format. Do not include any preambles, apologies, or meta-commentary outside of what the format itself might define.
`,
    apiProvider: 'google',
    modelId: 'gemini-2.5-flash-preview-04-17',
};

export const OUTPUT_FORMAT_STRUCTURES: OutputFormatStructures = {
    rewrite_perfectly: `
Your entire output MUST be a single, refined piece of text, directly transformed from the user's input.
The goal is to improve the user's original text by making it:
*   Clearer, more articulate, and precise.
*   More impactful, persuasive, or engaging.
*   Stylistically superior and grammatically flawless.
*   If the user's input is very brief and implies a common goal (e.g., "modern minimalist design"), elaborate slightly to make it a more complete instruction or statement.
*   Preserve the core intent of the user's input.

CRITICAL: Your output MUST consist ONLY of the rewritten text. NO preambles, NO postambles, NO explanations.
Example of transformation expected:
User Input: "make website better for users"
Your Output: "Enhance the website's user experience by improving navigation intuitiveness, optimizing page load speeds, and ensuring content clarity and accessibility."`,

    claude_style: `
Your entire output MUST be formatted in the "Claude AI Style" (Hierarchical Sectioned List):
1. Your output should be structured into logical sections based on the content you need to generate from the user's input.
2. Optionally, you can begin with an ALL-CAPS main title for the entire output on its own line.
3. Each distinct section MUST start with a section heading on its own line: '# Section Title'.
4. Under each section heading, list specific details or items: ' - Detail/Item content'.
5. Do NOT include any text that is not part of the main title (if used), section headings, or hyphenated items.

Example Structure to Populate:
OVERALL DOCUMENT TITLE (e.g., PROJECT PLAN, CONTENT OUTLINE)
# Section 1: [Infer or generate title based on user input]
 - [Detail 1 related to user input and Section 1]
 - [Detail 2 related to user input and Section 1]
# Section 2: [Infer or generate title based on user input]
 - [Item A related to user input and Section 2]
 - [Item B related to user input and Section 2]
... (add more sections and items as needed to represent the user's input) ...`,

    json: `
Your entire output MUST be a single, valid JSON object and nothing else. No markdown.
Populate the following JSON structure with content derived from the user's input. Adapt keys and values as logically necessary.

Example Structure to Populate:
{
  "title": "[A concise title reflecting the user's input/request]",
  "summary": "[A brief summary of the user's core input or the generated content]",
  "details": {
    "main_points": [
      "[First main point derived from user input]",
      "[Second main point derived from user input]"
    ],
    "additional_info": {
      "key_1": "[Value 1 relevant to user input]",
      "key_2": "[Value 2 relevant to user input]"
    }
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "format_requested": "JSON"
  }
}
// If the user's input is a list of items, you might use an array for "details".
// If it's a request to summarize, "summary" would be the main output.
// Be flexible but stick to valid JSON.`,

    pseudo_dsl: `
Your entire output MUST be formatted in a "Pseudo Domain Specific Language (DSL)" style.
Use specific uppercase keywords followed by values or blocks of text. Populate the structure based on the user's input.

Example Structure to Populate (adapt keywords if needed):
TITLE: [Title derived from user input]
OBJECTIVE: [Objective or goal based on user input]
INPUT_SUMMARY: [Briefly summarize the user's raw input here]

SECTION: [Section 1 Title - e.g., KEY_ELEMENTS]
  - ITEM: [First item/detail for this section, from user input]
  - ITEM: [Second item/detail for this section, from user input]

SECTION: [Section 2 Title - e.g., CONSIDERATIONS]
  - NOTE: [A note or consideration based on user input]

CONCLUSION: [Concluding statement or summary, derived from user input]
Do NOT include any other text, explanation, or preamble.`,

    detailed_text: `
Your entire output MUST be a well-structured, detailed block of text directly addressing or elaborating on the user's input.
Use clear paragraphs. You can use markdown for headings (##, ###), bold (**text**), italics (*text*), and bullet points (* or -) if it enhances readability and structure.
The goal is a comprehensive, ready-to-use text.
Do NOT include any conversational filler, explanations of your process, or meta-commentary unless it's part of a direct answer to a question.

Example of how to structure content (adapt based on user input):
## [Main Title/Topic Derived from User Input]

[Opening paragraph elaborating on the core idea from the user input.]

### [Sub-heading 1 - e.g., Key Aspects]
*   [First key aspect related to user input, elaborated.]
*   [Second key aspect related to user input, elaborated.]

### [Sub-heading 2 - e.g., Further Details or Implications]
[Paragraph discussing further details or implications based on the user input.]

[Concluding paragraph or summary.]`
};

export const OUTPUT_FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
    { value: 'rewrite_perfectly', label: 'Rewrite Perfectly' },
    { value: 'detailed_text', label: 'Detailed Text' },
    { value: 'claude_style', label: 'Claude AI Style' },
    { value: 'json', label: 'JSON' },
    { value: 'pseudo_dsl', label: 'Pseudo DSL' },
];

export const API_PROVIDER_OPTIONS: Readonly<ApiProviderOption[]> = [
  {
    value: 'google',
    label: 'Google AI (Gemini)',
    apiKeyName: 'Google AI API Key',
    apiKeyPlaceholder: 'Enter your AIzaSy... API key',
    apiKeyLink: 'https://aistudio.google.com/app/apikey',
    defaultModelId: 'gemini-2.5-flash-preview-04-17',
    models: [
        { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview (04-17)' },
        { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview (05-06)' },
    ],
  },
  {
    value: 'openrouter',
    label: 'OpenRouter (Multi-Provider)',
    apiKeyName: 'OpenRouter API Key',
    apiKeyPlaceholder: 'Enter your sk-or-... API key',
    apiKeyLink: 'https://openrouter.ai/keys',
    defaultModelId: 'mistralai/mistral-7b-instruct:free',
    models: [
        // Free Models
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' },
        { id: 'nousresearch/nous-capybara-7b:free', name: 'Nous Capybara 7B (Free)' },
        { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B Beta (Free)' },
        { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)' },
        { id: 'google/gemma-7b-it:free', name: 'Google Gemma 7B (Free)'},
        // Paid Models (Examples)
        { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
        { id: 'openai/gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
        { id: 'anthropic/claude-3-haiku', name: 'Anthropic Claude 3 Haiku' },
        { id: 'google/gemini-1.5-pro-latest', name: 'Google Gemini 1.5 Pro' }, 
        { id: 'google/gemini-1.5-flash-latest', name: 'Google Gemini 1.5 Flash' },
        { id: 'mistralai/mistral-large-latest', name: 'Mistral Large' },
        { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct' },
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT) - Placeholder',
    apiKeyName: 'OpenAI API Key',
    apiKeyPlaceholder: 'Enter your sk-... API key',
    apiKeyLink: 'https://platform.openai.com/api-keys',
    defaultModelId: 'gpt-4o',
    models: [
        { id: 'gpt-4o', name: 'GPT-4o (Example)' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Example)'}
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic (Claude) - Placeholder',
    apiKeyName: 'Anthropic API Key',
    apiKeyPlaceholder: 'Enter your sk-ant-... API key',
    apiKeyLink: 'https://console.anthropic.com/settings/keys',
    defaultModelId: 'claude-3-opus-20240229',
    models: [
        { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Example)' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Example)' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Example)' },
    ],
  },
  {
    value: 'custom',
    label: 'Custom Provider - Placeholder',
    apiKeyName: 'Custom API Key',
    apiKeyPlaceholder: 'Enter your API key',
    defaultModelId: 'custom-model',
    models: [
        { id: 'custom-model', name: 'Custom Model (Example)' }
    ],
  },
];