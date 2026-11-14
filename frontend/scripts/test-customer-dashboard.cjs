const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const dictionary = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/i18n/customer-copy.json'), 'utf8'));
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  const file = candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'text/html');
  res.end(fs.readFileSync(file));
});
const bookings = [
  { _id: 'booking-1', bookingReference: 'RX-001', status: 'Confirmed', tourPackage: { _id: 'p1', name: 'SIGIRIYA' } },
  { _id: 'booking-2', bookingReference: 'RX-002', status: 'Payment Pending', itinerary: { title: 'KANDY' } },
  { _id: 'booking-3', bookingReference: 'RX-003', status: 'Completed', tourPackage: { _id: 'p3', name: 'GALLE' } },
].map(b => ({ ...b, travelDate: '2027-10-15', travelers: { adults: 2, children: 1, infants: 0 }, pricing: { totalAmount: 1000, advanceAmount: 300, amountPaid: 100, balanceAmount: 700, currency: 'USD' }, specialRequests: 'Vegetarian please', statusHistory: [{ status: 'Payment Pending', at: '2026-09-29' }], createdAt: '2026-09-29' }));
const notifications = [
  { _id: 'n1', type: 'booking_created', title: 'Booking Created', message: 'Your booking RX-002 has been created.', link: '/my-tours/bookings/booking-2' },
  { _id: 'n2', type: 'booking_confirmed', title: 'Booking Confirmed', message: 'Your booking RX-001 is now "Confirmed". Note: Please bring ID', link: '/my-tours/bookings/booking-1' },
].map(n => ({ ...n, isRead: false, createdAt: '2026-09-29' }));
let browser;
(async () => {
  await new Promise(resolve => server.listen(4196, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const context = await browser.newContext();
  await context.addInitScript(() => { try { localStorage.setItem('roxaval_lang', 'de'); } catch {} });
  const errors = [], writes = [];
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!u.pathname.includes('/api/v1/')) return u.hostname === '127.0.0.1' ? route.continue() : route.abort();
    const endpoint = u.pathname.split('/api/v1')[1];
    let data = [], meta = { total: 0, totalPages: 1, page: 1, unreadCount: 2 };
    if (route.request().method() !== 'GET') writes.push([endpoint, route.request().postData()]);
    if (endpoint === '/auth/me') data = { user: { _id: 'u1', fullName: 'Bandula Guest', email: 'guest@example.test', role: 'customer' } };
    if (endpoint === '/bookings/my-bookings') {
      data = u.searchParams.get('limit') === '1' ? [bookings[0]] : bookings;
      meta.total = data.length;
    }
    if (endpoint === '/notifications') { data = notifications; meta.total = data.length; }
    if (endpoint === '/custom-tours/my-requests') {
      data = [{ _id: 'request-1', referenceNumber: 'RQ-001', status: 'Awaiting Customer Approval', travelDates: { startDate: '2027-10-15', endDate: '2027-10-22' }, travelers: { adults: 2, children: 1, infants: 0 }, hotelCategory: '3 Star', travelStyle: 'Discovery', revisionHistory: [], itinerary: { _id: 'it-1', title: 'KANDY', summary: 'Customer itinerary', status: 'Sent', pricing: { totalPrice: 1000, currency: 'USD', pricePerPerson: true }, days: [], hotels: [] } }];
      meta.total = 1;
    }
    if (endpoint === '/documents/my-documents') data = [{ _id: 'd1', type: 'invoice', fileName: 'Invoice.pdf' }];
    if (endpoint === '/settings') data = { bankDetails: { bankName: 'Test Bank', accountName: 'Roxaval', accountNumber: '1234' } };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data, meta }) });
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  for (const [index, lang] of ['en', 'de', 'fr'].entries()) {
    const tr = english => {
      const row = dictionary.find(r => r[0] === english);
      assert.ok(row, 'Missing translation: ' + english);
      return row[index];
    };
    await page.setViewportSize({ width: lang === 'fr' ? 375 : 1440, height: 900 });
    await page.goto(`http://127.0.0.1:4196/${lang}/my-tours/`);
    await page.getByText(tr('Welcome, {{name}}!').replace('{{name}}', 'Bandula'), { exact: true }).waitFor();
    for (const label of ['Upcoming Tours', 'Pending Inquiries', 'Confirmed Bookings', 'Unread Notifications', 'Tour Progress', 'Pay Now', 'Invoice', 'Payment Method', 'Submit Payment']) await page.getByText(tr(label), { exact: true }).first().waitFor();
    const main = page.locator('main');
    if (lang !== 'en') {
      for (const label of ['Upcoming Tours', 'Confirmed Bookings', 'Tour Progress', 'Pay Now', 'Booking Created', 'Please proceed to payment']) assert.ok(!(await main.innerText()).includes(label), label + ' must be translated');
    }
    // Existing notification links stay in the active locale and change the selected booking.
    const bookingLink = main.locator('a').filter({ hasText: tr('Booking Created') });
    assert.equal(await bookingLink.getAttribute('href'), `/${lang}/my-tours/bookings/booking-2/`);
    await bookingLink.click();
    await main.locator('p.font-display').filter({ hasText: /^KANDY$/ }).waitFor();
    assert.ok(new URL(page.url()).pathname.startsWith(`/${lang}/my-tours/bookings/booking-2`));
    await page.getByRole('button', { name: tr('Show full status log'), exact: true }).click();
    await page.getByRole('button', { name: tr('Hide full status log'), exact: true }).waitFor();
    await page.getByRole('button', { name: tr('Submit Payment'), exact: true }).click();
    await page.getByText(tr('Please upload your transfer slip/receipt before submitting.'), { exact: true }).waitFor();
    assert.equal(await page.locator('input[type="number"]').inputValue(), '300');
    assert.ok((await main.innerText()).includes('USD'), 'Booked currency must not change with language');
    await page.getByRole('button').filter({ hasText: 'RX-003' }).click();
    await page.getByRole('button', { name: tr('Leave a Review'), exact: true }).click();
    await page.getByPlaceholder(tr('Tell other travelers about your experience…')).waitFor();
    const dashboardLocale = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../src/i18n/locales/${lang}/dashboard.json`), 'utf8'));
    await page.getByRole('button', { name: dashboardLocale.myTours.customRequests }).click();
    await page.getByRole('button', { name: tr('Accept Tour'), exact: true }).waitFor();
    await page.getByRole('button', { name: tr('Request Changes'), exact: true }).click();
    await page.getByPlaceholder(tr('What would you like changed?')).waitFor();
    assert.equal(await page.getByRole('link', { name: tr('View Full Quotation'), exact: true }).getAttribute('href'), `/${lang}/my-tours/requests/request-1/quotation/`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth ? [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 80) })) : []);
    assert.deepEqual(overflow, [], 'Mobile overflow: ' + JSON.stringify(overflow));
    console.log(`PASS ${lang}: dashboard, notification navigation, booking status/history, payment validation, documents, reviews and custom requests`);
  }
  await page.goto('http://127.0.0.1:4196/de/my-tours/bookings/booking-2/');
  await page.locator('main p.font-display').filter({ hasText: /^KANDY$/ }).waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  const commonDe = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/i18n/locales/de/common.json'), 'utf8'));
  await page.getByRole('button', { name: commonDe.nav.changeLanguage, exact: true }).first().click();
  await page.getByRole('button', { name: 'Français', exact: true }).click();
  await page.waitForURL('**/fr/my-tours/bookings/booking-2/');
  await page.getByText('Suivi du voyage', { exact: true }).waitFor();
  await page.locator('main p.font-display').filter({ hasText: /^KANDY$/ }).waitFor();
  console.log('PASS language switch preserves the selected booking');
  assert.deepEqual(writes, [], 'Validation must prevent payment writes');
  assert.deepEqual(errors, []);
})().catch(e => { console.error(e.message.split('Call log:')[0]); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
