/**
 * hooks/chat/useChat.js
 * =======================
 * Composes useMessages, useRealtime, and useActions into the single
 * `useChat` hook that all components import.
 *
 * Existing import paths:
 *   import { useChat } from '../hooks/useChat'         ← via hooks/useChat.js shim
 *   import { useChat } from '../hooks/chat/useChat'    ← direct, new preferred path
 */
import { useMessages } from './useMessages'
import { useRealtime } from './useRealtime'
import { useActions } from './useActions'

export function useChat(igUsername) {
  const { messages, setMessages, participantName, profilePicUrl, convId, loading, seenIds, addMessage } =
    useMessages(igUsername)

  useRealtime(convId, addMessage)

  const { sendMessage, deleteMessage } = useActions(igUsername, addMessage, seenIds, setMessages)

  return { messages, participantName, profilePicUrl, loading, sendMessage, deleteMessage }
}
