import { test, expect, openCatalogue, catalogueItems } from './pokedex.fixture';
import type { Locator, Page } from '@playwright/test';

async function pick(page: Page, query: string, name: string) {
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill(query);
  await page.getByRole('option', { name: new RegExp(name, 'i') }).click();
}
async function drag(page: Page, source: Locator, target: Locator, towardTop = false) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Drag source or target is not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + (towardTop ? 5 : to.height / 2), { steps: 60 });
  await page.mouse.up();
}
const memberIds = (page: Page) =>
  page
    .locator('.builder__chip')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-member-id')));

test('selection updates the featured Pokémon without forcing details open', async ({ page }) => {
  await openCatalogue(page);
  await catalogueItems(page)
    .filter({ hasText: 'Charizard' })
    .getByRole('button', { name: 'Charizard', exact: true })
    .click();
  await expect(page.locator('.scanner__information h2')).toHaveText('Charizard');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('app-pokemon-scanner img')).toHaveAttribute('src', /\/6.png$/);
  await page.getByRole('button', { name: 'View details', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Charizard');
});

test('keyboard slot ordering persists and the server receives that order', async ({
  page,
  api,
}, testInfo) => {
  await openCatalogue(page);
  await pick(page, 'bulb', 'Bulbasaur');
  await pick(page, 'chariz', 'Charizard');
  await pick(page, 'pika', 'Pikachu');
  await page.getByRole('button', { name: 'Move charizard earlier', exact: true }).click();
  await expect.poll(() => memberIds(page)).toEqual(['6', '1', '25']);
  await expect(page.locator('[data-member-id="6"]')).toBeFocused();
  await page.locator('[data-member-id="6"]').press('Alt+ArrowDown');
  await expect.poll(() => memberIds(page)).toEqual(['1', '6', '25']);
  await expect(page.locator('app-team-builder app-type-coverage')).toContainText(
    'Defensive weaknesses',
  );
  if (process.env['AUDIT_CAPTURE'])
    await page.locator('app-team-builder').screenshot({
      path: `docs/ui-audit/screenshots/${process.env['AUDIT_CAPTURE']}-${testInfo.project.name}-draft.png`,
      animations: 'disabled',
    });
  await page.reload();
  await expect.poll(() => memberIds(page)).toEqual(['1', '6', '25']);
  await page.getByLabel('Team name').fill('Ordered expedition');
  await page.getByRole('button', { name: 'Save team', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ordered expedition', exact: true })).toBeVisible();
  expect(api.teams.find((team) => team.name === 'Ordered expedition')?.pokemon_ids).toEqual([
    1, 6, 25,
  ]);
});

test('dragging copies catalogue members into the draft and reorders existing slots', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 2400 });
  await openCatalogue(page);
  const slots = page.locator('#team-draft-slots');
  await drag(
    page,
    page.locator('tbody tr').filter({ hasText: 'Bulbasaur' }).locator('td').first(),
    slots,
  );
  await expect.poll(() => memberIds(page)).toEqual(['1']);
  await drag(
    page,
    page.locator('tbody tr').filter({ hasText: 'Bulbasaur' }).locator('td').first(),
    slots,
  );
  await expect.poll(() => memberIds(page)).toEqual(['1']);
  await drag(
    page,
    page.locator('tbody tr').filter({ hasText: 'Charmander' }).locator('td').first(),
    slots,
  );
  await expect.poll(async () => (await memberIds(page)).sort()).toEqual(['1', '4']);
  expect(await page.locator('tbody tr').count()).toBe(10);
  const ids = await memberIds(page);
  const last = ids[1];
  await drag(
    page,
    page.locator(`[data-member-id="${last}"] .builder__drag-handle`),
    page.locator('.builder__chip').first(),
    true,
  );
  await expect.poll(() => memberIds(page)).toEqual([ids[1], ids[0]]);
});

test('a completed catalogue survives refresh without repeating upstream requests', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  const requests = api.catalogueRequests;
  expect(requests).toBeGreaterThan(0);
  api.catalogueError = true;
  await page.reload();
  await expect(catalogueItems(page)).toHaveCount(10);
  await page.getByLabel('Search Pokémon', { exact: true }).fill('pikachu');
  await expect(catalogueItems(page)).toHaveCount(1);
  await expect(catalogueItems(page).first()).toContainText('Pikachu');
  expect(api.catalogueRequests).toBe(requests);
});
