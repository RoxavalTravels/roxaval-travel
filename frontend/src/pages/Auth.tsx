import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError } from '../lib/api';
import { BackButton } from '../components/ui/BackButton';
import { Seo } from '../components/seo/Seo';
import { LocalizedHeading } from '../components/seo/LocalizedHeading';
import { COUNTRY_DIAL_CODES, isoToFlag } from '../data/countryCodes';

const inputClass = 'mt-1 w-full rounded-xl border border-forest/20 bg-white px-4 py-3 text-forest outline-none focus:border-emerald disabled:opacity-60';
type AuthField = 'fullName' | 'email' | 'phone' | 'password';
export function Auth() {
  const { t } = useTranslation('auth');
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signup, setSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('LK');
  const dialCode = COUNTRY_DIAL_CODES.find(country => country.iso2 === phoneCountry)!.dial;
  const changePhone = (value: string) => {
    const compact = value.replace(/[\s().-]/g, '');
    if (compact.startsWith('+')) {
      const country = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length).find(item => compact.startsWith(item.dial));
      if (country) {
        if (!compact.startsWith(dialCode)) setPhoneCountry(country.iso2);
        setPhone(compact.slice(country.dial.length));
        return;
      }
    }
    setPhone(value);
  };
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({});
  const name = fullName.trim().replace(/\s+/g, ' ');
  const address = email.trim().toLowerCase();
  const nationalNumber = phone.replace(/[\s().-]/g, '');
  const mobile = dialCode + nationalNumber;
  const errors: Partial<Record<AuthField, string>> = {};
  if (signup && (name.length < 2 || name.length > 100 || !/^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(name))) errors.fullName = t('codeLogin.invalidName');
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) errors.email = t('validation.emailInvalid');
  if (signup && (!/^[0-9]+$/.test(nationalNumber) || !/^\+[1-9][0-9]{6,14}$/.test(mobile))) errors.phone = t('validation.mobileInvalid');
  if (!password) errors.password = t('validation.passwordRequired');
  else if (signup && (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72 || !/\p{L}/u.test(password) || !/\p{N}/u.test(password))) errors.password = t('passwordHelp');
  const fieldProps = (field: AuthField) => ({
    'aria-invalid': Boolean(touched[field] && errors[field]),
    'aria-describedby': [touched[field] && errors[field] ? `${field}-error` : '', field === 'phone' ? 'phone-help' : field === 'password' && signup ? 'password-help' : ''].filter(Boolean).join(' ') || undefined,
  });
  const fieldError = (field: AuthField) => touched[field] && errors[field] ? <p id={`${field}-error`} aria-live="polite" className="mt-1 text-xs text-red-700">{errors[field]}</p> : null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setTouched({ fullName: true, email: true, phone: true, password: true });
    const firstInvalid = (Object.keys(errors) as AuthField[])[0];
    if (firstInvalid) {
      setError('');
      (event.currentTarget.elements.namedItem(firstInvalid) as HTMLInputElement | null)?.focus();
      return;
    }
    setBusy(true); setError('');
    try {
      const user = signup ? await register({ fullName: name, email: address, phone: mobile, password }) : await login(address, password);
      setPassword('');
      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
      const target = (from?.pathname || '/') + (from?.search || '') + (from?.hash || '');
      navigate(user.role !== 'customer' ? '/admin/dashboard' : target.startsWith('/') && !target.startsWith('//') ? target : '/', { replace: true });
    } catch (err) {
      setError(t(err instanceof ApiRequestError && err.status === 429 ? 'codeLogin.tooMany' : err instanceof ApiRequestError && err.status === 409 ? 'accountExists' : signup ? 'registrationFailed' : 'loginFailed'));
    } finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-28">
    <Seo title={t(signup ? 'createAccount' : 'welcomeBack')} description={t(signup ? 'registerSubtitle' : 'loginSubtitle')} noindex />
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift sm:p-10">
      <BackButton className="mb-5" />
      <img src="/roxaval-icon-dark.png" alt="" className="mx-auto h-12 w-12 object-contain" />
      <LocalizedHeading className="mt-4 text-center font-display text-2xl font-semibold text-forest">{t(signup ? 'createAccount' : 'welcomeBack')}</LocalizedHeading>
      <p className="mt-3 text-center text-sm text-forest/65">{t(signup ? 'registerSubtitle' : 'loginSubtitle')}</p>
      <div className="mt-5 flex gap-3">{[false, true].map(mode => <button key={String(mode)} type="button" disabled={busy} aria-pressed={signup === mode} onClick={() => { setSignup(mode); setTouched({}); setError(''); setPassword(''); setShow(false); }} className={`flex-1 rounded-full px-4 py-2 ${signup === mode ? 'bg-forest text-white' : 'bg-cream text-forest'}`}>{t(mode ? 'register' : 'login')}</button>)}</div>
      {error && <p id="auth-error" role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form noValidate onBlurCapture={event => { if (!(event.target instanceof HTMLInputElement)) return; const field = event.target.name as AuthField; if (['fullName', 'email', 'phone', 'password'].includes(field)) setTouched(previous => ({ ...previous, [field]: true })); }} onSubmit={submit} className="mt-6 space-y-4" aria-describedby={error ? 'auth-error' : undefined}>
        {signup && <label className="block text-sm">{t('fullNamePlaceholder')}<input {...fieldProps('fullName')} name="fullName" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={100} disabled={busy} className={inputClass} /></label>}
        {signup && fieldError('fullName')}
        <label className="block text-sm">{t('emailPlaceholder')}<input {...fieldProps('email')} name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} disabled={busy} className={inputClass} /></label>
        {fieldError('email')}
        {signup && <div>
          <label htmlFor="register-phone" className="block text-sm">{t('codeLogin.mobile')}</label>
          <div className="mt-1 flex gap-2">
            <select name="phoneCountry" aria-label={t('countryCode')} autoComplete="tel-country-code" value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)} disabled={busy} className="w-36 min-w-0 shrink-0 rounded-xl border border-forest/20 bg-white px-2 py-3 text-sm text-forest outline-none focus:border-emerald disabled:opacity-60">
              {COUNTRY_DIAL_CODES.map(country => <option key={country.iso2} value={country.iso2}>{isoToFlag(country.iso2)} {country.name} ({country.dial})</option>)}
            </select>
            <input id="register-phone" {...fieldProps('phone')} name="phone" type="tel" autoComplete="tel-national" placeholder="77 123 4567" value={phone} onChange={e => changePhone(e.target.value)} required maxLength={32} disabled={busy} className={`${inputClass} !mt-0 min-w-0 flex-1`} />
          </div>
          {fieldError('phone')}
          <p id="phone-help" className="mt-2 text-xs text-forest/60">{t('phoneHelp')}</p>
        </div>}
        <label className="block text-sm">{t('passwordPlaceholder')}<input {...fieldProps('password')} name="password" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required maxLength={signup ? 72 : 1024} disabled={busy} className={inputClass} /></label>
        {fieldError('password')}
        <button type="button" aria-pressed={show} onClick={() => setShow(!show)} className="text-sm text-emerald underline">{t(show ? 'hidePassword' : 'showPassword')}</button>
        {signup && <p id="password-help" className="text-xs text-forest/60">{t('passwordHelp')}</p>}
        <button disabled={busy} className="w-full rounded-full bg-gold px-6 py-3 font-semibold text-forest disabled:opacity-60">{t(busy ? 'working' : signup ? 'createAccountButton' : 'signIn')}</button>
      </form>
      <Link to="/auth/forgot-password" className="mt-5 block text-center text-sm text-emerald underline">{t('forgotPassword')}</Link>
      {!signup && <p className="mt-3 text-center text-xs text-forest/60">{t('existingCodeAccount')}</p>}
    </div>
  </main>;
}
