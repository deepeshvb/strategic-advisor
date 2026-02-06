/**
 * Local LLM Service - Privacy-First AI
 * 
 * Uses Ollama for completely local inference
 * NO data sent to cloud - everything runs on your machine
 */

import { Message } from '../types';
import { AGI_STRATEGIC_PROMPT } from '../prompts/agi-strategic-prompt';

interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

class LocalLLMService {
  private config: OllamaConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.1:70b', // Default high-performance model
    temperature: 0.7,
    maxTokens: 4000,
  };

  /**
   * Configure local LLM settings
   */
  configure(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('ollama_config', JSON.stringify(this.config));
  }

  /**
   * Load configuration from localStorage
   */
  loadConfig(): void {
    const saved = localStorage.getItem('ollama_config');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load Ollama config:', error);
      }
    }
  }

  /**
   * Check if Ollama is running
   */
  async checkStatus(): Promise<{ running: boolean; models: string[] }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        return { running: false, models: [] };
      }
      
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      
      return { running: true, models };
    } catch (error) {
      console.error('Ollama not running:', error);
      return { running: false, models: [] };
    }
  }

  /**
   * Generate response using local LLM
   */
  async generateResponse(
    userQuery: string,
    context: string,
    systemPrompt: string = AGI_STRATEGIC_PROMPT
  ): Promise<Message> {
    console.log('🧠 Generating response with LOCAL LLM (Ollama)...');
    console.log(`📍 Model: ${this.config.model}`);
    console.log(`🔒 Privacy: All data processed locally, NEVER sent to cloud`);

    try {
      const startTime = Date.now();

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `${systemPrompt}\n\n---\n\n${context}\n\n---\n\nCEO Query: ${userQuery}\n\nProvide strategic guidance:`,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const elapsed = Date.now() - startTime;
      
      console.log(`✅ Local LLM response generated in ${elapsed}ms`);
      console.log(`🔒 Privacy: No data left your computer`);

      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response generated',
        timestamp: new Date(),
        metadata: {
          model: this.config.model,
          processingTime: elapsed,
          privacy: 'local',
        },
      };
    } catch (error: any) {
      console.error('❌ Local LLM Error:', error);

      // Check if Ollama is running
      const status = await this.checkStatus();
      
      if (!status.running) {
        throw new Error(
          'Ollama is not running. Please start Ollama:\n\n' +
          '1. Install: https://ollama.com/download\n' +
          '2. Run: ollama serve\n' +
          `3. Pull model: ollama pull ${this.config.model}\n\n` +
          'Then restart this app.'
        );
      }

      if (status.models.length === 0) {
        throw new Error(
          `No models installed. Please run:\n\nollama pull ${this.config.model}\n\n` +
          'Available models: llama3.1:70b, llama3.1:8b, mistral, phi3'
        );
      }

      if (!status.models.includes(this.config.model)) {
        throw new Error(
          `Model '${this.config.model}' not found.\n\n` +
          `Available: ${status.models.join(', ')}\n\n` +
          `To install: ollama pull ${this.config.model}`
        );
      }

      throw error;
    }
  }

  /**
   * Generate daily briefing using local LLM
   */
  async generateDailyBriefing(context: string): Promise<string> {
    console.log('📊 Generating daily briefing with LOCAL LLM...');

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `${AGI_STRATEGIC_PROMPT}\n\n---\n\n${context}\n\n---\n\nGenerate a comprehensive daily briefing for the CEO. Focus on: critical issues, strategic priorities, cross-team conflicts, opportunities, and what to delegate. Be conversational and proactive.`,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 4000,
          },
        }),
      });

      const data = await response.json();
      console.log('✅ Daily briefing generated locally');
      
      return data.response || 'Unable to generate briefing';
    } catch (error) {
      console.error('Error generating briefing:', error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    const status = await this.checkStatus();
    return status.models;
  }
}

export const localLLMService = new LocalLLMService();

/**
 * Recommended models for Strategic Advisor
 */
export const RECOMMENDED_MODELS = [
  {
    name: 'llama3.1:70b',
    size: '40GB',
    performance: 'Excellent',
    speed: 'Moderate',
    ram: '48GB+',
    description: 'Best strategic reasoning and analysis',
    recommended: true,
  },
  {
    name: 'llama3.1:8b',
    size: '4.7GB',
    performance: 'Good',
    speed: 'Fast',
    ram: '8GB+',
    description: 'Fast, good for most queries',
    recommended: true,
  },
  {
    name: 'mistral:7b',
    size: '4.1GB',
    performance: 'Good',
    speed: 'Fast',
    ram: '8GB+',
    description: 'Fast and capable',
    recommended: false,
  },
  {
    name: 'phi3:14b',
    size: '7.9GB',
    performance: 'Good',
    speed: 'Moderate',
    ram: '16GB+',
    description: 'Microsoft\'s efficient model',
    recommended: false,
  },
];
