-- =============================================================================
-- MundoCerca - Migration 004: Messaging System
-- =============================================================================
-- Conversations and messages between buyers and sellers
-- =============================================================================

-- =============================================================================
-- CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE public.conversations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Participants
  participant_1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Optional: Link to listing (for listing-specific inquiries)
  listing_id BIGINT REFERENCES public.listings(id) ON DELETE SET NULL,
  
  -- Conversation metadata
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  
  -- Last message info (denormalized for faster list views)
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  last_message_by UUID REFERENCES public.profiles(id),
  
  -- Unread counts (denormalized)
  unread_count_1 INTEGER DEFAULT 0, -- Unread for participant 1
  unread_count_2 INTEGER DEFAULT 0, -- Unread for participant 2
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique conversation per pair per listing
  UNIQUE(participant_1_id, participant_2_id, listing_id)
);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================

CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  
  -- Conversation reference
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  
  -- Sender
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  
  -- Message type
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  
  -- Attachments (for images/files)
  attachments JSONB DEFAULT '[]',
  
  -- Read status
  read_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON public.conversations(status) WHERE status = 'active';

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, sender_id) WHERE read_at IS NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;

CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE
  USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can view messages in own conversations" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in own conversations" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      AND c.status = 'active'
    )
  );

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get or create a conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_other_user_id UUID,
  p_listing_id BIGINT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_conversation_id BIGINT;
  v_current_user UUID := auth.uid();
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  -- Normalize participant order (smaller UUID first) for consistent uniqueness
  IF v_current_user < p_other_user_id THEN
    v_p1 := v_current_user;
    v_p2 := p_other_user_id;
  ELSE
    v_p1 := p_other_user_id;
    v_p2 := v_current_user;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE participant_1_id = v_p1
    AND participant_2_id = v_p2
    AND (
      (p_listing_id IS NULL AND listing_id IS NULL)
      OR listing_id = p_listing_id
    );
  
  -- Create if not exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      participant_1_id,
      participant_2_id,
      listing_id,
      subject
    ) VALUES (
      v_p1,
      v_p2,
      p_listing_id,
      p_subject
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id BIGINT,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_attachments JSONB DEFAULT '[]'
)
RETURNS BIGINT AS $$
DECLARE
  v_message_id BIGINT;
  v_current_user UUID := auth.uid();
  v_other_user UUID;
  v_is_p1 BOOLEAN;
BEGIN
  -- Verify user is participant and conversation is active
  SELECT 
    participant_1_id = v_current_user,
    CASE 
      WHEN participant_1_id = v_current_user THEN participant_2_id
      ELSE participant_1_id
    END
  INTO v_is_p1, v_other_user
  FROM public.conversations
  WHERE id = p_conversation_id
    AND status = 'active'
    AND (participant_1_id = v_current_user OR participant_2_id = v_current_user);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found or not accessible';
  END IF;
  
  -- Insert message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    attachments
  ) VALUES (
    p_conversation_id,
    v_current_user,
    p_content,
    p_message_type,
    p_attachments
  )
  RETURNING id INTO v_message_id;
  
  -- Update conversation metadata
  UPDATE public.conversations
  SET
    last_message_at = NOW(),
    last_message_preview = LEFT(p_content, 100),
    last_message_by = v_current_user,
    updated_at = NOW(),
    -- Increment unread count for other participant
    unread_count_1 = CASE WHEN v_is_p1 THEN unread_count_1 ELSE unread_count_1 + 1 END,
    unread_count_2 = CASE WHEN v_is_p1 THEN unread_count_2 + 1 ELSE unread_count_2 END
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_current_user UUID := auth.uid();
  v_count INTEGER;
  v_is_p1 BOOLEAN;
BEGIN
  -- Verify user is participant
  SELECT participant_1_id = v_current_user
  INTO v_is_p1
  FROM public.conversations
  WHERE id = p_conversation_id
    AND (participant_1_id = v_current_user OR participant_2_id = v_current_user);
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Mark messages as read
  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_current_user
    AND read_at IS NULL
  RETURNING 1 INTO v_count;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Reset unread count for current user
  UPDATE public.conversations
  SET
    unread_count_1 = CASE WHEN v_is_p1 THEN 0 ELSE unread_count_1 END,
    unread_count_2 = CASE WHEN v_is_p1 THEN unread_count_2 ELSE 0 END
  WHERE id = p_conversation_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's conversations with unread count
CREATE OR REPLACE FUNCTION public.get_user_conversations(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  listing_id BIGINT,
  listing_title TEXT,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_by UUID,
  unread_count INTEGER,
  status TEXT
) AS $$
DECLARE
  v_current_user UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    CASE 
      WHEN c.participant_1_id = v_current_user THEN c.participant_2_id
      ELSE c.participant_1_id
    END as other_user_id,
    p.name as other_user_name,
    p.avatar_url as other_user_avatar,
    c.listing_id,
    l.title as listing_title,
    c.subject,
    c.last_message_at,
    c.last_message_preview,
    c.last_message_by,
    CASE 
      WHEN c.participant_1_id = v_current_user THEN c.unread_count_1
      ELSE c.unread_count_2
    END as unread_count,
    c.status
  FROM public.conversations c
  LEFT JOIN public.profiles p ON p.id = CASE 
    WHEN c.participant_1_id = v_current_user THEN c.participant_2_id
    ELSE c.participant_1_id
  END
  LEFT JOIN public.listings l ON l.id = c.listing_id
  WHERE (c.participant_1_id = v_current_user OR c.participant_2_id = v_current_user)
    AND c.status = 'active'
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total unread message count
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS INTEGER AS $$
DECLARE
  v_current_user UUID := auth.uid();
BEGIN
  RETURN (
    SELECT COALESCE(SUM(
      CASE 
        WHEN participant_1_id = v_current_user THEN unread_count_1
        ELSE unread_count_2
      END
    ), 0)::INTEGER
    FROM public.conversations
    WHERE (participant_1_id = v_current_user OR participant_2_id = v_current_user)
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.conversations IS 'Conversations between buyers and sellers';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
