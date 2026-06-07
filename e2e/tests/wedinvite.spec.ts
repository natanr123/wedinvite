import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = 'http://localhost:3001/api';

/** Creates an event straight through the API (fast setup for UI tests). */
async function createEvent(request: APIRequestContext, title: string) {
  const res = await request.post(`${API_URL}/events`, {
    data: { title, eventDate: '2027-05-20' },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string; title: string };
}

async function createGuest(
  request: APIRequestContext,
  eventId: string,
  firstNames: string[],
  lastNames: string[],
) {
  const res = await request.post(`${API_URL}/events/${eventId}/guests`, {
    data: { firstNames, lastNames },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { id: string };
}

async function addChip(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).fill(value);
  await page.getByTestId(testId).press('Enter');
}

/**
 * Opens the inline "add relation" panel on a specific guest's card.
 * Targets the button's aria-label: relation chips on *other* cards can
 * contain this guest's name, so filtering cards by text is ambiguous.
 */
async function openConnect(page: Page, guestName: string) {
  await page.getByRole('button', { name: `Add a relation for ${guestName}` }).click();
}

/** Opens the full-screen "add guest" panel from the action bar. */
async function openGuestPanel(page: Page) {
  await page.getByTestId('open-guest-panel').click();
  await expect(page.getByTestId('guest-panel')).toBeVisible();
}

test('creates an event from the home page and lands on its dashboard', async ({ page }) => {
  const title = `E2E Wedding ${Date.now()}`;
  await page.goto('/');
  // "Your events" leaves its loading state only after hydration + effects —
  // interacting earlier can hit a not-yet-hydrated form (dev server under load).
  await expect(page.getByText('Loading…')).toHaveCount(0);
  await page.getByTestId('event-title-input').fill(title);
  await page.getByTestId('event-date-input').fill('2027-05-20');
  await page.getByTestId('create-event-button').click();

  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}/);
  await expect(page.getByTestId('event-title')).toHaveText(title);
  await expect(page.getByTestId('event-date')).toHaveText('May 20, 2027');

  // The event id is kept in localStorage, so it shows up on the home page.
  await page.goto('/');
  await expect(
    page.getByTestId('saved-events').getByTestId('event-card').filter({ hasText: title }),
  ).toBeVisible();
});

test('adds a guest with multiple first and last names', async ({ page, request }) => {
  const event = await createEvent(request, `Guests ${Date.now()}`);
  await page.goto(`/events/${event.id}`);

  await openGuestPanel(page);
  await addChip(page, 'first-names-input', 'Dana');
  await addChip(page, 'first-names-input', 'Dani');
  await addChip(page, 'last-names-input', 'Cohen');
  await addChip(page, 'last-names-input', 'Levi');
  await page.getByTestId('phone-input').fill('050-1234567');
  await page.getByTestId('address-input').fill('1 Herzl St, Tel Aviv');
  await page.getByTestId('add-guest-button').click();

  // The single-action panel closes after a successful add.
  await expect(page.getByTestId('guest-panel')).toHaveCount(0);

  const card = page.getByTestId('guest-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Dana Cohen');
  await expect(card).toContainText('aka');
  await expect(card).toContainText('Dani');
  await expect(card).toContainText('Levi');
  await expect(card).toContainText('050-1234567');
  await expect(page.getByTestId('guest-count')).toHaveText('(1)');
});

test('requires at least one first name', async ({ page, request }) => {
  const event = await createEvent(request, `Validation ${Date.now()}`);
  await page.goto(`/events/${event.id}`);

  await openGuestPanel(page);
  await addChip(page, 'last-names-input', 'Cohen');
  await page.getByTestId('add-guest-button').click();

  await expect(page.getByTestId('guest-form-error')).toContainText('at least one first name');
  // The panel stays open on a validation error.
  await expect(page.getByTestId('guest-panel')).toBeVisible();
  await expect(page.getByTestId('guest-card')).toHaveCount(0);
});

