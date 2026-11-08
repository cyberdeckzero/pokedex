import { test, expect, openCatalogue } from './pokedex.fixture';

test('inspection adds to a persistent draft without repeating a search', async ({ page, api }) => {
  await openCatalogue(page);
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await page.getByRole('button', { name: 'Add to team draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Already in draft', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Add current Pokémon to team draft' }),
  ).toBeDisabled();
  await expect(page.locator('.builder__chip')).toContainText('Bulbasaur');
  await page.getByLabel('Team name').fill('A saved draft');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('mini-pokedex:team-draft')))
    .toContain('A saved draft');
  await page.reload();
  await expect(page.getByLabel('Team name')).toHaveValue('A saved draft');
  await expect(page.locator('.builder__chip')).toContainText('Bulbasaur');
  expect(api.teams).toHaveLength(2);
});

test('delete requires a deliberate confirmation and can be canceled', async ({ page, api }) => {
  await openCatalogue(page);
  await page.getByRole('button', { name: 'Delete team Forest Patrol', exact: true }).click();
  expect(api.teams).toHaveLength(2);
  await page.getByRole('button', { name: 'Cancel deleting team Forest Patrol' }).click();
  await expect(
    page.getByRole('button', { name: 'Delete team Forest Patrol', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Delete team Forest Patrol', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete team Forest Patrol' }).click();
  await expect(page.getByRole('button', { name: 'Forest Patrol', exact: true })).toHaveCount(0);
  expect(api.teams).toHaveLength(1);
});

test('mobile prioritizes browsing, pins identity and shows initial suggestions', async ({
  page,
  api,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalogue(page);
  await expect(page.getByLabel('Search Pokémon', { exact: true })).toBeInViewport();
  const region = page.getByRole('region', { name: 'Pokémon base stats table' });
  await region.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const name = page.locator('tbody tr').first().getByRole('button');
  await expect(name).toBeInViewport();
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('char');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('listbox').getByRole('option').first()).toBeInViewport();
  expect(api.teams).toHaveLength(2);
});

test('loading uses shaped skeletons, reserves the table, and respects reduced motion', async ({
  page,
  api,
}) => {
  let releaseCatalogue = () => {};
  let releaseTeams = () => {};
  api.catalogueGate = new Promise<void>((resolve) => {
    releaseCatalogue = resolve;
  });
  api.teamsGate = new Promise<void>((resolve) => {
    releaseTeams = resolve;
  });
  await page.goto('/');
  for (const kind of ['table', 'profile', 'teams'])
    await expect(page.locator(`app-skeleton [data-kind="${kind}"]`).first()).toBeVisible();
  const before = await page
    .locator('.pokedex__body')
    .evaluate((element) => element.getBoundingClientRect().height);
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('pika');
  await expect(page.locator('app-skeleton [data-kind="suggestions"]')).toBeVisible();
  expect(
    await page
      .locator('.skeleton i')
      .first()
      .evaluate((element) => getComputedStyle(element, '::after').animationName),
  ).toBe('none');
  await picker.press('Escape');
  releaseTeams();
  releaseCatalogue();
  api.teamsGate = null;
  api.catalogueGate = null;
  await expect(page.locator('tbody tr')).toHaveCount(10);
  const after = await page
    .locator('.pokedex__body')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
});
