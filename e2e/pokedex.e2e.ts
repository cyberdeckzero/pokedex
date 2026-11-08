import AxeBuilder from '@axe-core/playwright';
import { test, expect, openCatalogue } from './pokedex.fixture';

test('browse: search, empty recovery, type, sorting and page sizes use the collection', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  await page.getByLabel('Rows per page').selectOption('25');
  await expect(page.locator('tbody tr')).toHaveCount(25);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.pokedex__page-controls')).toContainText('Page 2');
  await page.getByLabel('Search Pokémon', { exact: true }).fill('pikachu');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.pokedex__page-controls')).toContainText('Page 1 of 1');
  await page.getByLabel('Search Pokémon', { exact: true }).fill('no-such-pokemon');
  await expect(page.getByText('No Pokémon match your filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Type', { exact: true }).selectOption('water');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await page.getByRole('button', { name: 'Sort by Total, descending', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Lapras');
  await page.getByLabel('Type', { exact: true }).selectOption('');
  await page.getByLabel('Rows per page').selectOption('50');
  await expect(page.locator('tbody tr')).toHaveCount(50);
  expect(api.teams).toHaveLength(2);
});

test('accessibility: resting, autocomplete and detail states have no axe AA violations', async ({
  page,
  api,
}, testInfo) => {
  await openCatalogue(page);
  const scan = async (state: string) => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    await testInfo.attach(`axe-${state}`, {
      body: JSON.stringify(result.violations, null, 2),
      contentType: 'application/json',
    });
    expect(result.violations).toEqual([]);
  };
  await scan('resting');
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('zzzzzz');
  await expect(page.getByText('No available Pokémon match. Try another name.')).toBeVisible();
  await scan('empty-autocomplete');
  await picker.fill('char');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(3);
  await scan('autocomplete');
  await picker.press('Escape');
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await expect(page.getByText('Strengthens Grass moves')).toBeVisible();
  await scan('detail');
  expect(api.teams).toHaveLength(2);
});

test('layout: 320px, tablet, desktop and 200% text keep content and controls usable', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect(page.getByRole('button', { name: 'Inspect entry' })).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  expect(api.teams).toHaveLength(2);
});

test('keyboard: details return focus to the opener and keep background focus visible', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  const inspect = page.getByRole('button', { name: 'Inspect entry' });
  await inspect.focus();
  await inspect.press('Enter');
  await expect(page.getByRole('button', { name: 'Close Pokémon details' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(inspect).toBeFocused();
  await inspect.press('Enter');
  await expect(page.getByRole('button', { name: 'Close Pokémon details' })).toBeFocused();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const measureFocus = () =>
      page.evaluate(() => {
        const target = document.activeElement;
        if (!(target instanceof HTMLElement)) return { visible: false, target: 'none' };
        const rect = target.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return {
          target: target.outerHTML.slice(0, 160),
          rectangle: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
          visible:
            !document.hasFocus() ||
            (!!rect.width &&
              !!rect.height &&
              rect.top >= 0 &&
              rect.bottom <= innerHeight &&
              (target === hit || target.contains(hit))),
        };
      });
    await expect.poll(measureFocus).toMatchObject({ visible: true });
  }
  expect(api.teams).toHaveLength(2);
});

test('autocomplete: all keyboard options stay visible and required membership can be corrected', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('a');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(10);
  for (let i = 0; i < 10; i++) await picker.press('ArrowDown');
  const active = page.getByRole('listbox').getByRole('option', { selected: true });
  await expect(active).toBeInViewport();
  const fits = await active.evaluate((element) => {
    const menu = element.closest('.picker__dropdown');
    if (!menu) return false;
    const optionRect = element.getBoundingClientRect(),
      menuRect = menu.getBoundingClientRect();
    return optionRect.top >= menuRect.top && optionRect.bottom <= menuRect.bottom;
  });
  expect(fits).toBe(true);
  await picker.press('Enter');
  await expect(page.locator('.builder__chip')).toHaveCount(1);
  await page.locator('.builder__chip button').click();
  await expect(page.locator('.builder__chip')).toHaveCount(0);
  expect(api.teams).toHaveLength(2);
});

