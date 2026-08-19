import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameTimer } from '../modules/timer.js';

test('timer derives elapsed time from the clock instead of interval counts', () => {
  let now = 0;
  let scheduledTick = null;
  const rendered = [];
  const timer = createGameTimer({
    now: () => now,
    onTick: (seconds) => rendered.push(seconds),
    onPersist: () => {},
    schedule: (callback) => {
      scheduledTick = callback;
      return 1;
    },
    cancel: () => {},
  });

  timer.reset();
  timer.start();
  now = 5500;
  scheduledTick();

  assert.equal(timer.getElapsedSeconds(), 5);
  assert.equal(rendered.at(-1), 5);
});

test('timer excludes paused time and restores millisecond precision', () => {
  let now = 1000;
  const timer = createGameTimer({
    now: () => now,
    onTick: () => {},
    onPersist: () => {},
    schedule: () => 1,
    cancel: () => {},
  });

  timer.start();
  now = 6750;
  timer.pause();
  now = 20_000;
  assert.equal(timer.getElapsedMilliseconds(), 5750);

  timer.start();
  now = 20_750;
  timer.pause();
  assert.equal(timer.getElapsedMilliseconds(), 6500);

  timer.restore(4321);
  assert.equal(timer.getElapsedMilliseconds(), 4321);
  assert.equal(timer.getElapsedSeconds(), 4);
});

test('stopping a timer preserves elapsed time without publishing state', () => {
  let now = 1000;
  let ticks = 0;
  let cancellations = 0;
  const timer = createGameTimer({
    now: () => now,
    onTick: () => { ticks += 1; },
    onPersist: () => {},
    schedule: () => 1,
    cancel: () => { cancellations += 1; },
  });

  timer.start();
  now = 2450;
  timer.stop();

  assert.equal(timer.getElapsedMilliseconds(), 1450);
  assert.equal(timer.isRunning(), false);
  assert.equal(ticks, 1);
  assert.equal(cancellations, 1);
});
