// =============================================================================
// MundoCerca - Messaging System Components
// =============================================================================
// Complete messaging UI: ConversationList + MessageThread
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Image,
  Paperclip,
  Smile,
  Clock,
  Loader2,
  User,
  X,
  Trash2,
  Archive,
  Flag
} from 'lucide-react';
import api from '../services/apiV2';

// =============================================================================
// CONVERSATION LIST
// =============================================================================

function ConversationItem({ conversation, isActive, onClick }) {
  const { other_user, last_message, unread_count, listing } = conversation;
  
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('es-MX', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
    }
  };
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
        isActive ? 'bg-indigo-50' : ''
      }`}
    >
      {/* Avatar */}
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
        {other_user?.full_name?.[0] || 'U'}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-gray-900 truncate">
            {other_user?.full_name || 'Usuario'}
          </h4>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(last_message?.created_at)}
          </span>
        </div>
        
        {listing && (
          <p className="text-xs text-indigo-600 truncate mb-1">
            {listing.title}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate">
            {last_message?.content || 'Sin mensajes'}
          </p>
          {unread_count > 0 && (
            <span className="flex-shrink-0 ml-2 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
              {unread_count > 9 ? '9+' : unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({ 
  conversations = [], 
  loading = false, 
  activeId, 
  onSelect,
  onSearch,
  onStartConversation 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredConversations = conversations.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.other_user?.full_name?.toLowerCase().includes(term) ||
      c.listing?.title?.toLowerCase().includes(term)
    );
  });
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Mensajes</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <h3 className="font-medium text-gray-900 mb-1">Sin conversaciones</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm 
                ? 'No se encontraron resultados' 
                : 'Cuando envíes o recibas mensajes, aparecerán aquí'
              }
            </p>
            {!searchTerm && onStartConversation && (
              <button
                onClick={onStartConversation}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Iniciar conversación
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeId}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

function MessageBubble({ message, isOwn }) {
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
        {/* Message Content */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {/* Time & Status */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400">
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            <span className="text-gray-400">
              {message.read_at ? (
                <CheckCheck size={14} className="text-indigo-500" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MESSAGE THREAD
// =============================================================================

export function MessageThread({
  conversation,
  messages = [],
  loading = false,
  sending = false,
  onSend,
  onBack,
  currentUserId
}) {
  const [newMessage, setNewMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (!newMessage.trim() || sending) return;
    onSend(newMessage.trim());
    setNewMessage('');
    inputRef.current?.focus();
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">Selecciona una conversación</h3>
          <p className="text-sm text-gray-500">
            Elige una conversación de la lista para ver los mensajes
          </p>
        </div>
      </div>
    );
  }
  
  const { other_user, listing } = conversation;
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {other_user?.full_name?.[0] || 'U'}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {other_user?.full_name || 'Usuario'}
          </h3>
          {listing && (
            <p className="text-xs text-gray-500 truncate">
              {listing.title}
            </p>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical size={20} />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Archive size={16} />
                  Archivar
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Flag size={16} />
                  Reportar
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Listing Preview */}
      {listing && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {listing.featured_image && (
              <img 
                src={listing.featured_image} 
                alt={listing.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate text-sm">
                {listing.title}
              </p>
              <p className="text-indigo-600 font-semibold text-sm">
                ${listing.price?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={32} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Inicia la conversación
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FULL MESSAGING PAGE
// =============================================================================

export default function MessagingPage({ onBack }) {
  const { user } = useApp();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Derive activeConversation directly from URL params
  const activeConversation = conversationId && conversations.length > 0
    ? conversations.find(c => c.id.toString() === conversationId) || null
    : null;
  
  // Determine if we should show mobile thread view (when conversationId is in URL on mobile)
  const showMobileThread = !!conversationId;
  
  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConversations(true);
      try {
        const data = await api.messaging.getConversations();
        setConversations(data);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  // Fetch messages when conversation selected
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    
    const abortController = new AbortController();
    let isMounted = true;
    
    const fetchMessages = async () => {
      if (!isMounted || abortController.signal.aborted || !conversationId) return;
      setLoadingMessages(true);
      try {
        const data = await api.messaging.getMessages(conversationId, { signal: abortController.signal });
        if (isMounted && !abortController.signal.aborted) {
          setMessages(data);
          // Mark as read
          await api.messaging.markAsRead(conversationId, { signal: abortController.signal });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching messages:', err);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoadingMessages(false);
        }
      }
    };
    
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      isMounted = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, [conversationId]);
  
  const handleSelectConversation = (conversation) => {
    navigate(`/messages/${conversation.id}`);
  };
  
  const handleSendMessage = async (content) => {
    if (!conversationId) return;
    
    setSending(true);
    try {
      const newMessage = await api.messaging.sendMessage(conversationId, content);
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation's last message
      setConversations(prev => prev.map(c => {
        if (c.id.toString() === conversationId) {
          return { ...c, last_message: newMessage };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };
  
  const handleBack = () => {
    navigate('/messages');
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-200">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Mensajes</h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className={`w-full lg:w-96 lg:border-r border-gray-200 ${
          showMobileThread ? 'hidden lg:flex' : 'flex'
        } flex-col`}>
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
          />
        </div>
        
        {/* Main - Message Thread */}
        <div className={`flex-1 ${
          showMobileThread ? 'flex' : 'hidden lg:flex'
        } flex-col`}>
          <MessageThread
            conversation={activeConversation}
            messages={messages}
            loading={loadingMessages}
            sending={sending}
            onSend={handleSendMessage}
            onBack={handleBack}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// NEW CONVERSATION MODAL
// =============================================================================

export function NewConversationModal({ listing, onClose, onSuccess, user }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSend = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      const conversation = await api.messaging.startConversation(
        listing.id,
        listing.owner_id,
        message.trim()
      );
      onSuccess?.(conversation);
      onClose();
    } catch (err) {
      console.error('Error starting conversation:', err);
      alert('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Enviar Mensaje</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        
        {/* Listing Preview */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
          {listing.featured_image && (
            <img 
              src={listing.featured_image} 
              alt={listing.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{listing.title}</p>
            <p className="text-indigo-600 font-semibold">
              ${listing.price?.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Message Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hola, me interesa esta propiedad..."
          rows={4}
          className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
        />
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Enviando...
              </>
            ) : (
              <>
                <Send size={18} />
                Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