test('recovery: catalogue and autocomplete show loading/error then Retry succeeds unchanged', async ({
  page,
  api,
}) => {
  api.catalogueError = true;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Retry Pokédex', exact: true })).toBeVisible();
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('pika');
  await expect(page.getByRole('button', { name: 'Retry suggestions' })).toBeVisible();
  const retrySuggestions = page.getByRole('button', { name: 'Retry suggestions' });
  await retrySuggestions.focus();
  await retrySuggestions.press('Escape');
  await expect(picker).toBeFocused();
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await picker.press('ArrowDown');
  api.catalogueError = false;
  await page.getByRole('button', { name: 'Retry suggestions' }).click();
  await expect(page.getByRole('option', { name: /Pikachu/ })).toBeVisible();
  await picker.press('Escape');
  await expect(page.locator('tbody tr')).toHaveCount(10);
});

test('team form: uniqueness, optimistic create/delete, rollback, retry and persistence', async ({
  page,
  api,
}) => {
  await openCatalogue(page);
  const name = page.getByLabel('Team name');
  await name.fill(' FOREST   patrol ');
  await name.blur();
  await expect(page.getByText('A team with this name already exists.')).toBeVisible();
  await name.fill('Field researchers');
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('pika');
  await expect(page.getByRole('option', { name: /Pikachu/ })).toBeVisible();
  await picker.press('ArrowDown');
  await picker.press('Enter');
  api.createError = true;
  await page.getByRole('button', { name: 'Save team', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  await expect(name).toHaveValue('Field researchers');
  await expect(page.locator('.builder__chip')).toHaveCount(1);
  api.createError = false;
  let release = () => {};
  api.mutationGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByText('Saving…', { exact: true })).toBeVisible();
  release();
  api.mutationGate = null;
  await expect(page.getByRole('button', { name: 'Field researchers', exact: true })).toBeEnabled();
  api.deleteError = true;
  await page.getByRole('button', { name: 'Delete team Field researchers' }).click();
  await page.getByRole('button', { name: 'Confirm delete team Field researchers' }).click();
  await expect(page.getByText(/It has been restored/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Field researchers', exact: true })).toBeVisible();
  api.deleteError = false;
  await page.getByRole('button', { name: 'Retry delete' }).click();
  await expect(page.getByRole('button', { name: 'Field researchers', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Coastal Crew', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Coastal Crew', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('mini-pokedex:selected-team')))
    .toBe('2');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Coastal Crew', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('details: failed abilities recover and rapid selections keep the latest chart', async ({
  page,
  api,
}) => {
  api.detailsError = true;
  await openCatalogue(page);
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await expect(page.getByRole('button', { name: 'Retry details' })).toBeVisible();
  api.detailsError = false;
  await page.getByRole('button', { name: 'Retry details' }).click();
  await expect(page.getByText('Strengthens Grass moves')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next Pokémon', exact: true }).click();
  await page.getByRole('button', { name: 'Next Pokémon', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await expect(page.getByRole('dialog')).toContainText('Venusaur');
  await expect(page.locator('canvas')).toBeVisible();
});

test('visual evidence: device, autocomplete, details, loading, error and empty states', async ({
  page,
  api,
}, testInfo) => {
  const capture = async (name: string) => {
    await page.screenshot({
      path: testInfo.outputPath(name + '.png'),
      fullPage: !name.startsWith('details'),
      animations: 'disabled',
    });
    if (process.env['AUDIT_CAPTURE'])
      await page.screenshot({
        path: `docs/ui-audit/screenshots/${process.env['AUDIT_CAPTURE']}-${testInfo.project.name}-${name}.png`,
        fullPage: !name.startsWith('details'),
        animations: 'disabled',
      });
  };
  await openCatalogue(page);
  await expect
    .poll(() =>
      page
        .locator('app-pokemon-portrait img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await capture('home');
  const picker = page.getByRole('combobox', { name: 'Add Pokémon' });
  await picker.fill('char');
  await expect(page.getByRole('listbox')).toBeVisible();
  await capture('autocomplete');
  await picker.press('Escape');
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await expect(page.getByText('Strengthens Grass moves')).toBeVisible();
  await capture('details');
  await page.getByRole('heading', { name: 'Abilities', exact: true }).scrollIntoViewIfNeeded();
  await capture('details-abilities');
  await page.keyboard.press('Escape');
  await page.getByLabel('Search Pokémon', { exact: true }).fill('no-such-pokemon');
  await expect(page.getByText('No Pokémon match your filters')).toBeVisible();
  await capture('empty');
  let release = () => {};
  api.catalogueGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.reload();
  await expect(page.getByText('Loading the Pokémon catalogue…')).toBeVisible();
  await capture('loading');
  api.catalogueError = true;
  release();
  api.catalogueGate = null;
  await expect(page.getByRole('button', { name: 'Retry Pokédex', exact: true })).toBeVisible();
  await capture('error');
  api.catalogueError = false;
  await page.getByRole('button', { name: 'Retry Pokédex', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
});

test('touch: controls have useful hit areas and inputs avoid small-text zoom', async ({
  page,
  api,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalogue(page);
  await page.getByRole('button', { name: 'Focus Pokémon search' }).click();
  await expect(page.getByLabel('Search Pokémon', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Search Pokémon', { exact: true })).toBeInViewport();
  const sizes = await page
    .locator('.scanner__key, .teams__delete, .button, input, select')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        name: element.getAttribute('aria-label') ?? element.textContent?.trim(),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
  for (const size of sizes) {
    expect(size.width, size.name ?? '').toBeGreaterThanOrEqual(44);
    expect(size.height, size.name ?? '').toBeGreaterThanOrEqual(44);
  }
  for (const size of await page
    .locator('input,select')
    .evaluateAll((elements) =>
      elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
    ))
    expect(size).toBeGreaterThanOrEqual(16);
  expect(api.teams).toHaveLength(2);
});

test('teams: load and hydration errors retry separately from a genuine empty roster', async ({
  page,
  api,
}) => {
  api.teamsError = true;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Retry teams', exact: true })).toBeVisible();
  api.teamsError = false;
  api.hydrationError = true;
  await page.getByRole('button', { name: 'Retry teams', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry team Pokémon' })).toBeVisible();
  api.hydrationError = false;
  await page.getByRole('button', { name: 'Retry team Pokémon' }).click();
  await expect(page.locator('.teams__totals')).toContainText('1033');
  api.teams = [];
  await page.reload();
  await expect(
    page.getByText('No teams yet. Choose a name and add your first Pokémon below.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry teams', exact: true })).toHaveCount(0);
});

test('edge content: a valid 30-character team name never widens the page', async ({
  page,
  api,
}) => {
  const name = 'W'.repeat(30);
  api.teams[0].name = name;
  await page.goto('/');
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
});

test('motion: chart updates in place and the drawer changes modality across sizes', async ({
  page,
  api,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCatalogue(page);
  await page.getByRole('button', { name: 'Inspect entry' }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
  const canvas = await page.locator('canvas').elementHandle();
  const before = await page
    .locator('canvas')
    .evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.getByRole('button', { name: 'Next Pokémon', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ivysaur', exact: true })).toHaveCount(2);
  expect(
    await page.locator('canvas').evaluate((element, original) => element === original, canvas),
  ).toBe(true);
  await expect
    .poll(() =>
      page.locator('canvas').evaluate((element: HTMLCanvasElement) => element.toDataURL()),
    )
    .not.toBe(before);
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /ivysaur/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await page.getByRole('button', { name: 'Close Pokémon details' }).focus();
  expect(await page.getByRole('dialog').evaluate((element) => element.matches(':modal'))).toBe(
    true,
  );
  await page.keyboard.press('Tab');
  expect(
    await page
      .getByRole('dialog')
      .evaluate((element) => !document.hasFocus() || element.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(api.teams).toHaveLength(2);
});
