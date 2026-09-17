import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";

const publicApi = axios.create({
  baseURL: "https://hoop-4thy.onrender.com/api",
});

export function useWingman(token) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participantName, setParticipantName] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [convId, setConvId] = useState(null);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef(new Set());

  const addMessage = useCallback((msg) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages((prev) => {
      const optIdx = prev.findIndex(
        (m) => m.id.startsWith('opt_') && m.message === msg.message && m.direction === msg.direction
      );
      if (optIdx !== -1) {
        seenIds.current.delete(prev[optIdx].id);
        const next = [...prev];
        next[optIdx] = msg;
        return next;
      }
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    let active = true;

    publicApi
      .get(`/wingman/${token}`)
      .then(({ data }) => {
        if (active) setSession(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    publicApi
      .get(`/wingman/${token}/messages`)
      .then(({ data }) => {
        if (!active) return;
        data.messages.forEach((msg) => seenIds.current.add(msg.id));
        setMessages(data.messages);
        setParticipantName(data.participant_name || null);
        setProfilePicUrl(data.profile_pic_url || null);
        setConvId(data.conversation_id || null);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token]);

  // Supabase Realtime for new inbound messages
  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`wingman:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row = payload.new;
          addMessage({
            id: row.id,
            message: row.message,
            direction: row.direction,
            sender_name: row.sender_name,
            created_at: row.created_at,
            attachments: [],
          });
        },
      )
      .subscribe((status, err) => {
        if (err) console.error('[Supabase Realtime wingman] error:', err);
        else console.log('[Supabase Realtime wingman] status:', status, 'conv_id:', convId);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId, addMessage]);

  const sendMessage = async (text) => {
    if (!text.trim()) return { success: false, error: 'Message cannot be empty' };
    try {
      await publicApi.post(`/wingman/${token}/reply`, { message: text });
      return { success: true };
    } catch (err) {
      const errCode = err.response?.data?.code;
      const errDetail = err.response?.data?.detail || err.response?.data?.message;
      let errMsg = errDetail || 'Send failed';

      if (
        errCode === 'INSTAGRAM_24H_WINDOW_EXPIRED' ||
        errCode === 'MESSAGING_WINDOW_EXPIRED' ||
        (errMsg && (errMsg.includes('24 hours') || errMsg.includes('24-hour') || errMsg.includes('allowed window')))
      ) {
        errMsg =
          "This message couldn't be sent. Instagram only allows messages within 24 hours of the person's last interaction with you, and that window has closed for now. It'll reopen as soon as they message, comment, or reply to your story.";
      }
      return { success: false, error: errMsg };
    }
  };

  return { session, messages, participantName, profilePicUrl, loading, sendMessage };
}
