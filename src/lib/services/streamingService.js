import { API_BASE_URL } from '$lib/components/ui/sidebar/constants';

// Helper function to parse action items from chunk data
export function parseActionItems(chunk) {
  if (!chunk || typeof chunk !== 'string') return [];
  
  // Handle both XML format and direct instruction format
  let actionContent = chunk;
  const items = [];
  
  // Look for complete action tags in the chunk
  const actionRegex = /<action>([^<]+)<\/action>/g;
  let actionMatch;
  
  while ((actionMatch = actionRegex.exec(chunk)) !== null) {
    actionContent = actionMatch[1];
    
    // Parse key=value pairs from the action content
    // Format: + description='Site Clearing', quantity=1, unit_price=1500, amount=1500
    
    // Remove the leading + if present
    actionContent = actionContent.replace(/^\s*\+\s*/, '').trim();
    
    // Parse key=value pairs more carefully to handle quoted values
    const pairs = [];
    let currentPair = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < actionContent.length; i++) {
      const char = actionContent[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        currentPair += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        currentPair += char;
      } else if (char === ',' && !inQuotes) {
        if (currentPair.trim()) {
          pairs.push(currentPair.trim());
        }
        currentPair = '';
      } else {
        currentPair += char;
      }
    }
    
    // Don't forget the last pair
    if (currentPair.trim()) {
      pairs.push(currentPair.trim());
    }
    
    // Parse each key=value pair
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex > 0) {
        const field = pair.substring(0, equalIndex).trim();
        const value = pair.substring(equalIndex + 1).trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
        
        items.push({
          field: field,
          value: value
        });
      }
    }
  }
  
  return items;
}

/**
 * Streaming service for handling NDJSON AI estimate generation
 */
export class StreamingEstimateService {
  constructor() {
    this.abortController = null;
    this.eventCallbacks = {};
  }

  /**
   * Register event callback
   * @param {string} eventType - Event type to listen for
   * @param {function} callback - Callback function
   */
  on(eventType, callback) {
    if (!this.eventCallbacks[eventType]) {
      this.eventCallbacks[eventType] = [];
    }
    this.eventCallbacks[eventType].push(callback);
  }

  /**
   * Remove event callback
   * @param {string} eventType - Event type
   * @param {function} callback - Callback function to remove
   */
  off(eventType, callback) {
    if (this.eventCallbacks[eventType]) {
      this.eventCallbacks[eventType] = this.eventCallbacks[eventType].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to registered callbacks
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   */
  emit(eventType, data) {
    if (this.eventCallbacks[eventType]) {
      this.eventCallbacks[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} callback:`, error);
        }
      });
    }
  }

  /**
   * Start streaming estimate generation
   * @param {object} requestData - Request data
   * @param {string} accessToken - Auth token
   * @returns {Promise<string>} - Project ID when complete
   */
  async startStreaming(requestData, accessToken) {
    console.log('🚀 Starting streaming request to:', `${API_BASE_URL}/api/agent/stream`);
    console.log('📦 Request data:', requestData);
    console.log('🔑 Access token:', accessToken ? 'Present' : 'Missing');
    
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestData),
        signal: this.abortController.signal
      });
      
      console.log('📡 Response received:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Stream request failed:', response.status, response.statusText);
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let projectId = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines (NDJSON format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines (heartbeat)
          if (!trimmedLine) {
            this.emit('heartbeat', { timestamp: Date.now() });
            continue;
          }

          try {
            const event = JSON.parse(trimmedLine);
            this.handleStreamEvent(event);

            // Capture project ID when available
            if (event.type === 'project_created' && event.projectId) {
              projectId = event.projectId;
            }
          } catch (parseError) {
            console.warn('Failed to parse stream line:', trimmedLine, parseError);
            this.emit('parse_error', { line: trimmedLine, error: parseError });
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim());
          this.handleStreamEvent(event);
          
          if (event.type === 'project_created' && event.projectId) {
            projectId = event.projectId;
          }
        } catch (parseError) {
          console.warn('Failed to parse final buffer:', buffer, parseError);
        }
      }

      this.emit('stream_complete', { projectId });
      return projectId;

    } catch (error) {
      console.error('💥 Streaming error:', error);
      if (error.name === 'AbortError') {
        this.emit('stream_cancelled', { reason: 'User cancelled' });
        throw new Error('Stream cancelled by user');
      } else {
        this.emit('error', { error: error.message });
        throw error;
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Handle individual stream events
   * @param {object} event - Stream event
   */
  handleStreamEvent(event) {
    const { type, message, data, projectId, ...rest } = event;

    // Emit specific event type
    this.emit(type, { message, data, projectId, ...rest });

    // Emit general event for logging/debugging
    this.emit('event', event);

    // Log important events
    if (['stream_start', 'ai_start', 'ai_complete', 'complete', 'project_created', 'error'].includes(type)) {
      console.log(`Stream event [${type}]:`, message || data || event);
    }
  }

  /**
   * Cancel the current stream
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if streaming is active
   * @returns {boolean}
   */
  isStreaming() {
    return this.abortController !== null;
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    this.eventCallbacks = {};
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingEstimateService();