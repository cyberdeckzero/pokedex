import { test, expect, openCatalogue, catalogueItems } from './pokedex.fixture';

test('inspection adds to a persistent draft without repeating a search', async ({ page, api }) => {
  await openCatalogue(page);
  await page.getByRole('button', { name: 'View details', exact: true }).click();
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

test('mobile cards prioritize browsing and show initial suggestions', async ({ page, api }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalogue(page);
  await expect(page.getByLabel('Search Pokémon', { exact: true })).toBeInViewport();
  await expect(page.locator('.pokedex__cards')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pokémon base stats table' })).toBeHidden();
  await catalogueItems(page)
    .first()
    .getByRole('button', { name: 'Bulbasaur', exact: true })
    .click();
  await expect(page.locator('.scanner__information h2')).toContainText('Bulbasaur');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
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
  for (const kind of [
    (page.viewportSize()?.width ?? 0) <= 600 ? 'cards' : 'table',
    'profile',
    'teams',
  ])
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
  await expect(catalogueItems(page)).toHaveCount(10);
  const after = await page
    .locator('.pokedex__body')
    .evaluate((element) => element.getBoundingClientRect().height);
  if ((page.viewportSize()?.width ?? 0) > 600)
    expect(Math.abs(after - before)).toBeLessThanOrEqual(2);
  else await expect(page.locator('.pokedex__cards')).toBeVisible();
});

test('team reload reserves overview and builder positions until data returns', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  await expect(page.locator('.teams__totals')).toContainText('1033');
  const position = () =>
    page
      .locator('#team-builder')
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const before = await position();
  let release = () => {};
  api.teamsGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.getByRole('button', { name: 'Reload teams', exact: true }).click();
    await expect(page.locator('app-skeleton [data-kind="team-summary"]')).toBeVisible();
    expect(Math.abs((await position()) - before)).toBeLessThanOrEqual(2);
  } finally {
    release();
    api.teamsGate = null;
  }
  await expect(page.locator('.teams__totals')).toContainText('1033');
  expect(Math.abs((await position()) - before)).toBeLessThanOrEqual(2);
});
