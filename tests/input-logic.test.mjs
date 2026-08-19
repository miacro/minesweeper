import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canCompleteMouseGesture,
  isPrimaryMouseGesture,
  movedBeyondThreshold,
  touchReleaseAction,
} from '../src/input-logic.js';

test('mouse gestures require the same primary pointer to start inside the board', () => {
  const primary = {
    pointerType: 'mouse', pointerId: 7, button: 0, ctrlKey: false,
  };

  assert.equal(isPrimaryMouseGesture(primary), true);
  assert.equal(canCompleteMouseGesture(7, primary), true);
  assert.equal(canCompleteMouseGesture(null, primary), false);
  assert.equal(canCompleteMouseGesture(8, primary), false);
  assert.equal(isPrimaryMouseGesture({ ...primary, ctrlKey: true }), false);
  assert.equal(canCompleteMouseGesture(7, { ...primary, ctrlKey: true }), false);
  assert.equal(isPrimaryMouseGesture({ ...primary, button: 2 }), false);
});

test('touch movement is cancelled only after crossing the drag threshold', () => {
  const start = { pointerId: 3, clientX: 100, clientY: 100 };

  assert.equal(movedBeyondThreshold(start, {
    pointerId: 3, clientX: 106, clientY: 108,
  }), false);
  assert.equal(movedBeyondThreshold(start, {
    pointerId: 3, clientX: 111, clientY: 100,
  }), true);
  assert.equal(movedBeyondThreshold(start, {
    pointerId: 4, clientX: 150, clientY: 150,
  }), false);
});

test('touch release suppresses the click after long press or movement', () => {
  const touch = {
    pointerType: 'touch', moved: false, longPressed: false, touchMode: 'open', noFlag: false,
  };

  assert.equal(touchReleaseAction(touch), 'click');
  assert.equal(touchReleaseAction({ ...touch, touchMode: 'flag' }), 'flag');
  assert.equal(touchReleaseAction({ ...touch, longPressed: true }), 'suppress');
  assert.equal(touchReleaseAction({ ...touch, longPressed: true, touchMode: 'flag' }), 'suppress');
  assert.equal(touchReleaseAction({ ...touch, moved: true }), 'suppress');
  assert.equal(touchReleaseAction({ ...touch, touchMode: 'flag', noFlag: true }), 'click');
});
