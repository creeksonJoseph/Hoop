/**
 * hooks/chat/index.js
 * ====================
 * Barrel export for the chat hooks sub-package.
 * Allows consumers to import from either:
 *   '../hooks/chat'             ← package barrel
 *   '../hooks/chat/useChat'     ← direct
 */
export { useChat } from './useChat'
export { useMessages } from './useMessages'
export { useRealtime } from './useRealtime'
export { useActions } from './useActions'
