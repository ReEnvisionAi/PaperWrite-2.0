import OpenAI from 'openai';
import { DocumentRow } from '../types';

let openai: OpenAI | null = null;
let model: string | null = null; // Store the model name

export const initializeOpenAI = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const apiUrl = import.meta.env.VITE_OPENAI_API_URL;
  const loadedModel = import.meta.env.VITE_OPENAI_MODEL; // Use a different variable name

  if (!apiKey) {
    console.error('OpenAI API Key is missing. Please set VITE_OPENAI_API_KEY in your .env file.');
    throw new Error('OpenAI API Key is missing');
  }
  if (!apiUrl) {
    console.error('OpenAI API URL is missing. Please set VITE_OPENAI_API_URL in your .env file.');
    throw new Error('OpenAI API URL is missing');
  }
  if (!loadedModel) {
    console.error('OpenAI Model is missing. Please set VITE_OPENAI_MODEL in your .env file.');
    throw new Error('OpenAI Model is missing');
  }

  console.log("Initializing OpenAI with:");
  console.log("API URL:", apiUrl);
  console.log("Model:", loadedModel);
  // Avoid logging the API key

  openai = new OpenAI({
    apiKey,
    baseURL: apiUrl, // Use baseURL instead of apiUrl for OpenAI v4+
    dangerouslyAllowBrowser: true
  });
  model = loadedModel; // Store the model name
};

export const generateText = async (row: DocumentRow): Promise<string> => {
  if (!openai || !model) { // Check if model is also initialized
    throw new Error('OpenAI client or model not initialized');
  }

  // Prepare section inputs for the prompt
  const sectionInputs = Object.entries(row.sectionInputs)
    .map(([category, inputs]) => {
      // Filter out empty inputs before joining
      const validInputs = inputs.filter(input => input.trim() !== '');
      if (validInputs.length === 0) return '';
      return `${category.charAt(0).toUpperCase() + category.slice(1)}:\n${validInputs.map(input => `- ${input}`).join('\n')}`;
    })
    .filter(Boolean) // Remove empty category sections
    .join('\n\n');

  const systemPrompt = `You are a professional writer generating a section of a larger document. Important guidelines:

1. This is a SECTION of a larger document, not a standalone piece.
2. DO NOT include a conclusion unless explicitly requested in the prompt.
3. Focus on smooth transitions and maintaining narrative flow.
4. Write approximately ${row.aiPrompt.wordCount} words.
5. Use a ${row.aiPrompt.tone} tone.
6. Base the content on: "${row.input || 'the provided context'}"
${sectionInputs ? `\n7. Incorporate this information:\n${sectionInputs}` : ''}
${row.aiPrompt.prompt ? `\n8. Additional instructions: ${row.aiPrompt.prompt}` : ''}

Remember: This is part of a larger document - focus on content flow and avoid unnecessary wrapping up or concluding statements unless specifically requested. Generate only the requested section content.`;

  console.log("Generating text with model:", model);
  console.log("System Prompt:", systemPrompt);
  console.log("User Input:", row.input || "Please generate appropriate content based on the instructions.");


  try {
    const response = await openai.chat.completions.create({
      model: model, // Use the stored model name
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: row.input || "Please generate appropriate content based on the instructions." }
      ],
      temperature: 0.7,
    });

    console.log("OpenAI API Response:", response);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content received from OpenAI API.");
      return 'Error: No content received from API.';
    }
    return content;

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // Provide a more specific error message if possible
    if (error instanceof Error) {
      return `Error generating text: ${error.message}`;
    }
    return 'An unknown error occurred while generating text.';
  }
};
