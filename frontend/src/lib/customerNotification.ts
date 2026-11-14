import { copy } from '../i18n';

/** Translate known system templates without altering stored records or free-form notes. */
export function customerNotification(n: { type: string; title: string; message: string }) {
  let title = copy(n.title);
  let message = copy(n.message);
  let match: RegExpMatchArray | null;
  if (n.type === 'booking_created') {
    if ((match = n.message.match(/^Your booking (\S+) for "(.+)" has been created\. Please proceed to payment\.$/s))) {
      message = copy('Your booking {{reference}} for "{{tour}}" has been created. Please proceed to payment.', { reference: match[1], tour: match[2] });
    } else if ((match = n.message.match(/^Your customized tour booking (\S+) has been created\. Please proceed to payment\.$/))) {
      message = copy('Your customized tour booking {{reference}} has been created. Please proceed to payment.', { reference: match[1] });
    } else if ((match = n.message.match(/^Your booking (\S+) has been created\.$/))) {
      message = copy('Your booking {{reference}} has been created.', { reference: match[1] });
    }
  }
  if (n.type === 'booking_confirmed' && (match = n.message.match(/^Your booking (\S+) is now "([^"]+)"\.(?: Note: ([\s\S]*))?$/))) {
    if (n.title === `Booking ${match[2]}`) title = copy('Booking: {{status}}', { status: copy(match[2]) });
    message = copy('Your booking {{reference}} is now "{{status}}".', { reference: match[1], status: copy(match[2]) });
    if (match[3]) message += ` ${copy('Note:')} ${match[3]}`;
  }
  if (n.type === 'inquiry_updated' && (match = n.message.match(/^Our travel experts have started reviewing your custom tour inquiry (\S+)\.$/))) {
    message = copy('Our travel experts have started reviewing your custom tour inquiry {{reference}}.', { reference: match[1] });
  }
  if (n.type === 'message_received' && (match = n.message.match(/^Our travel experts replied on your request (\S+): "([\s\S]*)"$/))) {
    message = copy('Our travel experts replied on your request {{reference}}: "{{message}}"', { reference: match[1], message: match[2] });
  }
  if (n.type === 'payment_verified') {
    if ((match = n.message.match(/^Your payment for booking (\S+) has been verified\. You've paid in full — your booking is confirmed!$/))) {
      message = copy('Your payment for booking {{reference}} has been verified. You have paid in full and your booking is confirmed!', { reference: match[1] });
    } else if ((match = n.message.match(/^Your payment for booking (\S+) has been verified\. Your booking is confirmed\. Remaining balance: (.+)\.$/))) {
      message = copy('Your payment for booking {{reference}} has been verified. Your booking is confirmed. Remaining balance: {{balance}}.', { reference: match[1], balance: match[2] });
    } else if ((match = n.message.match(/^Your payment for booking (\S+) could not be verified\. ([\s\S]*)$/))) {
      message = copy('Your payment for booking {{reference}} could not be verified.', { reference: match[1] }) + (match[2] ? ` ${match[2]}` : '');
    }
  }
  if (n.type === 'welcome' && (match = n.title.match(/^Welcome to (.+), (.+)!$/))) {
    title = copy('Welcome to {{company}}, {{name}}!', { company: match[1], name: match[2] });
  }
  if (n.type === 'document_ready' && (match = n.message.match(/^A new document \((\w+)\) is ready to download\.$/))) {
    const labels: Record<string, string> = { itinerary: 'Itinerary', hotel_voucher: 'Hotel Voucher', booking_confirmation: 'Booking Confirmation', invoice: 'Invoice', payment_receipt: 'Payment Receipt', quotation: 'Quotation' };
    message = copy('A new document ({{document}}) is ready to download.', { document: copy(labels[match[1]] || match[1]) });
  }
  return { title, message };
}
