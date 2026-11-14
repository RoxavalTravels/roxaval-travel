# Frontend CSRF call inventory

All first-party API mutations use frontend/src/lib/api.ts. The shared request, multipart upload helpers, refresh request, and retry all send X-Roxaval-Request: 1. Browsers supply Origin. No missing-Origin exemption is enabled. Direct document/receipt downloads remain safe GET requests.

Call sites at remediation time:
```text
frontend/src\context\AuthContext.tsx:61:    const res = await apiPost<LoginResponse>('/auth/login', { email, password });
frontend/src\context\AuthContext.tsx:67:    const res = await apiPost<LoginResponse>('/auth/register', payload);
frontend/src\context\AuthContext.tsx:73:    const res = await apiPost<LoginResponse>('/auth/customer-code/verify', { challengeId, code });
frontend/src\context\AuthContext.tsx:79:    await apiPost('/auth/logout').catch(() => {});
frontend/src\context\AuthContext.tsx:84:    await apiPost('/auth/forgot-password', { email });
frontend/src\context\AuthContext.tsx:88:    await apiPatch<{ accessToken: string }>(`/auth/reset-password/${token}`, { password });
frontend/src\context\AuthContext.tsx:95:    await apiPatch('/auth/update-password', { currentPassword, newPassword });
frontend/src\components\booking\BookingModal.tsx:78:      await apiPost<{ _id: string; bookingReference: string }>('/bookings/from-package', { tourPackage: source.id, expectedUnitPrice: source.price, expectedCurrency: source.currency, ...payload }) :
frontend/src\components\booking\BookingModal.tsx:79:      await apiPost<{ _id: string; bookingReference: string }>('/bookings/from-itinerary', { itinerary: source.id, ...payload });
frontend/src\components\blog\CommentsSection.tsx:37:      await apiPost(`/blogs/${blogId}/comments`, { text: text.trim() });
frontend/src\components\blog\CommentsSection.tsx:49:    await apiDelete(`/blog-comments/${id}`).catch(() => load());
frontend/src\admin\hooks\useAdminList.ts:16: * changes reset to page 1; refetch() re-runs the current query, used after mutations.
frontend/src\hooks\useMessages.ts:29:    refetch().finally(() => {
frontend/src\hooks\useMessages.ts:43:      const message = await apiPost<Message>(`/custom-tours/${requestId}/messages`, { text: text.trim() });
frontend/src\admin\components\HotelVouchersPanel.tsx:183:          await apiPost(`/bookings/${bookingId}/hotel-vouchers/generate`);
frontend/src\admin\components\HotelVouchersPanel.tsx:197:      await apiPatch(`/hotel-vouchers/${voucherId}`, patch);
frontend/src\admin\components\HotelVouchersPanel.tsx:215:          await apiDelete(`/hotel-vouchers/${voucherId}`);
frontend/src\admin\components\HotelVouchersPanel.tsx:230:      await apiPost(`/hotel-vouchers/${voucherId}/email-${audience}`);
frontend/src\admin\pages\activities\Form.tsx:126:        await apiPatch(`/activities/${id}`, payload);
frontend/src\admin\pages\activities\Form.tsx:129:        await apiPost('/activities', payload);
frontend/src\admin\pages\activities\List.tsx:26:      await apiPatch(`/activities/${a._id}`, { status: next });
frontend/src\admin\pages\activities\List.tsx:28:      refetch();
frontend/src\admin\pages\activities\List.tsx:42:          await apiDelete(`/activities/${a._id}`);
frontend/src\admin\pages\activities\List.tsx:44:          refetch();
frontend/src\admin\components\fields\TranslatedFields.tsx:58:      const result = await apiPost<{ de: string; fr: string }>('/translate', { text: en });
frontend/src\admin\components\fields\TranslatedFields.tsx:179:        const result = await apiPost<{ de: string; fr: string }>('/translate', { text: itemEn });
frontend/src\admin\components\fields\Fields.tsx:344:        const { urls } = await apiUploadImages(Array.from(files));
frontend/src\admin\components\fields\Fields.tsx:347:        const { url } = await apiUploadImage(files[0]);
frontend/src\admin\components\Topbar.tsx:78:    await apiPatch(`/notifications/${id}/read`).catch(() => {});
frontend/src\admin\components\Topbar.tsx:90:    await apiPatch('/notifications/read-all').catch(() => {});
frontend/src\admin\pages\birthdays\List.tsx:89:      const result = await apiPost<{ checked: number; sent: number }>('/birthdays/run-now');
frontend/src\admin\pages\birthdays\List.tsx:102:      await apiPost(`/birthdays/resend/${customerId}`);
frontend/src\admin\pages\birthdays\List.tsx:115:      const { phone, message } = await apiPost<{ phone: string; message: string }>(`/birthdays/whatsapp/${customerId}`);
frontend/src\admin\pages\birthdays\List.tsx:270:      await apiPatch('/birthdays/config', { ...config, backgroundImageUrl: background[0] || '' });
frontend/src\admin\pages\birthdays\List.tsx:375:    if (resendingId === null && whatsappingId === null) refetch();
frontend/src\admin\pages\contact\List.tsx:38:      await apiPatch(`/contact/${c._id}/status`, { status: next });
frontend/src\admin\pages\contact\List.tsx:39:      refetch();
frontend/src\admin\pages\contact\List.tsx:58:          await apiDelete(`/contact/${c._id}`);
frontend/src\admin\pages\contact\List.tsx:60:          refetch();
frontend/src\admin\pages\blog\List.tsx:34:      await apiPatch(`/blogs/${post._id}`, { status: next });
frontend/src\admin\pages\blog\List.tsx:36:      refetch();
frontend/src\admin\pages\blog\List.tsx:50:          await apiDelete(`/blogs/${post._id}`);
frontend/src\admin\pages\blog\List.tsx:52:          refetch();
frontend/src\admin\pages\blog\Form.tsx:79:        await apiPatch(`/blogs/${id}`, payload);
frontend/src\admin\pages\blog\Form.tsx:82:        await apiPost('/blogs', payload);
frontend/src\components\layout\NotificationBell.tsx:55:    await apiPatch(`/notifications/${id}/read`).catch(() => {});
frontend/src\components\layout\NotificationBell.tsx:67:    await apiPatch('/notifications/read-all').catch(() => {});
frontend/src\admin\pages\bookings\Detail.tsx:74:          await apiPatch(`/bookings/${id}/status`, { status: nextStatus, note });
frontend/src\admin\pages\bookings\Detail.tsx:90:      const result = await apiPost<{ _id: string } | { _id: string }[]>(`/documents/bookings/${id}/${docPath}`);
frontend/src\admin\pages\customers\New.tsx:32:      const customer = await apiPost<{ _id: string }>('/customers', {
frontend/src\admin\pages\customers\List.tsx:33:          await apiPatch(`/customers/${c._id}/active`, { active: nextActive });
frontend/src\admin\pages\customers\List.tsx:35:          refetch();
frontend/src\admin\pages\customers\List.tsx:51:          await apiDelete(`/customers/${c._id}`);
frontend/src\admin\pages\customers\List.tsx:53:          refetch();
frontend/src\admin\pages\bookings\New.tsx:81:      const result = await apiPost<{ _id: string }>('/bookings/admin/create', {
frontend/src\admin\pages\customers\Detail.tsx:79:      await apiPatch(`/customers/${id}/notes`, { notes });
frontend/src\admin\pages\customers\Detail.tsx:95:      const updated = await apiPatch<CustomerDetail>(`/customers/${id}/profile`, {
frontend/src\admin\pages\customers\Detail.tsx:124:          await apiPatch(`/customers/${id}/active`, { active: nextActive });
frontend/src\admin\pages\customers\Detail.tsx:146:          await apiDelete(`/customers/${id}`);
frontend/src\lib\api.ts:70:    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-Roxaval-Request': '1' } }).
frontend/src\lib\api.ts:104:  let res = await fetch(url, init);
frontend/src\lib\api.ts:109:      res = await fetch(url, init);
frontend/src\lib\api.ts:151:export function apiPost<T>(path: string, body?: unknown): Promise<T> {
frontend/src\lib\api.ts:155:export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
frontend/src\lib\api.ts:159:export function apiDelete<T = null>(path: string): Promise<T> {
frontend/src\lib\api.ts:163:export function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
frontend/src\lib\api.ts:167:export function apiUploadImage(file: File): Promise<{ url: string }> {
frontend/src\lib\api.ts:173:export function apiUploadImages(files: File[]): Promise<{ urls: string[] }> {
frontend/src\components\layout\Footer.tsx:32:      await apiPost('/newsletter', { email });
frontend/src\pages\Auth.tsx:47:      const response = await apiPost<Challenge>('/auth/customer-code', { fullName: name, email: address, phone: mobile, website });
frontend/src\admin\pages\destinations\List.tsx:35:      await apiPatch(`/destinations/${d._id}`, { status: next });
frontend/src\admin\pages\destinations\List.tsx:37:      refetch();
frontend/src\admin\pages\destinations\List.tsx:51:          await apiDelete(`/destinations/${d._id}`);
frontend/src\admin\pages\destinations\List.tsx:53:          refetch();
frontend/src\pages\ContactUs.tsx:77:      await apiPost('/contact', form);
frontend/src\admin\pages\destinations\Form.tsx:133:        await apiPatch(`/destinations/${id}`, payload);
frontend/src\admin\pages\destinations\Form.tsx:136:        await apiPost('/destinations', payload);
frontend/src\admin\pages\destinations\Form.tsx:150:      const doc = await apiPost<DestinationDetail>(`/destinations/${id}/attractions`, emptyAttraction());
frontend/src\admin\pages\destinations\Form.tsx:161:      await apiPatch(`/destinations/${id}/attractions/${attraction._id}`, attraction);
frontend/src\admin\pages\destinations\Form.tsx:171:      await apiDelete(`/destinations/${id}/attractions/${attractionId}`);
frontend/src\admin\pages\packages\List.tsx:26:      await apiPatch(`/packages/${pkg._id}`, { status: next });
frontend/src\admin\pages\packages\List.tsx:28:      refetch();
frontend/src\admin\pages\packages\List.tsx:42:          await apiDelete(`/packages/${pkg._id}`);
frontend/src\admin\pages\packages\List.tsx:44:          refetch();
frontend/src\admin\pages\hotels\Form.tsx:196:        await apiPatch(`/hotels/${id}`, payload);
frontend/src\admin\pages\hotels\Form.tsx:199:        await apiPost('/hotels', payload);
frontend/src\admin\pages\packages\Form.tsx:224:        await apiPatch(`/packages/${id}`, payload);
frontend/src\admin\pages\packages\Form.tsx:227:        await apiPost('/packages', payload);
frontend/src\admin\pages\hotels\List.tsx:35:      await apiPatch(`/hotels/${h._id}`, { status: next });
frontend/src\admin\pages\hotels\List.tsx:37:      refetch();
frontend/src\admin\pages\hotels\List.tsx:51:          await apiDelete(`/hotels/${h._id}`);
frontend/src\admin\pages\hotels\List.tsx:53:          refetch();
frontend/src\pages\Profile.tsx:61:      await apiPatch('/customers/me', profile);
frontend/src\admin\pages\custom-requests\New.tsx:128:      const result = await apiPost<{ _id: string }>('/custom-tours/admin/create', payload);
frontend/src\pages\MyTours.tsx:218:      const { payment, whatsappLink: link } = await apiPost<{ payment: { _id: string }; whatsappLink?: string }>('/payments', {
frontend/src\pages\MyTours.tsx:230:        await apiPostForm(`/payments/${payment._id}/receipt`, formData);
frontend/src\pages\MyTours.tsx:329:      await apiPost('/reviews', { booking: booking._id, tourPackage: booking.tourPackage?._id, rating, title, text, country });
frontend/src\pages\MyTours.tsx:500:      await apiPatch(`/custom-tours/${selected._id}/accept`);
frontend/src\pages\MyTours.tsx:502:      refetch();
frontend/src\pages\MyTours.tsx:514:      await apiPatch(`/custom-tours/${selected._id}/request-changes`, { note });
frontend/src\pages\MyTours.tsx:518:      refetch();
frontend/src\pages\MyTours.tsx:530:      await apiPatch(`/custom-tours/${selected._id}/reject`);
frontend/src\pages\MyTours.tsx:532:      refetch();
frontend/src\admin\pages\vehicles\List.tsx:39:      await apiPatch(`/vehicles/${v._id}`, { status: next });
frontend/src\admin\pages\vehicles\List.tsx:41:      refetch();
frontend/src\admin\pages\vehicles\List.tsx:55:          await apiDelete(`/vehicles/${v._id}`);
frontend/src\admin\pages\vehicles\List.tsx:57:          refetch();
frontend/src\admin\pages\custom-requests\List.tsx:57:      await apiPatch(`/custom-tours/${id}/assign`, {});
frontend/src\admin\pages\custom-requests\List.tsx:59:      refetch();
frontend/src\admin\pages\vehicles\Form.tsx:62:        await apiPatch(`/vehicles/${id}`, payload);
frontend/src\admin\pages\vehicles\Form.tsx:65:        await apiPost('/vehicles', payload);
frontend/src\admin\pages\transfers\List.tsx:42:      await apiPatch(`/transfers/${t._id}`, { status: next });
frontend/src\admin\pages\transfers\List.tsx:44:      refetch();
frontend/src\admin\pages\transfers\List.tsx:58:          await apiDelete(`/transfers/${t._id}`);
frontend/src\admin\pages\transfers\List.tsx:60:          refetch();
frontend/src\components\notifications\NotificationsPanel.tsx:34:    await apiPatch(`/notifications/${id}/read`).catch(() => {});
frontend/src\components\notifications\NotificationsPanel.tsx:39:    await apiPatch('/notifications/read-all').catch(() => {});
frontend/src\admin\pages\custom-requests\Detail.tsx:1063:      await apiPatch(`/custom-tours/${id}/assign`, {});
frontend/src\admin\pages\custom-requests\Detail.tsx:1076:      await apiPatch(`/custom-tours/${id}/priority`, { priority: value });
frontend/src\admin\pages\custom-requests\Detail.tsx:1108:      await apiPatch(`/custom-tours/${id}/travel-dates`, { startDate: draftStartDate, endDate: draftEndDate });
frontend/src\admin\pages\custom-requests\Detail.tsx:1123:      await apiPost(`/custom-tours/${id}/cannot-modify`, { note: cannotModifyNote });
frontend/src\admin\pages\custom-requests\Detail.tsx:1179:      await apiPost(`/custom-tours/${id}/itinerary`, buildItineraryPayload());
frontend/src\admin\pages\custom-requests\Detail.tsx:1208:      await apiPost(`/custom-tours/${id}/itinerary/draft`, buildItineraryPayload());
frontend/src\admin\pages\custom-requests\Detail.tsx:1227:      await apiPost(`/custom-tours/${id}/itinerary/draft`, buildItineraryPayload());
frontend/src\admin\pages\profile\Profile.tsx:45:      await apiPatch('/admins/me', { fullName, phone });
frontend/src\admin\pages\profile\Profile.tsx:63:      await apiPatch('/auth/update-password', { currentPassword, newPassword });
frontend/src\admin\pages\tour-guides\List.tsx:35:      await apiPatch(`/tour-guides/${g._id}`, { status: next });
frontend/src\admin\pages\tour-guides\List.tsx:37:      refetch();
frontend/src\admin\pages\tour-guides\List.tsx:51:          await apiDelete(`/tour-guides/${g._id}`);
frontend/src\admin\pages\tour-guides\List.tsx:53:          refetch();
frontend/src\admin\pages\reviews\List.tsx:43:      await apiPatch(`/reviews/${r._id}/moderate`, { status: decision });
frontend/src\admin\pages\reviews\List.tsx:45:      refetch();
frontend/src\admin\pages\reviews\List.tsx:53:      await apiPatch(`/reviews/${r._id}/featured`, { isFeatured: !r.isFeatured });
frontend/src\admin\pages\reviews\List.tsx:55:      refetch();
frontend/src\admin\pages\reviews\List.tsx:69:          await apiDelete(`/reviews/${r._id}`);
frontend/src\admin\pages\reviews\List.tsx:71:          refetch();
frontend/src\admin\pages\reviews\List.tsx:82:    try { await apiPatch(`/reviews/${r._id}/package`, { tourPackage: event.target.value }); refetch(); }
frontend/src\admin\pages\reviews\List.tsx:119:      <AddReview key={editing?._id || 'new'} packages={packages} review={editing} onSaved={() => { setEditing(undefined); toast('Review saved. Approve it to publish.'); refetch(); }} />
frontend/src\admin\pages\tour-guides\Form.tsx:66:        await apiPatch(`/tour-guides/${id}`, payload);
frontend/src\admin\pages\tour-guides\Form.tsx:69:        await apiPost('/tour-guides', payload);
frontend/src\admin\pages\transfers\Form.tsx:91:        await apiPatch(`/transfers/${id}`, payload);
frontend/src\admin\pages\transfers\Form.tsx:94:        await apiPost('/transfers', payload);
frontend/src\admin\pages\reviews\AddReview.tsx:17:      try { const data = { ...fields, rating: Number(fields.rating), tourPackage: fields.tourPackage ? Number(fields.tourPackage) : null }; if (review) await apiPatch(`/reviews/${review._id}`, data); else await apiPost('/reviews/admin', data); form.reset(); setOpen(false); onSaved(); }
frontend/src\components\reviews\GuestReviewForm.tsx:16:      await apiPost('/reviews/guest', { reviewerName: fields.get('reviewerName'), rating: Number(fields.get('rating')), text: fields.get('text'), website: fields.get('website'), ...(tourPackage ? { tourPackage: Number(tourPackage) } : {}) });
frontend/src\components\packages\CustomTourWizard.tsx:217:      await apiPost('/custom-tours', buildPreferencesPayload());
frontend/src\admin\pages\payments\List.tsx:45:          await apiPatch(`/payments/${p._id}/verify`, { status: decision });
frontend/src\admin\pages\payments\List.tsx:47:          refetch();
frontend/src\admin\pages\settings\Translations.tsx:43:      await apiPatch('/translations/pages', draft);
frontend/src\admin\pages\settings\Settings.tsx:53:      await apiPatch('/settings', { ...settings, logoUrl: logo[0] || '' });
```
