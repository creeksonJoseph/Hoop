/**
 * hooks/chat/useMessages.js
 * ==========================
 * Manages the initial message fetch for a DM conversation.
 * Runs once on mount and whenever `igUsername` changes.
 *
 * Returns: { messages, participantName, profilePicUrl, convId, loading, seenIds, addMessage }
 */
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";

function messageTime(message) {
  const value =
    message.created_at ||
    message.createdAt ||
    message.sentAt ||
    message.timestamp;
  const time = value == null ? Number.NaN : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function sortChronologically(messages) {
  return [...messages].sort((a, b) => {
    const aTime = messageTime(a);
    const bTime = messageTime(b);
    if (aTime == null || bTime == null) return 0;
    return aTime - bTime;
  });
}

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const messageId = message?.id == null ? null : String(message.id);
    if (messageId == null || seen.has(messageId)) return false;
    seen.add(messageId);
    return true;
  });
}

export function useMessages(igUsername) {
  const [messages, setMessages] = useState([]);
  const [participantName, setParticipantName] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [convId, setConvId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const seenIds = useRef(new Set());
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const addMessage = useCallback((msg) => {
    const messageId = msg?.id == null ? null : String(msg.id);
    if (messageId == null || seenIds.current.has(messageId)) return;
    seenIds.current.add(messageId);
    setMessages((prev) => {
      return sortChronologically([...prev, msg]);
    });
  }, []);

  const reconcileOptimisticMessage = useCallback(
    (optimisticId, confirmedMessage) => {
      const confirmedId =
        confirmedMessage?.id == null ? null : String(confirmedMessage.id);
      if (confirmedId == null) return;

      seenIds.current.delete(String(optimisticId));
      seenIds.current.add(confirmedId);
      setMessages((prev) => {
        const hasConfirmedMessage = prev.some(
          (message) => String(message.id) === confirmedId,
        );
        return sortChronologically(
          hasConfirmedMessage
            ? prev.filter(
                (message) => String(message.id) !== String(optimisticId),
              )
            : prev.map((message) =>
                String(message.id) === String(optimisticId)
                  ? confirmedMessage
                  : message,
              ),
        );
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setConvId(null);
    setParticipantName(null);
    setProfilePicUrl(null);
    setNextCursor(null);
    setHasMore(false);

    const load = async () => {
      try {
        const { data } = await api.get("/messages", {
          params: { username: igUsername, limit: 50, sort: "desc" },
        });
        if (cancelled) return;
        const initialMessages = dedupeMessages(data.messages || []);
        seenIds.current.clear();
        initialMessages.forEach((m) => seenIds.current.add(String(m.id)));
        setMessages(sortChronologically(initialMessages));
        setConvId(data.conversation_id);
        setParticipantName(data.participant_name || null);
        setProfilePicUrl(data.profile_pic_url || null);

        const pag = data.pagination || {};
        const cur = pag.nextCursor || null;
        setNextCursor(cur);
        setHasMore(Boolean(pag.hasMore || cur));
      } catch (err) {
        if (!cancelled) toastRef.current("Failed to load messages", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [igUsername]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor || !igUsername) return;
    setLoadingMore(true);

    try {
      const { data } = await api.get("/messages", {
        params: {
          username: igUsername,
          limit: 50,
          sort: "desc",
          cursor: nextCursor,
        },
      });

      const pag = data.pagination || {};
      const cur = pag.nextCursor || null;
      setNextCursor(cur);
      setHasMore(Boolean(pag.hasMore ?? cur));

      // Only prepend messages we haven't seen yet (older ones arrive first)
      const fetchedMsgs = data.messages || [];
      const newOlderMsgs = dedupeMessages(fetchedMsgs).filter(
        (m) => !seenIds.current.has(String(m.id)),
      );
      newOlderMsgs.forEach((m) => seenIds.current.add(String(m.id)));

      if (newOlderMsgs.length > 0) {
        setMessages((prev) => sortChronologically([...newOlderMsgs, ...prev]));
      }
    } catch (err) {
      toastRef.current("Failed to load older messages", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [igUsername, nextCursor, hasMore, loadingMore]);

  return {
    messages,
    setMessages,
    participantName,
    profilePicUrl,
    convId,
    loading,
    seenIds,
    addMessage,
    reconcileOptimisticMessage,
    hasMore,
    loadingMore,
    loadMore,
  };
}
