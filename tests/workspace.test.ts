import { effects, host } from './browserHarness';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exitExpandedMode } from '@devvit/web/client';
import { isWorkspaceExpanded, openWorkspace } from '../src/client/workspaceMode';

const click = { type: 'click', isTrusted: true, target: null } as unknown as MouseEvent;

test('opening the workspace synchronously asks Reddit to expand the configured entrypoint', () => {
  host.webViewMode = 1;
  effects.length = 0;
  openWorkspace(click);
  const mode = effects.find((effect) => effect.immersiveMode)?.immersiveMode;
  assert.equal(mode?.immersiveMode, 2);
  const destination = new URL(mode!.entryUrl!);
  assert.equal(destination.pathname, '/index.html');
  assert.ok([...destination.searchParams.values()].includes('test-token'));
});

test('workspace mode follows Reddit host state instead of assuming a popup opened', () => {
  host.webViewMode = 1;
  assert.equal(isWorkspaceExpanded(), false);
  host.webViewMode = 2;
  assert.equal(isWorkspaceExpanded(), true);
});

test('closing expanded mode emits Reddit inline mode rather than closing the host window', () => {
  host.webViewMode = 2;
  effects.length = 0;
  exitExpandedMode(click);
  assert.equal(effects.find((effect) => effect.immersiveMode)?.immersiveMode?.immersiveMode, 1);
});
