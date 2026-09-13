# Frontend Guidelines & UI Architecture

This document outlines frontend conventions, React state patterns, component isolation rules, and responsive design guidelines for **Hooop**.

---

## Custom Hook Abstraction Pattern

In Hooop, visual components (`src/components/` and `src/Pages/`) must **never execute network calls or manage raw API state**. All fetching, mutation, and error handling must be encapsulated inside custom hooks (`src/hooks/`).

```
src/
├── Pages/               # Route components & layouts
├── components/          # Pure visual presentation widgets
│   ├── chat/            # ChatView, MessageBubble, etc.
│   ├── home/            # DMList, AddDMModal, etc.
│   └── skeletons/       # Localized loading skeleton loaders
├── hooks/               # Core application logic & state
│   ├── chat/            # useMessages, useRealtime, useActions, useChat
│   ├── useDMs.js        # DMs state hook
│   └── useAuthForms.js  # Login/Register hook
└── lib/
    └── api.js           # Axios instance with Bearer interceptor
```

### Golden Rule:
If a React component contains `axios.get()`, `fetch()`, or `useEffect()` calling network endpoints directly, **extract it into a custom hook**.

---

## Independent Component Rendering & Isolated Skeletons

To maximize perceived loading speed, every UI component that does not depend on another component's data **must render immediately on its own**.

> [!IMPORTANT]
> **Performance Rule**:
> 1. **Immediate Render**: Static UI elements (Sidebar navigation, empty main canvas, header titles, search bars) render immediately without waiting for API responses.
> 2. **Localized Skeleton Loaders**: Components that require asynchronous data (e.g. DM thread list) render their own localized skeleton components (`DMListSkeleton`, `MessageSkeleton`) while loading.
> 3. **No Global Blockers**: Never block the entire page or sidebar behind a single full-page spinner.

```jsx
// BAD: Blocking the entire layout behind one loading state
if (loading) return <FullPageSpinner />;

return (
  <Layout>
    <Sidebar data={dms} />
    <ChatView messages={messages} />
  </Layout>
);

// GOOD: Static frame renders immediately; data containers handle their own loading
return (
  <Layout>
    {/* Sidebar renders instantly, only the list section shows a skeleton */}
    <Sidebar>
      {loadingDMs ? <DMListSkeleton /> : <DMList dms={dms} />}
    </Sidebar>

    {/* Main area renders instantly */}
    <ChatView messages={messages} isLoading={loadingMessages} />
  </Layout>
);
```

---

## Scroll-Up Pagination & Scroll Restoration

The chat message history (`useMessages.js` & `ChatView.jsx`) supports smooth scroll-up pagination:

1. **Trigger Condition**: When the user scrolls to the very top (`scrollTop === 0`), `loadMore()` is called.
2. **Scroll Anchor Preservation**: Before prepending older messages, `ChatView` records the current `scrollHeight`. After React updates the DOM with prepended items, the container's `scrollTop` is adjusted:
   ```javascript
   // Preserve visual position when older messages are prepended
   useEffect(() => {
     if (chatContainerRef.current && prevScrollHeightRef.current > 0) {
       const newScrollHeight = chatContainerRef.current.scrollHeight;
       const diff = newScrollHeight - prevScrollHeightRef.current;
       chatContainerRef.current.scrollTop = diff;
       prevScrollHeightRef.current = 0;
     }
   }, [messages.length]);
   ```
3. **Double-Fetch Guard**: `prevScrollHeightRef.current` acts as a guard to prevent redundant trigger loops during fast scrolling.

---

## Responsive Layout & Mobile UI Rules

To ensure a seamless user experience across mobile devices, tablets, and desktop displays:

1. **Dynamic Input Placeholders**: Long input placeholders must automatically shorten on mobile screens to prevent text overlap:
   ```javascript
   const placeholderText = isMobile 
     ? 'Type a reply...' 
     : 'Type a reply... (Enter to send, Shift+Enter for newline)';
   ```
2. **Flexible Sidebar Navigation**: On mobile breakpoints (`< 768px`), the navigation rail and DM list toggle cleanly to give full screen width to the active conversation.
3. **Glassmorphism & Aesthetics**: Dark mode and vibrant blur backdrops (`backdrop-blur-md`, curated HSL palettes) are configured globally via Tailwind v4 `@theme`.
