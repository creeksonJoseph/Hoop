/**
 * hooks/chat/useActions.js
 * =========================
 * Provides `sendMessage` and `deleteMessage` actions for a DM conversation.
 * Handles optimistic updates for send and toast notifications.
 *
 * @param {string} igUsername - The Instagram handle of the conversation partner
 * @param {Function} addMessage - Callback from useMessages to append a message
 * @param {React.MutableRefObject} seenIds - Shared set of already-seen message IDs
 * @param {Function} setMessages - State setter to filter out removed messages
 */
import api from '../../lib/api'
import { useRef } from 'react'
import { useToast } from '../../context/ToastContext'

export function useActions(igUsername, addMessage, seenIds, setMessages) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const sendMessage = async (text) => {
    if (!text.trim()) return false
    const optimistic = {
      id: `opt_${Date.now()}`,
      message: text,
      direction: 'outgoing',
      sender_name: 'You',
      created_at: new Date().toISOString(),
      attachments: [],
    }
    addMessage(optimistic)
    try {
      await api.post('/messages/reply', { message: text }, {
        params: { username: igUsername },
      })
      // Realtime will deliver the confirmed message and replace the optimistic one.
      return true
    } catch (err) {
      const errCode = err.response?.data?.code
      const errDetail = err.response?.data?.detail || err.response?.data?.message
      let errMsg = errDetail || 'Send failed'

      if (
        errCode === 'INSTAGRAM_24H_WINDOW_EXPIRED' ||
        errCode === 'MESSAGING_WINDOW_EXPIRED' ||
        (errMsg && (errMsg.includes('24 hours') || errMsg.includes('24-hour') || errMsg.includes('allowed window')))
      ) {
        errMsg =
          "This message couldn't be sent. Instagram only allows messages within 24 hours of the person's last interaction with you, and that window has closed for now. It'll reopen as soon as they message, comment, or reply to your story."
      }

      toastRef.current(errMsg, 'error')
      seenIds.current.delete(optimistic.id)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      return false
    }
  }

  const deleteMessage = async (msgId) => {
    try {
      await api.delete(`/admin/messages/${msgId}`)
      seenIds.current.delete(msgId)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      toastRef.current('Message deleted', 'success')
    } catch (err) {
      toastRef.current(err.response?.data?.detail || 'Delete failed', 'error')
    }
  }

  return { sendMessage, deleteMessage }
}
