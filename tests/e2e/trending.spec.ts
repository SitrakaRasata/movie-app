import { expect, test } from '@playwright/test'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const cards = 'a[href^="/movie/"]'

test.afterAll(() => pool.end())

async function countEvents(movieId: number, kind: string): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    'SELECT count(*) AS n FROM events WHERE movie_id = $1 AND kind = $2',
    [movieId, kind],
  )
  return Number(rows[0].n)
}

async function firstMovieId(cardLinks: string[]): Promise<number> {
  const id = Number(cardLinks[0]?.split('/').pop())
  expect(Number.isInteger(id)).toBe(true)
  return id
}

test('presents the ranking in descending score order', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Trending' })).toBeVisible()

  const scores = await page.locator(`${cards} p.text-accent`).allTextContents()
  expect(scores.length).toBeGreaterThan(1)

  const values = scores.map((s) => Number.parseFloat(s))
  expect(values).toEqual([...values].sort((a, b) => b - a))
})

test('each half-life ranks the same catalogue differently', async ({ page }) => {
  await page.goto('/?window=3600')
  const hot = await page.locator(`${cards} h3`).allTextContents()

  await page.goto('/?window=604800')
  const week = await page.locator(`${cards} h3`).allTextContents()

  expect(hot.length).toBeGreaterThan(1)
  expect(new Set(hot)).toEqual(new Set(week))
  expect(hot).not.toEqual(week)
})

test('search returns matching titles', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search for a movie').fill('dune')
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(/\/search\?q=dune/)
  await expect(page.locator(`${cards} h3`).first()).toContainText(/dune/i)
})

test('opening a movie records a weighted view', async ({ page }) => {
  await page.goto('/')
  const movieId = await firstMovieId(
    await page.locator(cards).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')),
  )

  const before = await countEvents(movieId, 'view')
  await page.goto(`/movie/${movieId}`)
  await expect(page.getByRole('heading').first()).toBeVisible()

  // Tracking runs after the response is flushed, so the row lands a beat later.
  await expect.poll(() => countEvents(movieId, 'view'), { timeout: 10_000 }).toBe(before + 1)
})

test('a reload inside the cooldown window records nothing more', async ({ page }) => {
  await page.goto('/')
  const movieId = await firstMovieId(
    await page.locator(cards).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')),
  )

  const before = await countEvents(movieId, 'view')
  await page.goto(`/movie/${movieId}`)
  await expect.poll(() => countEvents(movieId, 'view'), { timeout: 10_000 }).toBe(before + 1)

  await page.reload()
  await page.reload()
  await page.waitForTimeout(1_000)
  expect(await countEvents(movieId, 'view')).toBe(before + 1)
})

test('the model page renders the decay explorer', async ({ page }) => {
  await page.goto('/model')
  await expect(page.locator('svg polyline').first()).toBeVisible()

  await page.getByRole('slider').fill('168')
  await expect(page.locator('svg polyline').first()).toBeVisible()
})
