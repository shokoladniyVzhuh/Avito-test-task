const fallbackApiBaseUrl = 'http://localhost:8080';
const fallbackLlmUrl = 'http://localhost:11434';
const fallbackLlmModel = 'qwen2.5:1.5b';

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl).replace(
    /\/$/,
    '',
  ),
  llmUrl: (import.meta.env.VITE_LLM_URL ?? fallbackLlmUrl).replace(/\/$/, ''),
  llmModel: import.meta.env.VITE_LLM_MODEL ?? fallbackLlmModel,
};
