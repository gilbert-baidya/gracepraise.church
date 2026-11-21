const issues: Record<string, Record<string, string>> = {
  '/give.html': {
    images: 'Generated PayPal QR image has no alt attribute.'
  },
  '/calendar.html': {
    console: 'Cloudinary uses a placeholder cloud name (HTTP 400); Sheets loading also depends on external Apps Script.'
  },
  '/gallery.html': { console: 'Published gallery items request missing resources (HTTP 404).' },
  '/prayer-request.html': { overflow: 'Body scroll width measured 2005px in a 1920px viewport.' },
  '/admin/index.html': { overflow: 'Legacy CMS page exceeds the viewport.' },
  '/DEVOTION_TEST.html': { overflow: 'Development fixture exceeds the viewport.' },
  '/HOME_PAGE_TEST.html': { overflow: 'Development fixture exceeds the viewport.' },
  '/sms-opt-in.html': { overflow: 'SMS opt-in page exceeds the viewport.' },
  '/translate-test.html': { overflow: 'Translation fixture exceeds the viewport.' }
};

export function quarantineFor(path: string, check: string) {
  const reason = issues[`/${path.replace(/^\//, '')}`]?.[check];
  return reason ? {
    tag: ['@quarantine'],
    annotation: [{ type: 'quarantine', description: reason }]
  } : {};
}
