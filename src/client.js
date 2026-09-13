export const name = 'settings-scroll';

const NAV = 'data-dsh-settings-scroll-nav';
const LIST = 'data-dsh-settings-scroll-list';
const DIALOG = '[role="dialog"][aria-modal="true"]';
const STYLE_ID = 'dsh-settings-scroll-style';
const STYLE = `
[${NAV}] {
  min-height: 0 !important;
  overflow: hidden !important;
  padding-bottom: 12px !important;
}
[${NAV}] > :first-child { flex-shrink: 0 !important; }
[${LIST}] {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior-y: contain;
  scrollbar-gutter: stable;
  padding-bottom: 12px;
  scroll-padding-block: 4px;
}
[${LIST}] > button { flex-shrink: 0 !important; }
`;

/** Match the official settings shell without depending on CSS hash prefixes. */
export function findSettingsLists(doc) {
  const matches = [];
  for (const dialog of doc.querySelectorAll(DIALOG)) {
    for (const nav of dialog.children) {
      if (nav.tagName !== 'NAV') continue;
      const [title, list] = nav.children;
      if (!title?.id || !list || !dialog.getAttribute('aria-labelledby')?.split(/\s+/).includes(title.id)) continue;
      if (![...list.classList].some(token => token.endsWith('_navList'))) continue;
      if (![...list.children].some(child => child.tagName === 'BUTTON')) continue;
      matches.push({ nav, list });
    }
  }
  return matches;
}

/** Reveal only within the list; never scroll the page or the settings content. */
function reveal(list, button) {
  const box = list.getBoundingClientRect();
  const item = button.getBoundingClientRect();
  const top = box.top + list.clientTop;
  const bottom = top + list.clientHeight;
  if (item.top < top) list.scrollTop -= top - item.top;
  else if (item.bottom > bottom) list.scrollTop += item.bottom - bottom;
}

export function install(doc = document) {
  // The loader disposes the previous mount before applying a replacement.
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.dataset.plugin = 'dsh-settings-scroll';
  style.textContent = STYLE;
  doc.head.append(style);
  const mounted = new Map();
  let disposed = false;
  let pending = null;
  const schedule = () => {
    if (!disposed && pending === null) pending = doc.defaultView.requestAnimationFrame(sync);
  };

  const sync = () => {
    pending = null;
    if (disposed) return;
    const current = new Set();
    for (const { nav, list } of findSettingsLists(doc)) {
      current.add(list);
      if (!mounted.has(list)) {
        const oldNav = nav.getAttribute(NAV);
        const oldList = list.getAttribute(LIST);
        nav.setAttribute(NAV, '');
        list.setAttribute(LIST, '');
        const focus = event => {
          const button = event.target.closest?.('button');
          if (button?.parentElement === list) reveal(list, button);
        };
        const key = event => {
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const button = event.target.closest?.('button');
          if (button?.parentElement !== list) return;
          const buttons = [...list.children].filter(child => child.tagName === 'BUTTON' && !child.disabled && child.getClientRects().length);
          const index = buttons.indexOf(button);
          if (index < 0) return;
          let next;
          if (event.key === 'ArrowDown') next = Math.min(index + 1, buttons.length - 1);
          else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = buttons.length - 1;
          else return;
          event.preventDefault();
          buttons[next].focus({ preventScroll: true });
          reveal(list, buttons[next]);
        };
        list.addEventListener('focusin', focus);
        list.addEventListener('keydown', key);
        const navigationObserver = new doc.defaultView.MutationObserver(schedule);
        navigationObserver.observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] });
        mounted.set(list, {
          active: null,
          cleanup() {
            navigationObserver.disconnect();
            list.removeEventListener('focusin', focus);
            list.removeEventListener('keydown', key);
            oldNav === null ? nav.removeAttribute(NAV) : nav.setAttribute(NAV, oldNav);
            oldList === null ? list.removeAttribute(LIST) : list.setAttribute(LIST, oldList);
          },
        });
      }
      const state = mounted.get(list);
      const active = list.querySelector(':scope > button[aria-current="true"]');
      if (state.active !== active) {
        state.active = active;
        if (active) reveal(list, active);
      }
    }
    for (const [list, state] of mounted) {
      if (!current.has(list)) {
        state.cleanup();
        mounted.delete(list);
      }
    }
  };
  // The page observer only discovers modal mount/unmount. Conversation token
  // updates never schedule a document scan. An open nav owns its own observer.
  const hasDialog = node => node.nodeType === 1 && (node.matches(DIALOG) || node.querySelector(DIALOG));
  const observer = new doc.defaultView.MutationObserver(records => {
    for (const record of records) {
      const target = record.target;
      const shellChanged = target.nodeType === 1 && (target.matches(DIALOG) ||
        (target.tagName === 'NAV' && target.parentElement?.matches(DIALOG)));
      if (shellChanged || [...record.addedNodes, ...record.removedNodes].some(hasDialog)) {
        schedule();
        break;
      }
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  sync();
  return () => {
    disposed = true;
    observer.disconnect();
    if (pending !== null) doc.defaultView.cancelAnimationFrame(pending);
    for (const state of mounted.values()) state.cleanup();
    mounted.clear();
    style.remove();
  };
}

/** Cordis owns the effect and removes styles, listeners and observers on unload. */
export function apply(ctx) {
  ctx.effect(() => install(), 'settings-scroll: sidebar');
}
