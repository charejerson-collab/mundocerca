// =============================================================================
// MundoCerca - Messaging Service
// =============================================================================
// Real-time messaging between buyers and sellers
// =============================================================================

import { supabase } from '../server.js';

/**
 * Get or create a conversation between users for a listing
 * @param {Object} options - Conversation options
 * @returns {Promise<Object>} Conversation object
 */
export async function getOrCreateConversation({
  listingId,
  buyerId,
  sellerId,
  initialMessage = null,
}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Check for existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      created_at,
      updated_at,
      is_archived,
      conversation_participants!inner(user_id)
    `)
    .eq('listing_id', listingId)
    .contains('conversation_participants.user_id', [buyerId])
    .single();

  if (existing) {
    // Verify seller is also participant
    const { count } = await supabase
      .from('conversation_participants')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', existing.id)
      .eq('user_id', sellerId);

    if (count > 0) {
      return existing;
    }
  }

  // Create new conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
    })
    .select()
    .single();

  if (convError) throw convError;

  // Add participants
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversation.id, user_id: buyerId, is_buyer: true },
      { conversation_id: conversation.id, user_id: sellerId, is_buyer: false },
    ]);

  if (partError) throw partError;

  // Send initial message if provided
  if (initialMessage) {
    await sendMessage({
      conversationId: conversation.id,
      senderId: buyerId,
      content: initialMessage,
    });
  }

  return conversation;
}

/**
 * Get user's conversations with latest message
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object[]>}
 */
export async function getUserConversations(userId, {
  includeArchived = false,
  limit = 20,
  offset = 0,
} = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  let query = supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      unread_count,
      last_read_at,
      conversations:conversation_id(
        id,
        listing_id,
        created_at,
        updated_at,
        is_archived,
        listings:listing_id(
          id,
          title,
          images,
          price
        )
      )
    `)
    .eq('user_id', userId)
    .order('conversations(updated_at)', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeArchived) {
    query = query.eq('conversations.is_archived', false);
  }

  const { data: participations, error } = await query;

  if (error) throw error;

  // Get other participants and latest message for each conversation
  const conversations = await Promise.all(
    (participations || []).map(async (p) => {
      const conv = p.conversations;

      // Get other participant
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles:user_id(id, full_name, avatar_url)
        `)
        .eq('conversation_id', conv.id)
        .neq('user_id', userId)
        .single();

      // Get latest message
      const { data: latestMessage } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, message_type')
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        id: conv.id,
        listing: conv.listings,
        other_user: otherParticipants?.profiles || null,
        latest_message: latestMessage || null,
        unread_count: p.unread_count || 0,
        last_read_at: p.last_read_at,
        updated_at: conv.updated_at,
        is_archived: conv.is_archived,
      };
    })
  );

  return conversations;
}

/**
 * Get messages in a conversation
 * @param {number} conversationId - Conversation ID
 * @param {string} userId - Requesting user ID (for RLS)
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function getConversationMessages(conversationId, userId, {
  limit = 50,
  before = null,
  after = null,
} = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Verify user is participant
  const { count } = await supabase
    .from('conversation_participants')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (!count) {
    throw new Error('Not authorized to view this conversation');
  }

  let query = supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      metadata,
      created_at,
      updated_at,
      is_read,
      is_deleted,
      profiles:sender_id(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (after) {
    query = query.gt('created_at', after);
  }

  const { data: messages, error } = await query;

  if (error) throw error;

  // Check for more messages
  const { count: totalCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false);

  return {
    messages: (messages || []).reverse(), // Chronological order
    hasMore: (messages?.length || 0) < totalCount,
    totalCount,
  };
}

/**
 * Send a message in a conversation
 * @param {Object} options - Message data
 * @returns {Promise<Object>}
 */
export async function sendMessage({
  conversationId,
  senderId,
  content,
  messageType = 'text',
  metadata = null,
}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }

  if (content.length > 5000) {
    throw new Error('Message too long (max 5000 characters)');
  }

  // Verify sender is participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', senderId)
    .single();

  if (!participant) {
    throw new Error('Not authorized to send messages in this conversation');
  }

  // Insert message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      message_type: messageType,
      metadata,
    })
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      message_type,
      metadata,
      created_at,
      is_read,
      profiles:sender_id(id, full_name, avatar_url)
    `)
    .single();

  if (msgError) throw msgError;

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Increment unread count for other participants
  await supabase
    .from('conversation_participants')
    .update({ unread_count: supabase.sql`unread_count + 1` })
    .eq('conversation_id', conversationId)
    .neq('user_id', senderId);

  return message;
}

/**
 * Mark messages as read
 * @param {number} conversationId - Conversation ID
 * @param {string} userId - User marking as read
 * @returns {Promise<number>} Number of messages marked
 */
export async function markMessagesAsRead(conversationId, userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Update unread messages
  const { data: updated, error: msgError } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false)
    .select('id');

  if (msgError) throw msgError;

  // Reset unread count
  await supabase
    .from('conversation_participants')
    .update({
      unread_count: 0,
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  return updated?.length || 0;
}

/**
 * Delete a message (soft delete)
 * @param {number} messageId - Message ID
 * @param {string} userId - Deleting user (must be sender)
 * @returns {Promise<boolean>}
 */
export async function deleteMessage(messageId, userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId)
    .eq('sender_id', userId);

  if (error) throw error;

  return true;
}

/**
 * Archive/unarchive a conversation
 * @param {number} conversationId - Conversation ID
 * @param {string} userId - User archiving
 * @param {boolean} archive - Archive or unarchive
 * @returns {Promise<boolean>}
 */
export async function toggleArchive(conversationId, userId, archive = true) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Verify participant
  const { count } = await supabase
    .from('conversation_participants')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (!count) {
    throw new Error('Not authorized');
  }

  const { error } = await supabase
    .from('conversations')
    .update({ is_archived: archive })
    .eq('id', conversationId);

  if (error) throw error;

  return true;
}

/**
 * Get unread message count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data } = await supabase
    .from('conversation_participants')
    .select('unread_count')
    .eq('user_id', userId);

  return (data || []).reduce((sum, p) => sum + (p.unread_count || 0), 0);
}

/**
 * Search messages
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Object[]>}
 */
export async function searchMessages(userId, query, { limit = 20 } = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  // Get user's conversations
  const { data: participations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  const conversationIds = (participations || []).map(p => p.conversation_id);

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      conversation_id,
      sender_id,
      profiles:sender_id(full_name),
      conversations:conversation_id(
        listings:listing_id(title)
      )
    `)
    .in('conversation_id', conversationIds)
    .ilike('content', `%${query}%`)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return messages || [];
}

export default {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  toggleArchive,
  getUnreadCount,
  searchMessages,
};
