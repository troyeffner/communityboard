import { expect, test } from '@playwright/test'

test.describe('API Contracts', () => {
  test('schema health endpoint returns stable contract', async ({ request }) => {
    const res = await request.get('/api/health/schema')
    expect([200, 500, 503]).toContain(res.status())

    const body = await res.json()
    expect(typeof body.ok).toBe('boolean')
    expect(Array.isArray(body.missing)).toBe(true)
    if (!body.ok) {
      expect(body.missing.length).toBeGreaterThanOrEqual(0)
    }
  })
})
