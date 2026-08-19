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