test('hard-blocks a duplicate name combination (case-insensitive, any combo)', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Duplicates ${Date.now()}`);
  await createGuest(request, event.id, ['Dana', 'Dani'], ['Cohen', 'Levi']);
  await page.goto(`/events/${event.id}`);

  // Match against the *secondary* names, in a different letter case — still a
  // claimed (first x last) combination, so the form blocks the submit.
  await openGuestPanel(page);
  await addChip(page, 'first-names-input', 'dani');
  await addChip(page, 'last-names-input', 'levi');

  await expect(page.getByTestId('duplicate-blocked')).toContainText('Dana Cohen');
  await expect(page.getByTestId('add-guest-button')).toBeDisabled();
  await expect(page.getByTestId('guest-card')).toHaveCount(1);
});

test('the API rejects duplicate name combinations with 409 (DB-enforced)', async ({
  request,
}) => {
  const event = await createEvent(request, `Hard dup ${Date.now()}`);
  await createGuest(request, event.id, ['Dana', 'Dani'], ['Cohen', 'Levi']);

  // Exact combo via alias names, different case.
  const dup = await request.post(`${API_URL}/events/${event.id}/guests`, {
    data: { firstNames: ['DANI'], lastNames: ['levi'] },
  });
  expect(dup.status()).toBe(409);
  const body = (await dup.json()) as { message: string; conflictingGuestName: string };
  expect(body.message).toContain('already on this list');
  expect(body.conflictingGuestName).toBe('Dana Cohen');

  // Unicode variant (NFD vs NFC) of the same name is also caught.
  const nfc = await request.post(`${API_URL}/events/${event.id}/guests`, {
    data: { firstNames: ['Yossi'], lastNames: ['Cohén'] }, // é composed
  });
  expect(nfc.ok()).toBeTruthy();
  const nfd = await request.post(`${API_URL}/events/${event.id}/guests`, {
    data: { firstNames: ['Yossi'], lastNames: ['Cohén'] }, // é decomposed
  });
  expect(nfd.status()).toBe(409);

  // Sharing only ONE side of the name is fine — not a full combination.
  const ok = await request.post(`${API_URL}/events/${event.id}/guests`, {
    data: { firstNames: ['Noa'], lastNames: ['Cohen'] },
  });
  expect(ok.ok()).toBeTruthy();
});

test('requires at least one last name', async ({ page, request }) => {
  const event = await createEvent(request, `Last name required ${Date.now()}`);
  await page.goto(`/events/${event.id}`);

  await openGuestPanel(page);
  await addChip(page, 'first-names-input', 'Dana');
  await page.getByTestId('add-guest-button').click();

  await expect(page.getByTestId('guest-form-error')).toContainText('at least one last name');
  await expect(page.getByTestId('guest-card')).toHaveCount(0);
});

test('connects two guests with a preset type', async ({ page, request }) => {
  const event = await createEvent(request, `Relations ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);
  await createGuest(request, event.id, ['Noa'], ['Mizrahi']);
  await page.goto(`/events/${event.id}`);

  // Relations are added from a guest's own card: that guest is side A.
  await openConnect(page, 'Dana Cohen');
  await page.getByTestId('guest-b-select').selectOption({ label: 'Noa Mizrahi' });
  await page.getByTestId('type-select').selectOption('Sister');
  await page.getByTestId('add-relation-button').click();

  const row = page.getByTestId('relation-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Dana Cohen');
  await expect(row).toContainText('Sister');
  await expect(row).toContainText('Noa Mizrahi');
  await expect(page.getByTestId('relation-count')).toHaveText('(1)');
});

test('rejects a duplicate relation, even reversed', async ({ page, request }) => {
  const event = await createEvent(request, `Dup relations ${Date.now()}`);
  const a = await createGuest(request, event.id, ['Dana'], ['Cohen']);
  const b = await createGuest(request, event.id, ['Noa'], ['Mizrahi']);
  const res = await request.post(`${API_URL}/events/${event.id}/relations`, {
    data: { guestAId: a.id, guestBId: b.id, typeLabel: 'Friend' },
  });
  expect(res.ok()).toBeTruthy();
  await page.goto(`/events/${event.id}`);

  // Same pair reversed, same type — the API answers 409 and the UI surfaces it.
  // Add it from Noa's card (Noa is side A this time); the API treats it as the same pair.
  await openConnect(page, 'Noa Mizrahi');
  await page.getByTestId('guest-b-select').selectOption({ label: 'Dana Cohen' });
  await page.getByTestId('type-select').selectOption('Friend');
  await page.getByTestId('add-relation-button').click();

  await expect(page.getByTestId('relation-form-error')).toContainText('already exists');
  await expect(page.getByTestId('relation-row')).toHaveCount(1);
});

test('adds a relation with a custom type and offers it again afterwards', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Custom type ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);
  await createGuest(request, event.id, ['Noa'], ['Mizrahi']);
  await page.goto(`/events/${event.id}`);

  await openConnect(page, 'Dana Cohen');
  await page.getByTestId('guest-b-select').selectOption({ label: 'Noa Mizrahi' });
  await page.getByTestId('type-select').selectOption('__custom__');
  await page.getByTestId('custom-type-input').fill('Army Buddy');
  await page.getByTestId('add-relation-button').click();

  await expect(page.getByTestId('relation-row')).toContainText('Army Buddy');

  // Reopen the panel — the custom type is now a regular option in the dropdown.
  await openConnect(page, 'Dana Cohen');
  await expect(
    page.getByTestId('type-select').locator('option', { hasText: 'Army Buddy' }),
  ).toHaveCount(1);
});

test('edits a guest from their card (same inline panel as the add form)', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Edit guest ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);
  await page.goto(`/events/${event.id}`);

  // Clicking the card body opens the prefilled edit form.
  await page.getByRole('button', { name: 'Edit Dana Cohen' }).click();
  const panel = page.getByTestId('edit-guest-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Edit Dana Cohen');
  // Prefilled chips.
  await expect(panel.getByTestId('chip-Dana')).toBeVisible();
  await expect(panel.getByTestId('chip-Cohen')).toBeVisible();

  // Add a nickname and a phone, save.
  await addChip(page, 'first-names-input', 'Dani');
  await page.getByTestId('phone-input').fill('050-7654321');
  await page.getByTestId('add-guest-button').click();

  await expect(page.getByTestId('edit-guest-panel')).toHaveCount(0);
  const card = page.getByTestId('guest-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Dani');
  await expect(card).toContainText('050-7654321');
});

