import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { generateCEOResponse, generateDailyBriefing, type CEOContext } from '../services/ceoAIService';
import {
  syntheticTeamsMessages,
  syntheticOutlookEmails,
  syntheticCalendarEvents,
} from '../services/syntheticData';
import { realDataService } from '../services/realDataService';
import IntegrationStatus from './IntegrationStatus';
import { format } from 'date-fns';

interface ChatInterfaceProps {
  context: any;
}

export default function ChatInterface({ context: _context }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const useRealDataRef = useRef(false);

  // Check if real data is available on mount
  useEffect(() => {
    useRealDataRef.current = realDataService.hasConfiguredIntegrations();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Enable continuous listening for stop commands
        recognitionRef.current.interimResults = true; // Catch commands faster
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          
          // Check for voice control commands (stop, pause, silence, quiet, shut up)
          const stopCommands = ['stop', 'pause', 'silence', 'quiet', 'shut up', 'stop reading', 'stop talking'];
          if (stopCommands.some(cmd => transcript.includes(cmd))) {
            // Immediately stop speech
            if (synthesisRef.current) {
              synthesisRef.current.cancel();
              setIsSpeaking(false);
            }
            console.log('🔇 Voice command: Stop speaking');
            // Clear input and don't process as query
            setInput('');
            return;
          }
          
          // Only process final results for queries
          if (event.results[event.results.length - 1].isFinal) {
            setInput(transcript);
            setIsListening(false);
            
            // Auto-submit voice input without requiring Enter key
            if (transcript.trim()) {
              // Trigger submission after state updates
              setTimeout(async () => {
                // Stop any ongoing speech before new query
                if (synthesisRef.current) {
                  synthesisRef.current.cancel();
                }
                
                setIsLoading(true);
                try {
                  const userMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content: transcript,
                    timestamp: new Date(),
                  };

                  setMessages((prev) => [...prev, userMessage]);
                  
                  // Build CEO context and generate strategic response
                  const ceoContext = buildCEOContext();
                  const aiResponse = await generateCEOResponse(transcript, ceoContext);
                  
                  setMessages((prev) => [...prev, aiResponse]);
                  
                  // Speak the response if audio is enabled
                  if (audioEnabled) {
                    const cleanContent = aiResponse.content
                      .replace(/[#*]/g, '')
                      .replace(/🔴|🟠|🟡|🟢|📧|💬|📊|✅|📅|💡|🎯|⏰|🚀/g, '')
                      .replace(/\n\n/g, '. ')
                      .replace(/\n/g, ' ')
                      .substring(0, 500);
                    speak(cleanContent);
                  }
                } catch (error) {
                  console.error('Error generating response:', error);
                  setMessages((prev) => [...prev, {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'I apologize, but I encountered an error processing your request. Please try again.',
                    timestamp: new Date(),
                  }]);
                } finally {
                  setIsLoading(false);
                  setInput('');
                }
              }, 300);
            }
          }
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    // Cleanup on page refresh/close
    const handleBeforeUnload = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };

    // Stop recognition when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden && recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
          setIsListening(false);
        } catch (e) {
          // Ignore errors
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Component unmount cleanup
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Recognition might already be stopped
        }
      }
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isListening]);

  // Speak text using text-to-speech
  const speak = (text: string) => {
    if (!audioEnabled || !synthesisRef.current) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsListening(false);
    } else {
      try {
        // Stop any ongoing speech when starting to listen
        if (synthesisRef.current && isSpeaking) {
          synthesisRef.current.cancel();
          setIsSpeaking(false);
        }
        
        // Ensure recognition is ready before starting
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (error: any) {
        // Handle "already started" error gracefully
        if (error.message?.includes('already started')) {
          console.log('Recognition already running, stopping first...');
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
              setIsListening(true);
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              setIsListening(false);
            }
          }, 100);
        } else {
          console.error('Speech recognition error:', error);
          setIsListening(false);
        }
      }
    }
  };

  // Stop speaking immediately
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle audio output
  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Build CEO context from synthetic data
  const buildCEOContext = (): CEOContext => {
    const now = new Date();
    return {
      teamsMessages: syntheticTeamsMessages
        .filter(msg => msg.timestamp > new Date(now.getTime() - 24 * 60 * 60 * 1000))
        .slice(0, 30)
        .map(msg => ({
          channel: msg.channel,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          priority: msg.priority,
          mentions: msg.mentions,
        })),
      emails: syntheticOutlookEmails
        .filter(email => email.timestamp > new Date(now.getTime() - 24 * 60 * 60 * 1000))
        .slice(0, 20)
        .map(email => ({
          from: email.from,
          subject: email.subject,
          body: email.body,
          timestamp: email.timestamp,
          priority: email.priority,
        })),
      calendarEvents: syntheticCalendarEvents
        .filter(event => event.startTime.getTime() > now.getTime())
        .slice(0, 10)
        .map(event => ({
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          attendees: event.attendees,
          requiresPrep: event.requiresPrep,
        })),
      currentInitiatives: [
        'Q1 2026 Planning and Budget Review',
        'Product Launch - New Features',
        'Team Expansion - Hiring Push',
      ],
      urgentIssues: syntheticTeamsMessages
        .filter(msg => msg.priority === 'urgent')
        .slice(0, 3)
        .map(msg => `${msg.channel}: ${msg.content.substring(0, 80)}...`),
    };
  };

  // Load daily briefing
  const loadDailyBriefing = async () => {
    // Stop any ongoing speech
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }

    setIsLoading(true);
    try {
      const ceoContext = buildCEOContext();
      const briefingMessage = await generateDailyBriefing(ceoContext);
      setMessages([briefingMessage]);
      
      // Optionally speak the briefing (first part only to avoid being too long)
      if (audioEnabled) {
        const firstParagraph = briefingMessage.content.split('\n\n')[0];
        const cleanContent = firstParagraph
          .replace(/[#*]/g, '')
          .replace(/🔴|🟠|🟡|🟢|📊|🎯|💡|⏰|🚀/g, '');
        setTimeout(() => speak(cleanContent), 500);
      }
    } catch (error) {
      console.error('Error loading daily briefing:', error);
      setMessages([{
        id: 'error',
        role: 'assistant',
        content: 'Hello! I\'m your strategic coworker. I\'ve been monitoring your communication channels and I\'m ready to help you prioritize your day. What would you like to know?',
        timestamp: new Date(),
      }]);
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build CEO context and generate strategic response
      const ceoContext = buildCEOContext();
      const aiResponse = await generateCEOResponse(input, ceoContext);
      
      setMessages((prev) => [...prev, aiResponse]);
      
      // Speak the response if audio is enabled
      if (audioEnabled) {
        // Clean up markdown-like formatting for better speech
        const cleanContent = aiResponse.content
          .replace(/[#*]/g, '')
          .replace(/🔴|🟠|🟡|🟢|📧|💬|📊|✅|📅|💡|🎯|⏰|🚀/g, '')
          .replace(/\n\n/g, '. ')
          .replace(/\n/g, ' ')
          .substring(0, 500); // Limit length for voice
        speak(cleanContent);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Daily Briefing Button */}
      <div className="border-b border-slate-700 p-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Strategic Coworker AI</h2>
          <button
            onClick={loadDailyBriefing}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            title="Regenerate daily briefing"
          >
            <Sparkles className="w-4 h-4" />
            Daily Briefing
          </button>
        </div>
        <IntegrationStatus />
      </div>
      
      {/* Messages - Mobile Responsive */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-full sm:max-w-[85%] md:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-gray-100'
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3 mt-4 text-green-400 border-b border-green-600 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 mt-4 text-green-300" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-3 text-green-200" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-base font-semibold mb-1 mt-2 text-gray-200" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-200" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2" {...props} />,
                      li: ({node, ...props}) => <li className="ml-2 text-gray-200" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
                      code: ({node, ...props}) => <code className="bg-slate-800 px-2 py-1 rounded text-green-400 text-sm font-mono" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-green-500 pl-4 italic text-gray-300 my-3 bg-slate-800/50 py-2" {...props} />,
                      hr: ({node, ...props}) => <hr className="border-slate-600 my-4" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-20 border-gray-400">
                <span className="text-xs opacity-70">
                  {format(message.timestamp, 'HH:mm')}
                </span>
                {message.metadata?.sources && (
                  <div className="flex gap-1">
                    {message.metadata.sources.map((source) => (
                      <span
                        key={source}
                        className="text-xs px-2 py-0.5 bg-slate-800 bg-opacity-50 rounded"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                )}
                {message.metadata?.priority && (
                  <span className={`text-xs ${getPriorityColor(message.metadata.priority)}`}>
                    ● {message.metadata.priority}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={toggleVoiceInput}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
            }`}
            title={audioEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
            >
              Stop Speaking
            </button>
          )}
          {isListening && (
            <span className="text-sm text-red-400 animate-pulse">
              🎤 Listening...
            </span>
          )}
          {isSpeaking && (
            <span className="text-sm text-primary-400 flex items-center gap-2">
              <span className="animate-pulse">🔊</span> Speaking...
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about priorities, meetings, emails... (or use voice)"
            className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading || isListening}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isListening}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setInput('Give me my strategic briefing for today. What are my top priorities and what clarifications do I need?')}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
          >
            📊 Strategic Briefing
          </button>
          <button
            onClick={() => setInput('What are the ground truth issues I need to know about across all my channels?')}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
          >
            🎯 Ground Truth
          </button>
          <button
            onClick={() => setInput('What meetings should I prep for and what context do I need?')}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
          >
            📅 Meeting Prep
          </button>
          <button
            onClick={() => setInput('What ambiguous situations need clarification from me? Give me a strategy for each.')}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
          >
            ❓ Clarification Strategy
          </button>
          <button
            onClick={() => setInput('What can I delegate vs. what actually needs my attention?')}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-full transition-colors"
          >
            🎪 Delegate vs. Do
          </button>
        </div>
      </div>
    </div>
  );
}
