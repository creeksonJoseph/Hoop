/**
 * utils/instagramWindow.js
 * Calculates Instagram 24-hour messaging window status for a contact.
 * Meta's platform policy allows messaging contacts within 24 hours of their last interaction.
 */

export function get24hWindowStatus(messages = [], contactName = '') {
  const rawName = (contactName || '').replace(/^@+/, '').trim();
  const name = rawName ? `@${rawName}` : 'This contact';

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      hasIncoming: false,
      isExpired: false,
      isExpiringSoon: false,
      timeRemainingMs: null,
      warningText: null,
    };
  }

  // Find the latest incoming message from the contact
  let maxTime = 0;
  for (const m of messages) {
    const isIncoming =
      m.direction === 'incoming' ||
      m.direction === 'inbound' ||
      (!m.is_from_me && m.direction !== 'outgoing' && m.sender_name !== 'You');

    if (!isIncoming) continue;

    const rawTs = m.created_at || m.timestamp || m.sentAt;
    if (!rawTs) continue;

    let ts = new Date(rawTs).getTime();
    if (isNaN(ts) && typeof rawTs === 'number') {
      ts = rawTs > 1e10 ? rawTs : rawTs * 1000;
    }
    if (!isNaN(ts) && ts > maxTime) {
      maxTime = ts;
    }
  }

  if (!maxTime) {
    return {
      hasIncoming: false,
      isExpired: false,
      isExpiringSoon: false,
      timeRemainingMs: null,
      warningText: null,
    };
  }

  const now = Date.now();
  const elapsedMs = now - maxTime;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const isExpired = elapsedMs >= twentyFourHoursMs;
  const timeRemainingMs = Math.max(0, twentyFourHoursMs - elapsedMs);
  const isExpiringSoon = !isExpired && timeRemainingMs <= twoHoursMs;

  let warningText = null;
  if (isExpired) {
    warningText = `Heads up: ${name} hasn't messaged you in the last 24 hours, so Instagram won't let this message go through yet. It'll work again once they reply, comment, or react to something from you.`;
  } else if (isExpiringSoon) {
    const hoursLeft = Math.floor(timeRemainingMs / (60 * 60 * 1000));
    const minsLeft = Math.floor((timeRemainingMs % (60 * 60 * 1000)) / (60 * 1000));
    const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
    warningText = `Notice: Instagram's 24-hour messaging window with ${name} closes in ${timeStr}. Once closed, they must reply or comment to reopen it.`;
  }

  return {
    hasIncoming: true,
    isExpired,
    isExpiringSoon,
    timeRemainingMs,
    warningText,
  };
}
