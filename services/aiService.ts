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
      };
      
      if (modelId === 'gemini-2.5-flash-preview-04-17') {
        googleApiConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      if (outputFormat === 'json') {
        googleApiConfig.responseMimeType = "application/json";
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: userInput }] }],
        config: {
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
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'AI Prompt Agent',
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
      throw new Error(`API Provider "${provider}" is not directly supported for generation in this version (unless routed via OpenRouter).`);
    }

    if (generatedText === undefined || generatedText === null) {
      console.warn("API response text was undefined or null for provider:", provider);
      throw new Error("No content generated or API returned an empty response.");
    }
    
    if (outputFormat === 'json') {
      let jsonStr = generatedText.trim();
      const fenceRegex = /^```(\w*json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      try {
        const jsonObj = JSON.parse(jsonStr);
        generatedText = JSON.stringify(jsonObj, null, 2);
      } catch (e) {
        console.warn("AI output was expected to be JSON but could not be parsed/beautified. Using raw output.", e, "Attempted to parse:", jsonStr);
      }
    }
    return generatedText;

  } catch (error: any) {
    console.error(`Error calling ${provider} API with model ${modelId}:`, error);
    let message = error.message || `An unknown error occurred with the ${provider} API.`;
    
    // Enhanced error handling with specific messages and suggestions
    if (provider === 'google') {
      if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429')) {
        message = `Resource limit reached for ${modelId}. This may be due to:\n\n` +
                 "1. API rate limit exceeded\n" +
                 "2. Quota exhaustion\n" +
                 "3. Limited model availability\n\n" +
                 "Suggestions:\n" +
                 "- Wait a few minutes and try again\n" +
                 "- Switch to an alternative model:\n" +
                 "  • 'gemini-2.5-pro-preview-05-06' for best quality\n" +
                 "  • 'gemini-1.5-pro-latest' for better availability\n" +
                 "- Check your quota in Google AI Studio\n" +
                 "- Consider using OpenRouter as a fallback provider";
      } else if (error.message?.includes('INVALID_ARGUMENT')) {
        message = "Invalid input or configuration. Please check:\n\n" +
                 "1. Input length is within model limits\n" +
                 "2. Content does not violate usage policies\n" +
                 "3. API key is correctly formatted";
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        message = "Permission denied. Please verify:\n\n" +
                 "1. Your API key is valid\n" +
                 "2. You have access to the selected model\n" +
                 "3. Your billing is properly set up";
      }
    } else if (provider === 'openrouter') {
      if (error.message?.includes('429')) {
        message = "OpenRouter rate limit exceeded. Consider:\n\n" +
                 "1. Waiting a few minutes\n" +
                 "2. Switching to a different model\n" +
                 "3. Upgrading your OpenRouter tier";
      } else if (error.message?.includes('402')) {
        message = "OpenRouter credits depleted. Please:\n\n" +
                 "1. Check your balance\n" +
                 "2. Add more credits\n" +
                 "3. Switch to a free model";
      }
    }
    
    throw new Error(message);
  }
}
