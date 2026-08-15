// @ts-nocheck
/**
 * dsh-wzone — browser half: the work/life zone session browser that replaces
 * the sidebar's workspace browser (single slot, shadowed via priority).
 */
import * as React from 'react'

const STORE_KEY = 'dsh.wzone.v1'
const STATUS_STORE_KEY = 'dsh.wzone.status.v1'

function readCompletedStatuses() {
  try {
    const raw = localStorage.getItem(STATUS_STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const result = {}
      for (let i = 0; i < parsed.length; i++) result[parsed[i]] = true
      return result
    }
    if (!parsed || typeof parsed !== 'object') return {}
    if (Array.isArray(parsed.completed)) {
      const result = {}
      for (let i = 0; i < parsed.completed.length; i++) result[parsed.completed[i]] = true
      return result
    }
    return parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {}
  } catch (e) {
    return {}
  }
}

function writeCompletedStatuses(statuses) {
  try { localStorage.setItem(STATUS_STORE_KEY, JSON.stringify({ completed: Object.keys(statuses) })) } catch (e) {}
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const base = { zones: {}, pinned: [], archived: [], pinnedSessions: [] }
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s = { zones: {}, pinned: [], archived: [], pinnedSessions: [] }
    if (p.zones && typeof p.zones === 'object') s.zones = p.zones
    if (Array.isArray(p.pinned)) s.pinned = p.pinned
    if (Array.isArray(p.archived)) s.archived = p.archived
    if (Array.isArray(p.pinnedSessions)) s.pinnedSessions = p.pinnedSessions
    return s
  } catch (e) {
    return { zones: {}, pinned: [], archived: [], pinnedSessions: [] }
  }
}

function writeStore(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)) } catch (e) {}
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + '分钟前'
  const h = Math.floor(m / 60)
  if (h < 24) return h + '小时前'
  const d = Math.floor(h / 24)
  if (d < 30) return d + '天前'
  try { return new Date(ts).toLocaleDateString() } catch (e) { return '' }
}

function statusClass(s, isCurrent, completedStatuses) {
  if (s.running) return 'running'
  if (s.pendingInteraction) return 'pending'
  if ((s.completed || completedStatuses[s.id]) && !isCurrent) return 'done'
  return 'idle'
}

