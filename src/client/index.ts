// @ts-nocheck
/**
 * dsh-wzone — browser half entry: injects the stylesheet and registers the
 * zone browser into the sidebar's workspace region (shadowed via priority).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import * as React from 'react'
import { ZoneBrowser } from './ZoneBrowser'

export const inject = ['slots', 'sessions', 'workspaces']

const CSS = `
.wz-root{display:flex;flex-direction:column;gap:8px;width:100%;height:100%;box-sizing:border-box;padding:2px 14px 12px 2px;font-family:inherit}
.wz-pinned{flex:none;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1,transparent);border-radius:12px;background:var(--dsw-alias-bg-layer-1,transparent);overflow:hidden}
.wz-pinned-title{padding:7px 12px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#666);letter-spacing:.5px;border-bottom:1px solid var(--dsw-alias-border-l1,transparent)}
.wz-pinned-body{display:flex;flex-direction:column;padding:2px;max-height:220px;overflow-y:auto}
.wz-toggle{display:flex;width:100%;gap:2px;padding:3px;background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.12));border:1px solid var(--dsw-alias-border-l1,transparent);border-radius:12px;box-sizing:border-box;flex:none}
.wz-btn{flex:1;appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);font:inherit;font-size:13px;line-height:1.5;padding:7px 8px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:500;transition:background-color .15s ease,color .15s ease}
.wz-btn:hover{color:var(--dsw-alias-label-primary,#111)}
.wz-btn-active{background:var(--dsw-alias-brand-primary,#2563eb);color:var(--dsw-alias-label-primary-foreground,#fff)}
.wz-btn-active:hover{color:var(--dsw-alias-label-primary-foreground,#fff)}
.wz-count{font-size:11px;line-height:1;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.15));color:var(--dsw-alias-label-secondary,#666)}
.wz-btn-active .wz-count{background:rgba(127,127,127,.24);color:inherit}
.wz-search{width:100%;box-sizing:border-box;flex:none;appearance:none;border:1px solid var(--dsw-alias-border-l1,transparent);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;padding:6px 10px;border-radius:10px;outline:none}
.wz-search::placeholder{color:var(--dsw-alias-label-secondary,#999)}
.wz-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px}
.wz-group{display:flex;flex-direction:column;flex:none}
.wz-group-head{display:flex;align-items:center;gap:4px;padding:6px 6px 6px 2px;border-radius:8px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666)}
.wz-group-head:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06))}
.wz-chevron{flex:none;width:16px;text-align:center;font-size:11px;color:var(--dsw-alias-label-secondary,#999);transition:transform .2s ease}
.wz-pin{flex:none;font-size:10px;color:var(--dsw-alias-state-warn-primary,#f59e0b)}
.wz-group-title{flex:1;min-width:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#666);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wz-group-count{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary,#999)}
.wz-group-add{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);font-size:14px;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;border-radius:6px;flex:none}
.wz-group-add:hover{color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.wz-group-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .22s ease;margin-left:9px}
.wz-group-body.wz-open{grid-template-rows:1fr}
.wz-group-body-inner{overflow:hidden;min-height:0;display:flex;flex-direction:column;padding-left:18px;border-left:1px solid var(--dsw-alias-border-l1,transparent)}
.wz-row{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;transition:background-color .12s ease;flex:none}
.wz-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.wz-row-current{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.12))}
.wz-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-label-secondary,#999)}
.wz-dot-running{background:var(--dsw-alias-state-success-primary,#22c55e)}
.wz-dot-pending{background:var(--dsw-alias-state-error-primary,#e11d48)}
.wz-dot-done{background:var(--dsw-alias-state-warn-primary,#f59e0b)}
.wz-title{flex:1;min-width:0;font-size:13px;color:var(--dsw-alias-label-primary,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wz-time{flex:none;font-size:10px;color:var(--dsw-alias-label-secondary,#999)}
.wz-dots{flex:none;appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);font-size:15px;line-height:1;width:22px;height:22px;cursor:pointer;border-radius:6px;padding:0;display:flex;align-items:center;justify-content:center}
.wz-dots:hover{color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}
.wz-empty{padding:14px 10px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary,#999)}
.wz-archive{flex:none;display:flex;flex-direction:column}
.wz-archive-toggle{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);font:inherit;font-size:12px;text-align:left;padding:6px 8px;border-radius:8px;cursor:pointer}
.wz-archive-toggle:hover{color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06))}
.wz-archive-row{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 24px;border-radius:8px}
.wz-archive-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.06))}
.wz-restore{flex:none;appearance:none;border:1px solid var(--dsw-alias-border-l1,transparent);background:transparent;color:var(--dsw-alias-label-secondary,#666);font-size:11px;padding:2px 9px;border-radius:999px;cursor:pointer}
.wz-restore:hover{color:var(--dsw-alias-brand-primary,#2563eb);border-color:var(--dsw-alias-brand-primary,#2563eb)}
.wz-toolbar{flex:none;display:flex;gap:8px}
.wz-tool-btn{flex:1;appearance:none;border:1px solid var(--dsw-alias-border-l2,transparent);background:transparent;color:var(--dsw-alias-label-secondary,#666);font:inherit;font-size:12px;padding:7px 8px;border-radius:10px;cursor:pointer;box-sizing:border-box}
.wz-tool-btn:hover{color:var(--dsw-alias-label-primary,#111);border-color:var(--dsw-alias-brand-primary,#2563eb)}
.wz-menu{position:fixed;z-index:1000;min-width:150px;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l2,transparent);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.2);padding:4px;display:flex;flex-direction:column}
.wz-menu-item{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;text-align:left;padding:7px 10px;border-radius:7px;cursor:pointer}
.wz-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}
.wz-menu-item-danger{color:var(--dsw-alias-state-error-primary,#e11d48)}
.wz-menu-item-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger,rgba(236,19,19,.08))}
.wz-mask{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999;background:transparent}
.wz-rail{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px}
.wz-rail-btn{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#666);font:inherit;font-size:12px;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.wz-rail-btn:hover{color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.wz-rail-btn-active{background:var(--dsw-alias-brand-primary,#2563eb);color:var(--dsw-alias-label-primary-foreground,#fff)}
.wz-rail-btn-active:hover{color:var(--dsw-alias-label-primary-foreground,#fff)}
`

function injectCss(): () => void {
  const tag = document.createElement('style')
  tag.dataset.plugin = '@linxin666/dsh-client-ui-wzone'
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => { tag.remove() }
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => injectCss(), 'dsh-wzone: css')

  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(
    { name: 'sidebar.workspaces', priority: -1 },
    (props) => React.createElement(ZoneBrowser, {
      ...props,
      sessions: ctx.sessions,
      workspaces: ctx.workspaces,
    }),
  ))
}