test('drag a name chip to the front to make it the primary name', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Reorder ${Date.now()}`);
  await createGuest(request, event.id, ['Dana', 'Dani'], ['Cohen']);
  await page.goto(`/events/${event.id}`);

  await page.getByRole('button', { name: 'Edit Dana Cohen' }).click();
  const source = page.getByTestId('chip-Dani');
  const target = page.getByTestId('chip-Dana');
  const sb = (await source.boundingBox())!;
  const tb = (await target.boundingBox())!;
  // Stepped pointer drag — dnd-kit tracks collisions from move events.
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + 4, tb.y + tb.height / 2, { steps: 15 });
  await page.mouse.up();

  // The live preview reflects the new primary immediately…
  await expect(page.getByTestId('edit-guest-panel')).toContainText(
    'Will appear as Dani Cohen',
  );
  // …and saving persists the order (position 0 = primary).
  await page.getByTestId('add-guest-button').click();
  await expect(page.getByTestId('edit-guest-panel')).toHaveCount(0);
  await expect(page.getByTestId('guest-card')).toContainText('Dani Cohen');
});

test('editing a guest cannot steal another guest\'s name combination', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Edit dup ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);
  const noa = await createGuest(request, event.id, ['Noa'], ['Mizrahi']);

  // API-level: PATCH onto a claimed combination → 409.
  const res = await request.patch(`${API_URL}/events/${event.id}/guests/${noa.id}`, {
    data: { firstNames: ['DANA'], lastNames: ['cohen'] },
  });
  expect(res.status()).toBe(409);

  // UI-level: the edit form blocks the exact combination too.
  await page.goto(`/events/${event.id}`);
  await page.getByRole('button', { name: 'Edit Noa Mizrahi' }).click();
  await addChip(page, 'first-names-input', 'Dana');
  await addChip(page, 'last-names-input', 'Cohen');
  await expect(page.getByTestId('duplicate-blocked')).toContainText('Dana Cohen');
  await expect(page.getByTestId('add-guest-button')).toBeDisabled();

  // Re-saving its own unchanged names is NOT a conflict.
  const self = await request.patch(`${API_URL}/events/${event.id}/guests/${noa.id}`, {
    data: { firstNames: ['Noa'], lastNames: ['Mizrahi'] },
  });
  expect(self.ok()).toBeTruthy();
});

test('guest and relation panels are mutually exclusive (one action at a time)', async ({
  page,
  request,
}) => {
  const event = await createEvent(request, `Exclusive ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);
  await createGuest(request, event.id, ['Noa'], ['Mizrahi']);
  await page.goto(`/events/${event.id}`);

  // While creating a guest there is no way to create a relation:
  // every per-card Connect button is disabled.
  await openGuestPanel(page);
  await expect(page.getByTestId('relation-panel')).toHaveCount(0);
  await expect(page.getByTestId('connect-button').first()).toBeDisabled();

  // Escape closes the guest form; only then can the relation form open
  // (via a guest's Connect button — the only entry point).
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('guest-panel')).toHaveCount(0);
  await openConnect(page, 'Dana Cohen');
  await expect(page.getByTestId('relation-panel')).toBeVisible();
  await expect(page.getByTestId('guest-panel')).toHaveCount(0);
  await expect(page.getByTestId('open-guest-panel')).toBeDisabled();
});

test('works when the browser denies ALL storage access (privacy modes)', async ({
  browser,
  request,
}) => {
  const event = await createEvent(request, `No storage ${Date.now()}`);
  await createGuest(request, event.id, ['Dana'], ['Cohen']);

  // Simulate Mi-Browser-style strict privacy: any localStorage access throws.
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const deny = () => {
      throw new DOMException(
        "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
        'SecurityError',
      );
    };
    Object.defineProperty(window, 'localStorage', { get: deny, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { get: deny, configurable: true });
  });
  const page = await context.newPage();

  // The event page must load normally — storage persistence is best-effort.
  await page.goto(`http://localhost:3000/events/${event.id}`);
  await expect(page.getByTestId('event-title')).toContainText('No storage');
  await expect(page.getByTestId('guest-card')).toContainText('Dana Cohen');

  // The opt-in debug overlay must still work under denied storage (in-memory
  // shim) when explicitly enabled with ?debug=1.
  await page.goto(`http://localhost:3000/events/${event.id}?debug=1`);
  await expect(page.locator('.eruda-entry-btn')).toBeVisible();

  await context.close();
});

test('shows not-found for an event that does not exist', async ({ page }) => {
  await page.goto('/events/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { name: 'Event not found' })).toBeVisible();
});
