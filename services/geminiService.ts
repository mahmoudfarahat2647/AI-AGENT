
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { OutputFormat } from '../types';
import { OUTPUT_FORMAT_STRUCTURES } from '../constants';

export async function generateStructuredContent(
  apiKey: string,
  userInput: string,
  customInstructions: string,
  outputFormat: OutputFormat
): Promise<string> {
  if (!apiKey) {
    // This case should ideally be caught by the UI before calling the service
    throw new Error("API Key is missing. Please provide it in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-2.5-flash-preview-04-17';

  let systemInstructionWithFormat = customInstructions;
  const formatInstructions = OUTPUT_FORMAT_STRUCTURES[outputFormat] || OUTPUT_FORMAT_STRUCTURES['detailed_text'];
  systemInstructionWithFormat += `\n\n### OUTPUT FORMAT INSTRUCTIONS & STRUCTURE TO POPULATE:
You MUST generate your entire response strictly following this structure and its rules. Use the user's input to fill in the content for the placeholders or sections described.
${formatInstructions}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: userInput }] }],
      config: {
        systemInstruction: systemInstructionWithFormat,
        temperature: 0.3, // As per original generationConfig
        // maxOutputTokens could be added here if needed, inside a generationConfig object or directly if API supports
        // generationConfig: { maxOutputTokens: 2048 } 
        ...(outputFormat === 'json' && { responseMimeType: "application/json" })
      }
    });

    let generatedText = response.text;

    if (generatedText === undefined || generatedText === null) {
      console.warn("API response.text was undefined or null.");
      throw new Error("No content generated or API returned an empty response.");
    }
    
    // Process JSON if applicable
    if (outputFormat === 'json') {
      let jsonStr = generatedText.trim();
      const fenceRegex = /^```(\w+json)?\s*\n?(.*?)\n?\s*```$/s; // Support optional "json" after ```
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      try {
        const jsonObj = JSON.parse(jsonStr);
        generatedText = JSON.stringify(jsonObj, null, 2); // Beautify
      } catch (e) {
        console.warn("AI output was expected to be JSON but could not be parsed/beautified. Using raw output.", e, "Raw text:", generatedText);
        // Keep raw text if parsing fails, as the user might want to see what the AI returned
      }
    }
    return generatedText;

  } catch (error: any) {
    console.error('Error calling AI API via SDK:', error);
    const message = error.message || "An unknown error occurred with the AI API.";
    // It might be useful to check for specific error types from the SDK if available
    // e.g., if (error instanceof GoogleGenAIError) { ... }
    throw new Error(message);
  }
}
