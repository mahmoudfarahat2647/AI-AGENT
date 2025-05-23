import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { OutputFormat, ApiProviderType } from '../types';
import { OUTPUT_FORMAT_STRUCTURES } from '../constants';

interface GenerateContentParams {
  provider: ApiProviderType;
  apiKey: string;
  modelId: string;
  userInput: string;
  customInstructions: string;
  outputFormat: OutputFormat;
}

export async function generateContent({
  provider,
  apiKey,
  modelId,
  userInput,
  customInstructions,
  outputFormat,
}: GenerateContentParams): Promise<string> {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide it in settings.");
  }

  const systemInstructionWithFormat = `${customInstructions}\n\n### OUTPUT FORMAT INSTRUCTIONS & STRUCTURE TO POPULATE:\nYou MUST generate your entire response strictly following this structure and its rules. Use the user's input to fill in the content for the placeholders or sections described.\n${OUTPUT_FORMAT_STRUCTURES[outputFormat] || OUTPUT_FORMAT_STRUCTURES['detailed_text']}`;

  let generatedText: string | undefined;

  try {
    if (provider === 'google') {
      const ai = new GoogleGenAI({ apiKey });
      const googleApiConfig: any = {
        temperature: 0.3,
        // maxOutputTokens: 2048 // Example, can be added if needed
      };
      // Add thinkingConfig only for the specified flash model
      if (modelId === 'gemini-2.5-flash-preview-04-17') {
        googleApiConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      if (outputFormat === 'json') {
        googleApiConfig.responseMimeType = "application/json";
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: userInput }] }],
        config: { // systemInstruction is part of the config object
          systemInstruction: systemInstructionWithFormat,
          ...googleApiConfig
        }
      });
      generatedText = response.text;

    } else if (provider === 'openrouter') {
      const openRouterRequestBody: any = {
        model: modelId,
        messages: [
          { role: "system", content: systemInstructionWithFormat },
          { role: "user", content: userInput }
        ],
        temperature: 0.3,
        // max_tokens: 2048 // Example OpenRouter parameter for max tokens
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'AI Prompt Agent', // Optional: Helps OpenRouter identify your app
        },
        body: JSON.stringify(openRouterRequestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `OpenRouter API Error: ${response.status} ${response.statusText}` } }));
        throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      generatedText = data.choices?.[0]?.message?.content;
    } else {
      // Placeholder for other providers or throw error for unsupported
      // For 'openai', 'anthropic', 'custom' if not routed via OpenRouter, actual implementation would be needed here.
      throw new Error(`API Provider "${provider}" is not directly supported for generation in this version (unless routed via OpenRouter).`);
    }

    if (generatedText === undefined || generatedText === null) {
      console.warn("API response text was undefined or null for provider:", provider);
      throw new Error("No content generated or API returned an empty response.");
    }
    
    // Process JSON if applicable 
    // (especially for OpenRouter, or Google if responseMimeType wasn't set or if model didn't strictly adhere)
    if (outputFormat === 'json') {
      // For Google with responseMimeType: "application/json", response.text should be clean JSON.
      // For OpenRouter, or if Google's output includes markdown fences despite mime type:
      let jsonStr = generatedText.trim();
      const fenceRegex = /^```(\w*json)?\s*\n?(.*?)\n?\s*```$/s; // More flexible regex for ```json ... ```
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) { // If markdown fence is found and has content
        jsonStr = match[2].trim(); // Extract content within fences
      }
      
      try {
        const jsonObj = JSON.parse(jsonStr);
        generatedText = JSON.stringify(jsonObj, null, 2); // Beautify
      } catch (e) {
        // If parsing fails, it means the content (either raw or extracted) is not valid JSON.
        console.warn("AI output was expected to be JSON but could not be parsed/beautified. Using raw output.", e, "Attempted to parse:", jsonStr);
        // Keep the 'generatedText' as is (it might be the raw output, or the stripped version if fences were present but content wasn't JSON)
      }
    }
    return generatedText;

  } catch (error: any) {
    console.error(`Error calling ${provider} API with model ${modelId}:`, error);
    const message = error.message || `An unknown error occurred with the ${provider} API.`;
    throw new Error(message);
  }
}
