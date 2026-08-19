import { expect, test } from '@playwright/test';

function cell(page, row, col) {
  return page.locator(`.cell[data-row="${row}"][data-col="${col}"]`);
}

async function centerOf(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Cell is not visible');
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.board')).toBeVisible();
});

test('primary mouse preview follows the pointer and opens the release cell', async ({ page }) => {
  const pressedCell = cell(page, 0, 0);
  const releaseCell = cell(page, 15, 29);
  const pressedPoint = await centerOf(pressedCell);
  const releasePoint = await centerOf(releaseCell);

  await page.mouse.move(pressedPoint.x, pressedPoint.y);
  await page.mouse.down();
  await expect(pressedCell).toHaveClass(/\bpeek\b/);

  await page.mouse.move(releasePoint.x, releasePoint.y, { steps: 4 });
  await expect(pressedCell).not.toHaveClass(/\bpeek\b/);
  await expect(releaseCell).toHaveClass(/\bpeek\b/);

  await page.mouse.up();
  await expect(releaseCell).toHaveClass(/\brevealed\b/);
  await expect(page.locator('.cell.peek')).toHaveCount(0);
});

test('same-cell movement does not cancel the pending click', async ({ page }) => {
  const target = cell(page, 0, 0);
  const point = await centerOf(target);
  await page.evaluate(() => {
    const board = document.querySelector('.board');
    board.addEventListener('pointerdown', (event) => {
      window.__activeTestPointerId = event.pointerId;
    }, { once: true });
  });

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await expect(target).toHaveClass(/\bpeek\b/);

  const pointerId = await page.evaluate(() => window.__activeTestPointerId);
  await target.dispatchEvent('pointermove', {
    pointerType: 'mouse',
    pointerId,
    button: -1,
    buttons: 0,
    clientX: point.x + 1,
    clientY: point.y + 1,
  });
  await expect(target).toHaveClass(/\bpeek\b/);

  await page.mouse.move(point.x + 2, point.y + 2);
  await page.mouse.up();
  await expect(target).toHaveClass(/\brevealed\b/);
});

test('Control-primary click never leaks into the reveal action', async ({ page }) => {
  const target = cell(page, 0, 0);
  const point = await centerOf(target);

  await page.keyboard.down('Control');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up('Control');

  await expect(target).not.toHaveClass(/\brevealed\b/);

  if (!await target.evaluate((element) => element.classList.contains('flagged'))) {
    await target.dispatchEvent('contextmenu', {
      button: 0,
      ctrlKey: true,
    });
  }
  await expect(target).toHaveClass(/\bflagged\b/);
  await expect(target).not.toHaveClass(/\brevealed\b/);
});

test('touch long press suppresses the click generated on release', async ({ page }) => {
  const target = cell(page, 0, 0);
  const point = await centerOf(target);

  await target.click({ button: 'right' });
  await target.click({ button: 'right' });
  await expect(target).toHaveClass(/\bquestioned\b/);

  await target.dispatchEvent('pointerdown', {
    pointerType: 'touch',
    pointerId: 31,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: point.x,
    clientY: point.y,
  });
  await expect(target).toHaveClass(/\bpeek\b/);
  await page.waitForTimeout(520);
  await expect(target).toHaveClass('cell');

  await target.evaluate((element, coordinates) => {
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: 'touch',
      pointerId: 31,
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: coordinates.x,
      clientY: coordinates.y,
    }));
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      detail: 1,
      clientX: coordinates.x,
      clientY: coordinates.y,
    }));
  }, point);

  await expect(target).toHaveClass('cell');
  await expect(target).not.toHaveClass(/\brevealed\b/);
});