export function ZoneBrowser(props) {
  const useSessions = props.useSessions
  const useWorkspaces = props.useWorkspaces
  const sessions = props.sessions
  const workspaces = props.workspaces
  const wide = props.wide !== false
  const expandSidebar = typeof props.expandSidebar === 'function' ? props.expandSidebar : null

  const listState = typeof useSessions === 'function' ? useSessions((s) => s) : null
  const wsState = typeof useWorkspaces === 'function' ? useWorkspaces((s) => s) : null

  const zoneState = React.useState('work')
  const zone = zoneState[0]
  const setZone = zoneState[1]
  const storeState = React.useState(readStore)
  const store = storeState[0]
  const setStore = storeState[1]
  const completedState = React.useState(readCompletedStatuses)
  const completedStatuses = completedState[0]
  const setCompletedStatuses = completedState[1]
  const acknowledgedCompleted = React.useRef({})
  const queryState = React.useState('')
  const query = queryState[0]
  const setQuery = queryState[1]
  const collapsedState = React.useState({})
  const collapsed = collapsedState[0]
  const setCollapsed = collapsedState[1]
  const menuState = React.useState(null)
  const menu = menuState[0]
  const setMenu = menuState[1]
  const showArchivedState = React.useState(false)
  const showArchived = showArchivedState[0]
  const setShowArchived = showArchivedState[1]

  const ids = listState ? listState.ids : []
  const byId = listState ? listState.byId : {}
  const currentId = listState ? listState.current : undefined
  const wsItems = wsState ? (wsState.items || []) : []
  const archivedSessionArr = wsState ? (wsState.archivedSessionIds || []) : []

  React.useEffect(() => {
    const next = Object.assign({}, completedStatuses)
    let changed = false
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      const s = byId[id]
      if (!s) continue
      const running = !!s.running
      const pending = !!s.pendingInteraction
      if (running || pending) {
        delete acknowledgedCompleted.current[id]
        if (next[id]) {
          delete next[id]
          changed = true
        }
      } else if (s.completed && id !== currentId && !acknowledgedCompleted.current[id]) {
        if (!next[id]) {
          next[id] = true
          changed = true
        }
      }
    }
    if (changed) {
      setCompletedStatuses(next)
      writeCompletedStatuses(next)
    }
  }, [ids, byId, currentId, completedStatuses])

  const archivedSessionSet = {}
  for (let i = 0; i < archivedSessionArr.length; i++) archivedSessionSet[archivedSessionArr[i]] = true

  const pinnedSessionSet = {}
  const pinnedSessionIds = store.pinnedSessions || []
  for (let i = 0; i < pinnedSessionIds.length; i++) pinnedSessionSet[pinnedSessionIds[i]] = true

  const zones = store.zones || {}
  const zoneOfGroup = (wsId) => (zones['g:' + wsId] === 'life' ? 'life' : 'work')
  const zoneOfUngrouped = (sid) => (zones['s:' + sid] === 'life' ? 'life' : 'work')

  const mutate = (updater) => {
    const next = updater(store)
    setStore(next)
    writeStore(next)
  }
  const moveGroup = (wsId, z) => mutate((st) => {
    const zz = Object.assign({}, st.zones)
    zz['g:' + wsId] = z
    return Object.assign({}, st, { zones: zz })
  })
  const moveUngrouped = (sid, z) => mutate((st) => {
    const zz = Object.assign({}, st.zones)
    zz['s:' + sid] = z
    return Object.assign({}, st, { zones: zz })
  })
  const togglePin = (wsId) => mutate((st) => {
    const pinned = st.pinned.slice()
    const i = pinned.indexOf(wsId)
    if (i >= 0) pinned.splice(i, 1)
    else pinned.push(wsId)
    return Object.assign({}, st, { pinned: pinned })
  })
  const togglePinSession = (sid) => mutate((st) => {
    const arr = (st.pinnedSessions || []).slice()
    const i = arr.indexOf(sid)
    if (i >= 0) arr.splice(i, 1)
    else arr.push(sid)
    return Object.assign({}, st, { pinnedSessions: arr })
  })
  const archiveGroup = (wsId) => mutate((st) => {
    if (st.archived.indexOf(wsId) >= 0) return st
    return Object.assign({}, st, { archived: st.archived.concat([wsId]) })
  })
  const restoreGroup = (wsId) => mutate((st) => {
    return Object.assign({}, st, { archived: st.archived.filter((x) => x !== wsId) })
  })
  const isPinned = (wsId) => store.pinned.indexOf(wsId) >= 0

  const acknowledgeCompleted = (id) => {
    const s = byId[id]
    if (!completedStatuses[id] && !(s && s.completed)) return
    acknowledgedCompleted.current[id] = true
    if (!completedStatuses[id]) return
    const next = Object.assign({}, completedStatuses)
    delete next[id]
    setCompletedStatuses(next)
    writeCompletedStatuses(next)
  }
  const open = (id) => {
    acknowledgeCompleted(id)
    if (sessions && typeof sessions.open === 'function') sessions.open(id)
  }

  React.useEffect(() => {
    if (currentId) acknowledgeCompleted(currentId)
  }, [currentId, byId, completedStatuses])
  const newSession = (wsId) => { if (workspaces && typeof workspaces.startSession === 'function') workspaces.startSession(wsId) }
  const archiveSession = (id) => { if (workspaces && typeof workspaces.archiveSession === 'function') workspaces.archiveSession(id) }
  const forkSession = (id) => {
    if (!sessions || typeof sessions.fork !== 'function') return
    try { sessions.fork({ sessionId: id }).then((cid) => { if (cid) open(cid) }) } catch (e) {}
  }
  const renameGroup = (g) => {
    if (!workspaces || typeof workspaces.rename !== 'function') return
    let title = null
    try { title = window.prompt('重命名项目', g.label) } catch (e) { title = null }
    if (title != null && String(title).trim()) workspaces.rename(g.workspaceId, String(title).trim())
  }
  const deleteGroup = (g) => {
    if (!workspaces || typeof workspaces.delete !== 'function') return
    let ok = false
    try { ok = window.confirm('删除项目「' + g.label + '」？会话不会被删除，会移到未分类。') } catch (e) { ok = false }
    if (ok) workspaces.delete(g.workspaceId)
  }
  const createGroup = () => {
    if (!workspaces || typeof workspaces.pickDirectory !== 'function') return
    try {
      workspaces.pickDirectory().then((path) => {
        if (!path || typeof workspaces.create !== 'function') return
        workspaces.create({ path: path }).then((res) => {
          const ws = res && res.workspace ? res.workspace : res
          const wsId = ws && ws.workspaceId
          if (wsId) moveGroup(wsId, zone)
        }).catch(() => {})
      })
    } catch (e) {}
  }

  const q = query.trim().toLowerCase()
  const matches = (s) => !q || (s.displayTitle && String(s.displayTitle).toLowerCase().indexOf(q) !== -1)

  const accounted = {}
  for (let i = 0; i < wsItems.length; i++) {
    const sids = wsItems[i].sessionIds || []
    for (let j = 0; j < sids.length; j++) {
      if (!accounted[sids[j]]) accounted[sids[j]] = wsItems[i].workspaceId
    }
  }
  const sessionZone = (s) => (accounted[s.id] ? zoneOfGroup(accounted[s.id]) : zoneOfUngrouped(s.id))

  const wsGroups = []
  const archivedGroups = []
  for (let i = 0; i < wsItems.length; i++) {
    const ws = wsItems[i]
    if (store.archived.indexOf(ws.workspaceId) >= 0) {
      archivedGroups.push(ws)
      continue
    }
    if (zoneOfGroup(ws.workspaceId) !== zone) continue
    const gs = []
    const sids = ws.sessionIds || []
    for (let j = 0; j < sids.length; j++) {
      const s = byId[sids[j]]
      if (!s) continue
      if (archivedSessionSet[sids[j]]) continue
      if (pinnedSessionSet[sids[j]]) continue
      if (s.blank) continue
      if (!matches(s)) continue
      gs.push(s)
    }
    wsGroups.push({ key: ws.workspaceId, label: ws.title || ws.path, path: ws.path, workspaceId: ws.workspaceId, sessions: gs, pinned: isPinned(ws.workspaceId), _i: i })
  }
  wsGroups.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a._i - b._i
  })

  const ug = []
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const s = byId[id]
    if (!s) continue
    if (accounted[id]) continue
    if (archivedSessionSet[id]) continue
    if (pinnedSessionSet[id]) continue
    if (s.blank) continue
    if (zoneOfUngrouped(id) !== zone) continue
    if (!matches(s)) continue
    ug.push(s)
  }

  const groups = wsGroups.slice()
  if (ug.length > 0) groups.push({ key: '', label: '未分类', path: undefined, workspaceId: undefined, sessions: ug, pinned: false, _i: -1 })

  const visibleGroups = q ? groups.filter((g) => g.sessions.length > 0) : groups

  const otherZone = zone === 'work' ? 'life' : 'work'
  const otherLabel = zone === 'work' ? '生活' : '工作'

  const pinnedSessions = []
  for (let i = 0; i < pinnedSessionIds.length; i++) {
    const id = pinnedSessionIds[i]
    const s = byId[id]
    if (!s) continue
    if (archivedSessionSet[id]) continue
    pinnedSessions.push(s)
  }

  let workCount = 0
  let lifeCount = 0
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const s = byId[id]
    if (!s || s.blank || archivedSessionSet[id] || pinnedSessionSet[id]) continue
    if (sessionZone(s) === 'life') lifeCount++
    else workCount++
  }

  const selectZone = (z) => { setZone(z); if (expandSidebar) expandSidebar() }
  const openMenu = (e, items) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const w = 160
    const x = Math.max(8, Math.min(rect.right - w, (window.innerWidth || 800) - w - 8))
    const y = rect.bottom + 4
    setMenu({ x: x, y: y, items: items })
  }
  const sessionMenu = (s) => {
    const isSessionPinned = !!pinnedSessionSet[s.id]
    const items = [
      { label: '打开会话', onClick: () => open(s.id) },
      { label: isSessionPinned ? '取消顶置' : '顶置', onClick: () => togglePinSession(s.id) },
    ]
    if (!accounted[s.id]) items.push({ label: '移到「' + otherLabel + '」', onClick: () => moveUngrouped(s.id, otherZone) })
    items.push({ label: '复制为分支', onClick: () => forkSession(s.id) })
    items.push({ label: '归档', danger: true, onClick: () => archiveSession(s.id) })
    return items
  }
  const groupMenu = (g) => [
    { label: '新建会话', onClick: () => newSession(g.workspaceId) },
    { label: g.pinned ? '取消置顶' : '置顶', onClick: () => togglePin(g.workspaceId) },
    { label: '移到「' + otherLabel + '」', onClick: () => moveGroup(g.workspaceId, otherZone) },
    { label: '重命名', onClick: () => renameGroup(g) },
    { label: '归档项目', onClick: () => archiveGroup(g.workspaceId) },
    { label: '删除项目', danger: true, onClick: () => deleteGroup(g) },
  ]
  const toggleCollapse = (key) => {
    const next = Object.assign({}, collapsed)
    next[key] = !next[key]
    setCollapsed(next)
  }

  if (!wide) {
    return React.createElement('div', { className: 'wz-rail' },
      React.createElement('button', { type: 'button', className: 'wz-rail-btn' + (zone === 'work' ? ' wz-rail-btn-active' : ''), onClick: () => selectZone('work'), title: '工作' }, '工'),
      React.createElement('button', { type: 'button', className: 'wz-rail-btn' + (zone === 'life' ? ' wz-rail-btn-active' : ''), onClick: () => selectZone('life'), title: '生活' }, '活'),
    )
  }

  const renderSession = (s) => {
    const isCurrent = s.id === currentId
    return React.createElement('div', { key: s.id, className: 'wz-row' + (isCurrent ? ' wz-row-current' : ''), onClick: () => open(s.id) },
      React.createElement('span', { className: 'wz-dot wz-dot-' + statusClass(s, isCurrent, completedStatuses) }),
      React.createElement('span', { className: 'wz-title', title: s.displayTitle }, s.displayTitle),
      React.createElement('span', { className: 'wz-time' }, timeAgo(s.updatedAt)),
      React.createElement('button', { type: 'button', className: 'wz-dots', title: '更多', onClick: (e) => openMenu(e, sessionMenu(s)) }, '⋯'),
    )
  }

  const pinnedEl = pinnedSessions.length > 0 ? React.createElement('div', { className: 'wz-pinned' },
    React.createElement('div', { className: 'wz-pinned-title' }, '顶置'),
    React.createElement('div', { className: 'wz-pinned-body' }, pinnedSessions.map(renderSession)),
  ) : null

  const groupEls = visibleGroups.map((g) => {
    const isCollapsed = !!collapsed[g.key]
    return React.createElement('div', { key: g.key || '__ungrouped__', className: 'wz-group' },
      React.createElement('div', { className: 'wz-group-head', onClick: () => toggleCollapse(g.key) },
        React.createElement('span', { className: 'wz-chevron' }, isCollapsed ? '▸' : '▾'),
        g.pinned ? React.createElement('span', { className: 'wz-pin', title: '已置顶' }, '★') : null,
        React.createElement('span', { className: 'wz-group-title', title: g.path || g.label }, g.label),
        React.createElement('span', { className: 'wz-group-count' }, String(g.sessions.length)),
        g.workspaceId ? React.createElement('button', { type: 'button', className: 'wz-group-add', title: '在此项目新建会话', onClick: (e) => { e.stopPropagation(); newSession(g.workspaceId) } }, '＋') : null,
        g.workspaceId ? React.createElement('button', { type: 'button', className: 'wz-dots', title: '项目操作', onClick: (e) => openMenu(e, groupMenu(g)) }, '⋯') : null,
      ),
      React.createElement('div', { className: 'wz-group-body' + (isCollapsed ? '' : ' wz-open') },
        React.createElement('div', { className: 'wz-group-body-inner' },
          g.sessions.length === 0
            ? React.createElement('div', { className: 'wz-empty' }, '此项目暂无会话')
            : g.sessions.map(renderSession),
        ),
      ),
    )
  })

  return React.createElement('div', { className: 'wz-root' },
    pinnedEl,
    React.createElement('div', { className: 'wz-toggle', role: 'tablist', 'aria-label': '工作/生活分组' },
      React.createElement('button', { type: 'button', role: 'tab', 'aria-selected': zone === 'work', className: 'wz-btn' + (zone === 'work' ? ' wz-btn-active' : ''), onClick: () => setZone('work') }, '工作', React.createElement('span', { className: 'wz-count' }, String(workCount))),
      React.createElement('button', { type: 'button', role: 'tab', 'aria-selected': zone === 'life', className: 'wz-btn' + (zone === 'life' ? ' wz-btn-active' : ''), onClick: () => setZone('life') }, '生活', React.createElement('span', { className: 'wz-count' }, String(lifeCount))),
    ),
    React.createElement('input', { className: 'wz-search', type: 'search', placeholder: '搜索当前会话…', value: query, onChange: (e) => setQuery(e.target.value) }),
    React.createElement('div', { className: 'wz-list' },
      groupEls.length === 0
        ? React.createElement('div', { className: 'wz-empty' }, q ? '没有匹配的会话' : '这个分组还没有会话')
        : groupEls,
    ),
    archivedGroups.length > 0 ? React.createElement('div', { className: 'wz-archive' },
      React.createElement('button', { type: 'button', className: 'wz-archive-toggle', onClick: () => setShowArchived(!showArchived) },
        (showArchived ? '▾' : '▸') + ' 已归档项目 (' + archivedGroups.length + ')'),
      showArchived ? React.createElement('div', null,
        archivedGroups.map((ws) => React.createElement('div', { key: ws.workspaceId, className: 'wz-archive-row' },
          React.createElement('span', { className: 'wz-title', title: ws.path }, ws.title || ws.path),
          React.createElement('button', { type: 'button', className: 'wz-restore', onClick: () => restoreGroup(ws.workspaceId) }, '恢复'),
        )),
      ) : null,
    ) : null,
    React.createElement('div', { className: 'wz-toolbar' },
      React.createElement('button', { type: 'button', className: 'wz-tool-btn', onClick: createGroup }, '＋ 新建项目'),
    ),
    menu ? React.createElement('div', { className: 'wz-mask', onClick: () => setMenu(null) }) : null,
    menu ? React.createElement('div', { className: 'wz-menu', style: { left: menu.x, top: menu.y }, onClick: (e) => e.stopPropagation() },
      menu.items.map((it, i) => React.createElement('button', { key: i, type: 'button', className: 'wz-menu-item' + (it.danger ? ' wz-menu-item-danger' : ''), onClick: () => { setMenu(null); it.onClick() } }, it.label)),
    ) : null,
  )
}
