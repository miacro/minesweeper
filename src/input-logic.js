export const TOUCH_MOVE_THRESHOLD = 10;

export function isPrimaryMouseGesture(event) {
  return event.pointerType === 'mouse' && event.button === 0 && !event.ctrlKey;
}

export function canCompleteMouseGesture(activePointerId, event) {
  return activePointerId === event.pointerId && isPrimaryMouseGesture(event);
}

export function movedBeyondThreshold(start, event, threshold = TOUCH_MOVE_THRESHOLD) {
  if (!start || start.pointerId !== event.pointerId) return false;
  const deltaX = event.clientX - start.clientX;
  const deltaY = event.clientY - start.clientY;
  return deltaX * deltaX + deltaY * deltaY > threshold * threshold;
}

export function touchReleaseAction({ pointerType, moved, longPressed, touchMode, noFlag }) {
  if (pointerType === 'mouse') return 'click';
  if (moved || longPressed) return 'suppress';
  if (!noFlag && touchMode === 'flag') return 'flag';
  return 'click';
}
