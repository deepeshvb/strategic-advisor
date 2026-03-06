import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  Database,
  Shield,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Building2,
  Copy,
  Send,
  Plane,
  MapPin,
  CreditCard,
  UtensilsCrossed,
  Calendar,
  Bell,
  LayoutDashboard
} from 'lucide-react';
import { LobsterBackground } from './LobsterBackground';

interface Config {
  ceo: {
    phoneNumber: string;
    whatsappNumber: string;
    email: string;
  };
  monitoring: {
    intervalMinutes: number;
    alertOnlyUrgent: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  briefings: {
    morningTime: string;
    eveningTime: string;
    voiceMorning?: boolean;
    voiceEvening?: boolean;
    emailMorning?: boolean;
    emailEvening?: boolean;
    frequency?: 'daily' | 'weekdays' | 'off';
    meetingPrepEnabled?: boolean;
    meetingPrepTimezone?: string;
    meetingTranscriptionEnabled?: boolean;
    meetingTranscriptionHoursLookback?: number;
  };
  twilio: {
    phoneNumber: string;
    whatsappEnabled: boolean;
  };
  llm: {
    strategy: string;
    cloudModel: string;
    localModel: string;
  };
  travelAgent?: {
    enabled: boolean;
    currency: string;
    stripePublishableKey: string;
    preferredBookingSites: string;
    preferredReservationPlatforms?: string;
    monitoringEnabled?: boolean;
    alertCadenceMinutes?: number;
    monitoringCities?: string;
    reminderCallsEnabled?: boolean;
    preferredClassOfTravel?: string;
    preferredAirlines?: string;
    maxStops?: string | number;
  };
}

interface AuthorizedNumber {
  id: string;
  phoneNumber: string;
  name: string;
  role: string;
  alertLevel: string;
  active: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  configured: boolean;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  channels: Channel[];
}

function CopyToClipboardButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm bg-gray-600 hover:bg-gray-500 text-gray-200 border border-gray-500"
    >
      <Copy size={14} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

const TRAVEL_CLASS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'Economy', label: 'Economy' },
  { value: 'Premium Economy', label: 'Premium Economy' },
  { value: 'Business', label: 'Business' },
  { value: 'First', label: 'First' },
];

const MAX_STOPS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '0', label: 'Nonstop only' },
  { value: '1', label: '1 stop or fewer' },
  { value: '2', label: '2 stops or fewer' },
];

const BOOKING_SCOPE_OPTIONS = [
  { value: 'flights_only', label: 'Flights only' },
  { value: 'hotel_only', label: 'Hotel only' },
  { value: 'flights_hotel', label: 'Flights + hotel' },
  { value: 'flights_hotel_restaurants', label: 'Flights + hotel + restaurants' },
  { value: 'full', label: 'Full (all)' },
  { value: 'restaurants_only', label: 'Restaurants only' },
];

const PREFERRED_FLIGHT_TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const SEAT_PREFERENCE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'window', label: 'Window' },
  { value: 'aisle', label: 'Aisle' },
  { value: 'front of cabin', label: 'Front of cabin' },
  { value: 'exit row', label: 'Exit row' },
  { value: 'bulkhead', label: 'Bulkhead' },
];

function TravelPlanForm({
  currency,
  enabled,
  defaultPreferredClass = '',
  defaultPreferredAirlines = '',
  defaultMaxStops = '',
}: {
  currency: string;
  enabled: boolean;
  defaultPreferredClass?: string;
  defaultPreferredAirlines?: string;
  defaultMaxStops?: string;
}) {
  const [tripMode, setTripMode] = useState<'single' | 'multi'>('single');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [multiDestinationPlan, setMultiDestinationPlan] = useState('');
  const [multiDestinationOrigin, setMultiDestinationOrigin] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [budget, setBudget] = useState('');
  const [preferredClass, setPreferredClass] = useState(defaultPreferredClass);
  const [seatPreference, setSeatPreference] = useState('');
  const [preferredAirlines, setPreferredAirlines] = useState(defaultPreferredAirlines);
  const [maxStops, setMaxStops] = useState(defaultMaxStops);
  const [tripType, setTripType] = useState<'one-way' | 'return'>('return');
  const [preferredFlightTime, setPreferredFlightTime] = useState('');
  const [flightsOnly, setFlightsOnly] = useState(false);
  const [includePointsUpgradeOptions, setIncludePointsUpgradeOptions] = useState(true);
  const [emailPlan, setEmailPlan] = useState(true);
  const [whatsAppPlan, setWhatsAppPlan] = useState(true);
  const [additionalEmailsStr, setAdditionalEmailsStr] = useState('');
  const [additionalWhatsAppStr, setAdditionalWhatsAppStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{ planId: string; plan: string; origin: string | null; destination: string; multiDestination?: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paymentToken, setPaymentToken] = useState('');
  const [bookResult, setBookResult] = useState<string | null>(null);
  const [callingWithPlan, setCallingWithPlan] = useState(false);
  const [callResult, setCallResult] = useState<string | null>(null);
  const [selectedDaysForRestaurants, setSelectedDaysForRestaurants] = useState<number[]>([]);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [restaurantReservationsLoading, setRestaurantReservationsLoading] = useState(false);
  const [restaurantReservationsResult, setRestaurantReservationsResult] = useState<Array<{ day: number; restaurantName: string; city: string; date: string; bookingInfo: string }> | null>(null);
  const [addRemindersForRestaurants, setAddRemindersForRestaurants] = useState(true);
  const [bookingScope, setBookingScope] = useState<string>('flights_hotel_restaurants');
  const [recordConfirmLoading, setRecordConfirmLoading] = useState(false);
  const [recordConfirmResult, setRecordConfirmResult] = useState<string | null>(null);
  const [confirmationsList, setConfirmationsList] = useState<Array<{ id: string; scope: string; confirmedVia: string; from?: string; at: string; status: string }>>([]);
  const [confirmationsLoading, setConfirmationsLoading] = useState(false);

  const requestPlan = async () => {
    const isMulti = tripMode === 'multi';
    const multiPlanTrimmed = multiDestinationPlan.trim();
    if (!isMulti && !destination.trim()) return;
    if (isMulti && !multiPlanTrimmed) return;
    const originVal = origin.trim();
    const multiOriginVal = multiDestinationOrigin.trim();
    setLoading(true);
    setPlan(null);
    setBookResult(null);
    setRestaurantReservationsResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      const res = await fetch('/api/travel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: isMulti ? undefined : (originVal || undefined),
          destination: isMulti ? undefined : destination.trim(),
          multiDestinationPlan: isMulti ? multiPlanTrimmed : undefined,
          multiDestinationOrigin: isMulti ? (multiOriginVal || undefined) : undefined,
          tripNotes: tripNotes.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          travelers,
          budget: budget || undefined,
          currency,
          preferredClass: preferredClass || undefined,
          seatPreference: seatPreference.trim() || undefined,
          preferredAirlines: preferredAirlines.trim() || undefined,
          maxStops: maxStops === '' ? undefined : (maxStops === '0' ? 0 : parseInt(String(maxStops), 10)),
          tripType: isMulti ? undefined : tripType,
          preferredFlightTime: preferredFlightTime || undefined,
          flightsOnly: flightsOnly,
          includePointsUpgradeOptions: includePointsUpgradeOptions,
          emailPlan,
          whatsAppPlan,
          additionalEmails: additionalEmailsStr.split(/[\n,]/).map((e) => e.trim()).filter(Boolean),
          additionalWhatsAppNumbers: additionalWhatsAppStr.split(/[\n,]/).map((n) => n.trim().replace(/^\+/, '')).filter((n) => n.replace(/\D/g, '').length >= 10),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.success) {
        setPlan({ planId: data.planId, plan: data.plan, origin: data.origin ?? null, destination: data.destination, multiDestination: data.multiDestination });
      } else {
        const errDest = isMulti ? `Multi-city (${multiPlanTrimmed.split(/[\n,]+/).filter((s) => s.trim()).length} stops)` : destination.trim();
        setPlan({ planId: '', plan: data.error || 'Request failed', origin: isMulti ? (multiOriginVal || null) : (originVal || null), destination: errDest, multiDestination: isMulti });
      }
    } catch (e) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      const msg = isAbort
        ? 'Request took a while. If you chose Email or WhatsApp delivery, check your inbox and WhatsApp—the plan may have been sent. Try refreshing or ask again.'
        : (e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?';
      const routeLabel = isMulti ? `Multi-city (${multiPlanTrimmed.split(/[\n,]+/).filter((s) => s.trim()).length} stops)` : destination.trim();
      setPlan({ planId: '', plan: msg, origin: isMulti ? (multiOriginVal || null) : (originVal || null), destination: routeLabel, multiDestination: isMulti });
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!plan?.planId) return;
    setConfirming(true);
    setBookResult(null);
    try {
      const res = await fetch('/api/travel/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.planId,
          confirmation: true,
          paymentMethodId: paymentToken.trim() || undefined,
          scope: bookingScope,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookResult(data.message || 'Booking confirmed. Payment method stored securely.');
      } else {
        setBookResult(data.error || 'Booking failed');
      }
    } catch (e) {
      setBookResult((e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?');
    } finally {
      setConfirming(false);
    }
  };

  const recordConfirmationOnly = async () => {
    if (!plan?.planId) return;
    setRecordConfirmLoading(true);
    setRecordConfirmResult(null);
    try {
      const res = await fetch('/api/travel/booking-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.planId, scope: bookingScope }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecordConfirmResult(data.message || 'Confirmation recorded.');
        fetchConfirmations();
      } else {
        setRecordConfirmResult(data.error || 'Failed');
      }
    } catch (e) {
      setRecordConfirmResult((e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?');
    } finally {
      setRecordConfirmLoading(false);
    }
  };

  const fetchConfirmations = async () => {
    setConfirmationsLoading(true);
    try {
      const res = await fetch('/api/travel/booking-confirmations');
      const data = await res.json();
      if (data.ok && Array.isArray(data.confirmations)) setConfirmationsList(data.confirmations);
    } catch (_) {
      setConfirmationsList([]);
    } finally {
      setConfirmationsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!enabled && (
        <p className="text-amber-400 text-sm">Enable Henry above and save, then try again.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="config-label">Trip type</label>
          <select
            value={tripMode}
            onChange={(e) => setTripMode(e.target.value as 'single' | 'multi')}
            className="config-input max-w-xs"
            disabled={!enabled}
          >
            <option value="single">Single destination (one city or country)</option>
            <option value="multi">Multi-city / multi-country (e.g. 7 countries in 2 weeks)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Multi-city: Henry will suggest the best route and most economical options between stops.</p>
        </div>
        {tripMode === 'single' && (
          <>
            <div>
              <label className="config-label">From (origin)</label>
              <input
                type="text"
                placeholder="e.g. New York, London, EWR"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="config-input"
                disabled={!enabled}
              />
            </div>
            <div>
              <label className="config-label">To (destination) *</label>
              <input
                type="text"
                placeholder="e.g. Paris, Tokyo, Hyderabad"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="config-input"
                disabled={!enabled}
              />
            </div>
          </>
        )}
        {tripMode === 'multi' && (
          <>
            <div className="md:col-span-2">
              <label className="config-label">Cities and countries with dates *</label>
              <textarea
                rows={5}
                placeholder={'First line = first port of entry. List in order of travel. Add dates when you have them.\nExamples:\nLisbon, Portugal - Jun 1-3\nPorto - Jun 4-5\nMadrid, Spain - Jun 6-9\nOr: London, Amsterdam, Berlin, Prague - June 1-14'}
                value={multiDestinationPlan}
                onChange={(e) => setMultiDestinationPlan(e.target.value)}
                className="config-input font-mono text-sm"
                disabled={!enabled}
              />
              <p className="text-xs text-gray-500 mt-1">First line = first port of entry. List in order of travel. Use &quot;Trip notes&quot; below for extra hints (things to do, places to see).</p>
            </div>
            <div>
              <label className="config-label">Starting from (origin city, optional)</label>
              <input
                type="text"
                placeholder="e.g. New York, London"
                value={multiDestinationOrigin}
                onChange={(e) => setMultiDestinationOrigin(e.target.value)}
                className="config-input"
                disabled={!enabled}
              />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="config-label">Trip notes or guidance (optional)</label>
          <textarea
            rows={3}
            placeholder="e.g. First port of entry is Lisbon. Want to see Sintra, Douro Valley, and coastal towns. Include a food tour. Prefer morning flights. Must-see: Pena Palace, Livraria Lello."
            value={tripNotes}
            onChange={(e) => setTripNotes(e.target.value)}
            className="config-input text-sm"
            disabled={!enabled}
          />
          <p className="text-xs text-gray-500 mt-1">Hints for Henry: things to do, places you plan to see, which city is first port of entry, order of stops, or any other guidance. For multi-city, you can also specify order in the list above.</p>
        </div>
        <div>
          <label className="config-label">Travelers</label>
          <input
            type="number"
            min={1}
            value={travelers}
            onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
            className="config-input max-w-xs"
            disabled={!enabled}
          />
        </div>
        <div>
          <label className="config-label">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          />
        </div>
        <div>
          <label className="config-label">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          />
        </div>
        <div>
          <label className="config-label">Budget ({currency})</label>
          <input
            type="text"
            placeholder="e.g. 3000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          />
        </div>
        <div>
          <label className="config-label">Preferred class of travel</label>
          <select
            value={preferredClass}
            onChange={(e) => setPreferredClass(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          >
            {TRAVEL_CLASS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="config-label">Seat preference</label>
          <select
            value={seatPreference}
            onChange={(e) => setSeatPreference(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          >
            {SEAT_PREFERENCE_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-0.5">Plan will include seat selection and baggage for your fare class.</p>
        </div>
        <div>
          <label className="config-label">Preferred airlines</label>
          <input
            type="text"
            placeholder="e.g. United, Delta, American"
            value={preferredAirlines}
            onChange={(e) => setPreferredAirlines(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          />
        </div>
        <div>
          <label className="config-label">Number of stops</label>
          <select
            value={maxStops}
            onChange={(e) => setMaxStops(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          >
            {MAX_STOPS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {tripMode === 'single' && (
          <div>
            <label className="config-label">One-way or return</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as 'one-way' | 'return')}
              className="config-input max-w-xs"
              disabled={!enabled}
            >
              <option value="one-way">One-way</option>
              <option value="return">Return (round-trip)</option>
            </select>
          </div>
        )}
        <div>
          <label className="config-label">Preferred flight time</label>
          <select
            value={preferredFlightTime}
            onChange={(e) => setPreferredFlightTime(e.target.value)}
            className="config-input max-w-xs"
            disabled={!enabled}
          >
            {PREFERRED_FLIGHT_TIME_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-0.5">Henry will prioritize options in this window (e.g. morning ≈ 05:00–12:00).</p>
        </div>
        <div className="flex flex-col gap-0.5 md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={flightsOnly}
              onChange={(e) => setFlightsOnly(e.target.checked)}
              disabled={!enabled}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500"
            />
            <span>Flights only (no day-by-day itinerary)</span>
          </label>
          <p className="text-xs text-gray-500 pl-6">Plan will show flight options with timings and cost only; no daily schedule, hotels, or restaurant suggestions.</p>
        </div>
        <div className="flex flex-col gap-0.5 md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includePointsUpgradeOptions}
              onChange={(e) => setIncludePointsUpgradeOptions(e.target.checked)}
              disabled={!enabled}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500"
            />
            <span>Include points / miles upgrade options</span>
          </label>
          <p className="text-xs text-gray-500 pl-6">Plan will display upgrade paths (Economy → Premium Economy, Economy → Business, Premium Economy → Business, Business → First) with typical points/miles ranges and best programs (e.g. Chase, Amex, airline miles) for your route.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={emailPlan}
              onChange={(e) => setEmailPlan(e.target.checked)}
              disabled={!enabled}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500"
            />
            Email me the plan
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={whatsAppPlan}
              onChange={(e) => setWhatsAppPlan(e.target.checked)}
              disabled={!enabled}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500"
            />
            WhatsApp me the plan
          </label>
          <span className="text-xs text-gray-500">(uses Config → General contact)</span>
        </div>
        <p className="text-xs text-gray-500 md:col-span-2">If WhatsApp doesn’t arrive, check Config → General: use E.164 number (e.g. +1234567890) and join the Twilio WhatsApp sandbox if prompted.</p>
        <div className="md:col-span-2 space-y-2">
          <label className="config-label">Also send plan to (optional)</label>
          <input
            type="text"
            placeholder="Additional emails (comma-separated)"
            value={additionalEmailsStr}
            onChange={(e) => setAdditionalEmailsStr(e.target.value)}
            disabled={!enabled}
            className="config-input w-full"
          />
          <input
            type="text"
            placeholder="Additional WhatsApp numbers (comma-separated, e.g. +1234567890)"
            value={additionalWhatsAppStr}
            onChange={(e) => setAdditionalWhatsAppStr(e.target.value)}
            disabled={!enabled}
            className="config-input w-full"
          />
          <p className="text-xs text-gray-500">
            Recipients will receive the same plan by email or WhatsApp. <strong>Email:</strong> no sign-up or opt-in required — we send to the address and they receive it in their inbox. <strong>WhatsApp:</strong> use E.164 (e.g. +12345678900). With Twilio&apos;s Sandbox, only numbers that have joined the sandbox can receive; to send to anyone without them opting in, use a production WhatsApp Business API number —{' '}
            <a href="https://www.twilio.com/docs/whatsapp/getting-started" target="_blank" rel="noopener noreferrer" className="text-lobster-400 hover:underline">Twilio: WhatsApp getting started</a>
            {' '}(production).
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={requestPlan}
        disabled={!enabled || (tripMode === 'single' ? !destination.trim() : !multiDestinationPlan.trim()) || loading}
        className="btn-primary"
      >
        {loading ? 'Asking Henry… (can take 1–2 min)' : 'Ask Henry for a plan'}
      </button>
      {loading && (
        <p className="text-sm text-gray-500">Building your plan and, if selected, sending to email/WhatsApp. Please wait.</p>
      )}

      {plan && (
        <div className="mt-6 p-4 rounded-xl bg-gray-800 border border-gray-600">
          <h4 className="font-semibold text-gray-200 mb-2">Plan: {plan.origin ? `${plan.origin} → ${plan.destination}` : plan.destination}</h4>
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap font-sans">{plan.plan}</div>
          <div className="mt-4 pt-4 border-t border-gray-600 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={async () => {
                if (!plan.plan || !plan.destination) return;
                setCallingWithPlan(true);
                setCallResult(null);
                try {
                  const res = await fetch('/api/henry/call-with-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: plan.plan, destination: plan.destination, planId: plan.planId }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) setCallResult(data.message || 'Henry is calling you.');
                  else setCallResult(data.error || 'Call failed.');
                } catch (e) {
                  setCallResult((e instanceof Error ? e.message : 'Request failed') + '. Twilio configured?');
                } finally {
                  setCallingWithPlan(false);
                  setTimeout(() => setCallResult(null), 5000);
                }
              }}
              disabled={callingWithPlan}
              className="btn-secondary"
            >
              <Phone size={18} className="inline mr-2" />
              {callingWithPlan ? 'Calling…' : 'Call me with this plan'}
            </button>
            {callResult && <span className="text-sm text-gray-400">{callResult}</span>}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-600">
            <h4 className="font-medium text-gray-200 mb-2">Book restaurants from this plan</h4>
            <p className="text-sm text-gray-400 mb-3">Choose which days you want reservation links for (plan includes 1–2 suggestions per day).</p>
            {(() => {
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              const tripDays = start && end && end >= start ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1) : 14;
              const days = Array.from({ length: tripDays }, (_, i) => i + 1);
              const count = selectedDaysForRestaurants.length;
              return (
                <>
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowDaySelector((v) => !v)}
                      className="text-sm font-medium text-lobster-400 hover:text-lobster-300 flex items-center gap-2"
                    >
                      {showDaySelector ? 'Hide days' : count > 0 ? `${count} day${count === 1 ? '' : 's'} selected` : 'Select days'}
                    </button>
                    {showDaySelector && (
                      <div className="mt-2 p-3 rounded-lg bg-gray-800/80 border border-gray-600 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5">
                          {days.map((d) => (
                            <label key={d} className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedDaysForRestaurants.includes(d)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDaysForRestaurants((prev) => [...prev, d].sort((a, b) => a - b));
                                  else setSelectedDaysForRestaurants((prev) => prev.filter((x) => x !== d));
                                }}
                                className="rounded border-gray-500 bg-gray-600 text-lobster-500"
                              />
                              Day {d}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <input type="checkbox" checked={addRemindersForRestaurants} onChange={(e) => setAddRemindersForRestaurants(e.target.checked)} className="rounded border-gray-500 bg-gray-600 text-lobster-500" />
                    Add reminders (Henry will call before each reservation)
                  </label>
                  <br />
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedDaysForRestaurants.length === 0) return;
                      setRestaurantReservationsLoading(true);
                      setRestaurantReservationsResult(null);
                      try {
                        const res = await fetch('/api/travel/plan/restaurant-reservations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            plan: plan.plan,
                            destination: plan.destination,
                            startDate: startDate || undefined,
                            selectedDays: selectedDaysForRestaurants,
                            addReminders: addRemindersForRestaurants,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success && data.results) setRestaurantReservationsResult(data.results);
                        else setRestaurantReservationsResult([{ day: 0, restaurantName: data.error || 'Request failed', city: '', date: '', bookingInfo: '' }]);
                      } catch (e) {
                        setRestaurantReservationsResult([{ day: 0, restaurantName: (e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?', city: '', date: '', bookingInfo: '' }]);
                      } finally {
                        setRestaurantReservationsLoading(false);
                      }
                    }}
                    disabled={selectedDaysForRestaurants.length === 0 || restaurantReservationsLoading}
                    className="btn-secondary mt-2"
                  >
                    {restaurantReservationsLoading ? 'Getting links…' : 'Get booking links for selected days'}
                  </button>
                  {restaurantReservationsResult && restaurantReservationsResult.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {restaurantReservationsResult.map((r, i) => (
                        <div key={i} className="p-3 rounded-lg bg-gray-800 border border-gray-600">
                          {r.day > 0 && <span className="text-sm font-medium text-gray-200">Day {r.day}: {r.restaurantName}</span>}
                          {r.day === 0 && <span className="text-sm text-red-400">{r.restaurantName}</span>}
                          {r.city && <span className="text-gray-500 ml-1">({r.city})</span>}
                          {r.date && <span className="text-gray-500 ml-1">— {r.date}</span>}
                          {r.bookingInfo && <div className="mt-2 text-sm text-gray-300 whitespace-pre-wrap">{r.bookingInfo}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {plan.planId && (
            <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
              <h4 className="font-medium text-gray-200 mb-2">Confirm booking</h4>
              <p className="text-sm text-gray-400 mb-2">You can confirm via this UI or by replying to the plan email/WhatsApp with e.g. &quot;Confirm - flights only&quot; or &quot;Confirm - full&quot;.</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <label className="config-label mb-0">What to book:</label>
                <select
                  value={bookingScope}
                  onChange={(e) => setBookingScope(e.target.value)}
                  className="config-input max-w-xs"
                >
                  {BOOKING_SCOPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={recordConfirmationOnly}
                  disabled={recordConfirmLoading}
                  className="btn-secondary"
                >
                  {recordConfirmLoading ? 'Recording…' : 'Record confirmation only'}
                </button>
                {recordConfirmResult && <span className="text-sm text-gray-400">{recordConfirmResult}</span>}
              </div>
              <label className="config-label">Payment method token (optional — from Stripe Elements)</label>
              <input
                type="password"
                placeholder="pm_... (Stripe token); leave empty to confirm without card"
                value={paymentToken}
                onChange={(e) => setPaymentToken(e.target.value)}
                className="config-input w-full max-w-md"
              />
              <button
                type="button"
                onClick={confirmBooking}
                disabled={confirming}
                className="btn-amber"
              >
                <CreditCard size={18} className="inline mr-2" />
                {confirming ? 'Confirming…' : 'Confirm & store payment for booking'}
              </button>
              {bookResult && <p className="text-sm text-gray-400">{bookResult}</p>}
            </div>
          )}
        </div>
      )}

      {enabled && (
        <div className="mt-6 p-4 rounded-xl bg-gray-800 border border-gray-600">
          <h4 className="font-medium text-gray-200 mb-2">Recent booking confirmations</h4>
          <p className="text-sm text-gray-400 mb-2">Confirmations received via email, WhatsApp, or this UI. Use the links in your plan to complete bookings.</p>
          <button
            type="button"
            onClick={fetchConfirmations}
            disabled={confirmationsLoading}
            className="btn-secondary text-sm mb-3"
          >
            {confirmationsLoading ? 'Loading…' : 'Refresh list'}
          </button>
          {confirmationsList.length === 0 && !confirmationsLoading && (
            <p className="text-sm text-gray-500">No confirmations yet. Reply to a plan with e.g. &quot;Confirm - flights only&quot; or use &quot;Record confirmation only&quot; above.</p>
          )}
          {confirmationsList.length > 0 && (
            <ul className="space-y-2 text-sm">
              {confirmationsList.slice(-15).reverse().map((c) => (
                <li key={c.id} className="flex flex-wrap gap-x-3 gap-y-1 text-gray-300">
                  <span className="font-medium text-lobster-300">{c.scope.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">via {c.confirmedVia}</span>
                  {c.from && <span className="text-gray-500 truncate max-w-[200px]">{c.from}</span>}
                  <span className="text-gray-500">{new Date(c.at).toLocaleString()}</span>
                  <span className="text-gray-500">({c.status})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function HenryRestaurantAndReminders({ enabled }: { enabled: boolean }) {
  const [city, setCity] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [date, setDate] = useState('');
  const [partySize, setPartySize] = useState('');
  const [budget, setBudget] = useState('');
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [resRestaurant, setResRestaurant] = useState('');
  const [resCity, setResCity] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resPartySize, setResPartySize] = useState('');
  const [resAddReminder, setResAddReminder] = useState(true);
  const [resLoading, setResLoading] = useState(false);
  const [resBookingInfo, setResBookingInfo] = useState<string | null>(null);
  const [resReminderAdded, setResReminderAdded] = useState(false);
  const [reminders, setReminders] = useState<{ upcoming: Array<{ id: string; type: string; title: string; at: string; reminderAt?: string }>; past: Array<{ id: string; type: string; title: string; at: string }> }>({ upcoming: [], past: [] });
  const [remindersLoading, setRemindersLoading] = useState(false);

  const fetchReminders = async () => {
    setRemindersLoading(true);
    try {
      const res = await fetch('/api/henry/reminders');
      const data = await res.json();
      if (res.ok && data.success) setReminders({ upcoming: data.upcoming || [], past: data.past || [] });
    } finally {
      setRemindersLoading(false);
    }
  };

  useEffect(() => { if (enabled) fetchReminders(); }, [enabled]);

  const findRestaurants = async () => {
    if (!city.trim()) return;
    setRestaurantLoading(true);
    setSuggestions(null);
    try {
      const res = await fetch('/api/travel/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim(), cuisine: cuisine.trim() || undefined, date: date || undefined, partySize: partySize || undefined, budget: budget || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) setSuggestions(data.suggestions);
      else setSuggestions(data.error || 'Request failed');
    } catch (e) {
      setSuggestions((e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?');
    } finally {
      setRestaurantLoading(false);
    }
  };

  const getReservationLinks = async () => {
    if (!resRestaurant.trim() || !resCity.trim()) return;
    setResLoading(true);
    setResBookingInfo(null);
    setResReminderAdded(false);
    try {
      const res = await fetch('/api/travel/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: resRestaurant.trim(),
          city: resCity.trim(),
          date: resDate || undefined,
          time: resTime || undefined,
          partySize: resPartySize || undefined,
          addReminder: resAddReminder && !!resDate,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResBookingInfo(data.bookingInfo);
        setResReminderAdded(!!data.reminderAdded);
        if (data.reminderAdded) fetchReminders();
      } else setResBookingInfo(data.error || 'Request failed');
    } catch (e) {
      setResBookingInfo((e instanceof Error ? e.message : 'Request failed') + '. Is the backend running?');
    } finally {
      setResLoading(false);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/henry/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) fetchReminders();
    } catch (_) {}
  };

  if (!enabled) return null;

  return (
    <>
      <section className="config-card">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-200">
          <UtensilsCrossed size={20} />
          Find restaurants & best sites to book
        </h3>
        <p className="text-sm text-gray-400 mb-4">City and optional filters. Henry returns suggestions plus OpenTable, Resy, Tock links and hard-to-get tips.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="config-label">City *</label>
            <input type="text" placeholder="e.g. New York, Paris" value={city} onChange={(e) => setCity(e.target.value)} className="config-input" />
          </div>
          <div>
            <label className="config-label">Cuisine</label>
            <input type="text" placeholder="e.g. Italian, Japanese" value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="config-input" />
          </div>
          <div>
            <label className="config-label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="config-input max-w-xs" />
          </div>
          <div>
            <label className="config-label">Party size</label>
            <input type="number" min={1} placeholder="2" value={partySize} onChange={(e) => setPartySize(e.target.value)} className="config-input max-w-xs" />
          </div>
          <div>
            <label className="config-label">Budget</label>
            <input type="text" placeholder="e.g. $$$" value={budget} onChange={(e) => setBudget(e.target.value)} className="config-input max-w-xs" />
          </div>
        </div>
        <button type="button" onClick={findRestaurants} disabled={!city.trim() || restaurantLoading} className="btn-primary mt-2">
          {restaurantLoading ? 'Searching…' : 'Find restaurants'}
        </button>
        {suggestions && (
          <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-600 prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">{suggestions}</div>
        )}
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-200">
          <UtensilsCrossed size={20} />
          Get reservation links & add reminder
        </h3>
        <p className="text-sm text-gray-400 mb-4">Restaurant + city. Henry gives booking links; optionally add a reminder so Henry calls you before the reservation.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="config-label">Restaurant name *</label>
            <input type="text" placeholder="e.g. Carbone" value={resRestaurant} onChange={(e) => setResRestaurant(e.target.value)} className="config-input" />
          </div>
          <div>
            <label className="config-label">City *</label>
            <input type="text" placeholder="e.g. NYC" value={resCity} onChange={(e) => setResCity(e.target.value)} className="config-input" />
          </div>
          <div>
            <label className="config-label">Date</label>
            <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} className="config-input max-w-xs" />
          </div>
          <div>
            <label className="config-label">Time</label>
            <input type="text" placeholder="e.g. 19:00" value={resTime} onChange={(e) => setResTime(e.target.value)} className="config-input max-w-xs" />
          </div>
          <div>
            <label className="config-label">Party size</label>
            <input type="number" min={1} placeholder="2" value={resPartySize} onChange={(e) => setResPartySize(e.target.value)} className="config-input max-w-xs" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="resAddReminder" checked={resAddReminder} onChange={(e) => setResAddReminder(e.target.checked)} className="rounded border-gray-500 bg-gray-600 text-lobster-500" />
            <label htmlFor="resAddReminder" className="text-sm">Add reminder (Henry calls before)</label>
          </div>
        </div>
        <button type="button" onClick={getReservationLinks} disabled={!resRestaurant.trim() || !resCity.trim() || resLoading} className="btn-primary mt-2">
          {resLoading ? 'Getting links…' : 'Get booking links'}
        </button>
        {resBookingInfo && (
          <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-600">
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">{resBookingInfo}</div>
            {resReminderAdded && <p className="text-sm text-green-400 mt-2">Reminder added. Henry will call you before the reservation.</p>}
          </div>
        )}
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-200">
          <Bell size={20} />
          Upcoming reminders (travel, restaurant, appointment)
        </h3>
        <p className="text-sm text-gray-400 mb-4">Henry will call you shortly before each. Remove any you don&apos;t need.</p>
        <button type="button" onClick={fetchReminders} disabled={remindersLoading} className="btn-secondary mb-4">
          {remindersLoading ? 'Loading…' : 'Refresh'}
        </button>
        <div className="space-y-3">
          {reminders.upcoming.length === 0 && reminders.past.length === 0 && !remindersLoading && <p className="text-sm text-gray-500">No reminders yet. Create a travel plan with dates or add a restaurant reservation with &quot;Add reminder&quot;.</p>}
          {reminders.upcoming.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Upcoming</h4>
              <ul className="space-y-2">
                {reminders.upcoming.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-800 border border-gray-600">
                    <span className="text-sm">
                      <Calendar size={14} className="inline mr-1" />
                      {r.type === 'travel' ? 'Trip' : r.type === 'restaurant' ? 'Restaurant' : 'Appointment'}: {r.title}
                      {r.reminderAt || r.at ? ` — ${new Date(r.reminderAt || r.at).toLocaleString()}` : ''}
                    </span>
                    <button type="button" onClick={() => deleteReminder(r.id)} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
                      <Trash2 size={14} /> Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reminders.past.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">Past</h4>
              <ul className="space-y-2">
                {reminders.past.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-800/50 border border-gray-700 text-gray-500 text-sm">
                    <span>{r.type}: {r.title} — {new Date(r.at).toLocaleString()}</span>
                    <button type="button" onClick={() => deleteReminder(r.id)} className="text-gray-500 hover:text-gray-400">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

type AdditionalMailbox = { id?: string; provider: string; adminEmail: string; appPassword: string; oauthRefreshToken?: string; imapHost?: string; imapPort?: string; imapSecure?: boolean };

export const ConfigDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState<Config | null>(null);
  const [authorizedNumbers, setAuthorizedNumbers] = useState<AuthorizedNumber[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [configureModal, setConfigureModal] = useState<{ channel: Channel; companyId: string } | null>(null);
  const [companiesConfig, setCompaniesConfig] = useState<{ companies: Array<{ id: string; name: string; domain: string; channels: Record<string, Record<string, unknown>> }> } | null>(null);
  const [channelConfigValues, setChannelConfigValues] = useState<Record<string, string | boolean | number>>({});
  const [additionalEmailsList, setAdditionalEmailsList] = useState<AdditionalMailbox[]>([]);
  const [editingMailboxIndex, setEditingMailboxIndex] = useState<number | null>(null);
  const [mailboxForm, setMailboxForm] = useState<AdditionalMailbox>({ provider: 'gmail', adminEmail: '', appPassword: '', imapSecure: true });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phoneNumber: '', role: 'User', alertLevel: 'all' });
  const [newCompany, setNewCompany] = useState({ name: '', domain: '' });
  const [testingChannels, setTestingChannels] = useState(false);
  const [channelTestResult, setChannelTestResult] = useState<Record<string, unknown> | null>(null);
  const [monitoringCounts, setMonitoringCounts] = useState<{
    companies: Array<{
      id: string;
      name: string;
      domain: string;
      userCount: number | null;
      monitoredUserCount: number | null;
      teamsCount: number | null;
      channelsCount: number | null;
      hasMoreUsers?: boolean;
      error: string | null;
    }>;
    timestamp?: string;
  } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [callingNow, setCallingNow] = useState(false);
  const [restartingBackend, setRestartingBackend] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [sendingBriefingTest, setSendingBriefingTest] = useState(false);
  const [briefingTestResult, setBriefingTestResult] = useState<{ success?: boolean; message?: string; email?: boolean; whatsapp?: boolean; error?: string; emailTo?: string; whatsappTo?: string } | null>(null);
  const [sendingMeetingPrep, setSendingMeetingPrep] = useState(false);
  const [meetingPrepResult, setMeetingPrepResult] = useState<{ success?: boolean; message?: string; meetingsCount?: number; email?: boolean; whatsapp?: boolean; whatsappError?: string | null; error?: string } | null>(null);
  const [sendingTranscription, setSendingTranscription] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<{ success?: boolean; message?: string; processed?: number; sent?: number; error?: string } | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; modelLoaded?: boolean; configuredModel?: string; error?: string } | null>(null);
  /** True when config/companies could not be loaded (backend down or timeout) — avoid saving and overwriting good data */
  const [configLoadFailed, setConfigLoadFailed] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Handle return from Gmail OAuth: show message and refresh config
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailError = params.get('gmail_error');
    const gmailConnected = params.get('gmail_connected');
    const email = params.get('email');
    if (gmailError) {
      setMessage({ type: 'error', text: decodeURIComponent(gmailError) });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gmailConnected) {
      setMessage({ type: 'success', text: email ? `Gmail connected: ${decodeURIComponent(email)}` : 'Gmail connected successfully.' });
      loadConfig();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch Ollama status when LLM strategy uses local/hybrid (for dashboard indicator)
  useEffect(() => {
    const s = (config?.llm?.strategy || '').toLowerCase();
    if (s !== 'local' && s !== 'hybrid') {
      setOllamaStatus(null);
      return;
    }
    let cancelled = false;
    fetch('/api/ollama/status')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOllamaStatus(data);
      })
      .catch(() => {
        if (!cancelled) setOllamaStatus({ running: false, error: 'Request failed' });
      });
    return () => { cancelled = true; };
  }, [config?.llm?.strategy]);

  const LOAD_TIMEOUT_MS = 12000; // Stop waiting after 12s so UI always shows

  const loadConfig = async () => {
    const defaultConfig: Config = {
      ceo: { phoneNumber: '', whatsappNumber: '', email: '' },
      monitoring: { intervalMinutes: 15, alertOnlyUrgent: false, quietHoursEnabled: false, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      briefings: { morningTime: '08:00', eveningTime: '18:00', voiceMorning: true, voiceEvening: true, emailMorning: true, emailEvening: true, frequency: 'daily', meetingPrepEnabled: false, meetingPrepTimezone: 'Eastern Standard Time', meetingTranscriptionEnabled: false, meetingTranscriptionHoursLookback: 4 },
      twilio: { phoneNumber: '', whatsappEnabled: false },
      llm: { strategy: 'cloud', cloudModel: 'claude-sonnet-4-20250514', localModel: 'llama3.1:8b' },
      travelAgent: {
        enabled: false,
        currency: 'USD',
        stripePublishableKey: '',
        preferredBookingSites: '',
        preferredReservationPlatforms: 'OpenTable, Resy, Tock',
        monitoringEnabled: false,
        alertCadenceMinutes: 10,
        monitoringCities: '',
        reminderCallsEnabled: true,
        preferredClassOfTravel: '',
        preferredAirlines: '',
        maxStops: '',
      },
    };
    const defaultNumbers: AuthorizedNumber[] = [];
    const defaultChannels = [
      { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: false, configured: false },
      { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: false, configured: false },
      { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: false, configured: false },
      { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
      { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: false, configured: false },
      { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: false, configured: false },
    ];
    const defaultCompaniesList: Company[] = [
      { id: '1', name: 'Othain Group', domain: 'othaingroup.com', active: true, channels: JSON.parse(JSON.stringify(defaultChannels)) },
      { id: '2', name: 'OthainSoft', domain: 'othainsoft.com', active: true, channels: JSON.parse(JSON.stringify(defaultChannels)) },
      { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com', active: true, channels: JSON.parse(JSON.stringify(defaultChannels)) },
      { id: '4', name: 'Strivio LLC', domain: 'strivio.com', active: true, channels: JSON.parse(JSON.stringify(defaultChannels)) },
    ];

    try {
      setLoading(true);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Load timeout')), LOAD_TIMEOUT_MS)
      );

      try {
        const [configRes, numbersRes] = await Promise.race([
          Promise.all([
            fetch('/api/config'),
            fetch('/api/authorized-numbers'),
          ]),
          timeoutPromise,
        ]) as [Response, Response];

        if (configRes.ok && numbersRes.ok) {
          const configData = await configRes.json();
          const numbersData = await numbersRes.json();
          setConfig(configData);
          setAuthorizedNumbers(numbersData);
          setConfigLoadFailed(false);
        } else {
          setConfig(defaultConfig);
          setAuthorizedNumbers(defaultNumbers);
          setConfigLoadFailed(true);
        }
      } catch (apiError) {
        const isTimeout = apiError instanceof Error && apiError.message === 'Load timeout';
        console.warn(isTimeout ? 'Config load timed out' : 'Backend not reachable, using defaults:', apiError);
        setConfigLoadFailed(true);
        setMessage({
          type: 'error',
          text: isTimeout
            ? 'Configuration load timed out. Showing defaults. Start backend (port 3000) and refresh.'
            : 'Backend not running. Using defaults. Start backend (port 3000) and refresh to load saved config.',
        });
        setConfig(defaultConfig);
        setAuthorizedNumbers(defaultNumbers);
        setCompanies(defaultCompaniesList);
        setSelectedCompany('1');
        setCompaniesConfig({ companies: [] });
        setLoading(false);
        return;
      }

      try {
        const [companiesRes, companiesConfigRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/companies-config'),
        ]);
        let cfg: { companies: Array<{ id: string; name: string; domain: string; channels?: Record<string, unknown> }> } | null = null;
        if (companiesConfigRes.ok) {
          cfg = await companiesConfigRes.json();
          setCompaniesConfig(cfg);
        } else {
          setCompaniesConfig({ companies: [] });
        }
        // Use saved config as source of truth for monitor checkboxes so they match companies-config.json
        if (cfg?.companies?.length) {
          const built = buildCompaniesFromConfig(cfg, defaultCompaniesList);
          setCompanies(built);
          setSelectedCompany(built[0]?.id || '1');
        } else if (companiesRes.ok) {
          const companiesData: Company[] = await companiesRes.json();
          const merged = defaultCompaniesList.map((def) => {
            const fromApi = companiesData.find((c) => c.id === def.id);
            return fromApi || def;
          });
          setCompanies(merged);
          setSelectedCompany(merged[0]?.id || '1');
        } else {
          setCompanies(defaultCompaniesList);
          setSelectedCompany('1');
        }
      } catch (_) {
        setCompanies(defaultCompaniesList);
        setSelectedCompany('1');
        setCompaniesConfig({ companies: [] });
      }

      console.log('All configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage({ type: 'error', text: `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (configLoadFailed && !window.confirm('Saved config could not be loaded. Saving now may overwrite your existing settings with the values shown. Start the backend and refresh to load your saved config first. Continue saving anyway?')) {
      return;
    }
    try {
      setSaving(true);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: result.message || 'Configuration saved.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save configuration' });
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save. Is the backend running on port 3000?' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigureChannel = (channel: Channel, companyId: string) => {
    setConfigureModal({ channel, companyId });
    const company = companiesConfig?.companies?.find(c => c.id === companyId);
    const typeKey = channel.type === 'documents' ? 'sharepoint' : channel.type;
    const ch = company?.channels?.[typeKey] as Record<string, unknown> | undefined;
    if (typeKey === 'additionalEmails' && ch?.mailboxes && Array.isArray(ch.mailboxes)) {
      setAdditionalEmailsList((ch.mailboxes as AdditionalMailbox[]).map(m => ({
        provider: m.provider || 'gmail',
        adminEmail: m.adminEmail || '',
        appPassword: m.appPassword || '',
        oauthRefreshToken: (m as { oauthRefreshToken?: string }).oauthRefreshToken,
        imapHost: m.imapHost,
        imapPort: m.imapPort,
        imapSecure: m.imapSecure !== false,
      })));
      setEditingMailboxIndex(null);
      setMailboxForm({ provider: 'gmail', adminEmail: '', appPassword: '', imapSecure: true });
    } else {
      setAdditionalEmailsList([]);
      setEditingMailboxIndex(null);
    }
    const vals: Record<string, string | boolean | number> = {};
    if (ch && typeKey !== 'additionalEmails') {
      Object.entries(ch).forEach(([k, v]) => {
        if (k === 'mailboxes') return;
        if (typeof v === 'boolean') vals[k] = v;
        else if (typeof v === 'number') vals[k] = v;
        else vals[k] = String(v ?? '');
      });
    }
    setChannelConfigValues(vals);
  };

  const closeConfigureModal = () => {
    setConfigureModal(null);
    setChannelConfigValues({});
    setAdditionalEmailsList([]);
    setEditingMailboxIndex(null);
  };

  const updateChannelConfigValue = (key: string, value: string | boolean | number) => {
    setChannelConfigValues(prev => ({ ...prev, [key]: value }));
  };

  /** Build companies list with enabled/configured from raw config (matches backend GET /api/companies logic) */
  const buildCompaniesFromConfig = (cfg: { companies: Array<{ id: string; name: string; domain: string; channels?: Record<string, Record<string, unknown>> }> } | null, defaults: Company[]): Company[] => {
    if (!cfg?.companies?.length) return defaults;
    const configById = new Map<string, { id: string; name: string; domain: string; channels?: Record<string, Record<string, unknown>> }>();
    cfg.companies.forEach((c) => configById.set(String(c.id), c));
    const defaultChannelsList: Channel[] = [
      { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: false, configured: false },
      { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: false, configured: false },
      { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: false, configured: false },
      { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
      { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: false, configured: false },
      { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: false, configured: false },
    ];
    return defaults.map((def) => {
      const c = configById.get(String(def.id)) || def;
      const rawCh = (c as { channels?: unknown }).channels;
      const ch: Record<string, Record<string, unknown>> = (rawCh && !Array.isArray(rawCh) && typeof rawCh === 'object') ? (rawCh as Record<string, Record<string, unknown>>) : {};
      const isGmailOrImap = (ch.email?.provider as string || '').toLowerCase() === 'gmail' || (ch.email?.provider as string || '').toLowerCase() === 'imap';
      const emailHasCreds = ch.email?.adminEmail && (String(ch.email?.appPassword || ch.email?.password || '').length > 0 || ch.teams?.clientSecret);
      const emailConfigured = !!(ch.email?.adminEmail && (String(ch.email?.appPassword || ch.email?.password || '').length > 0 || ch.teams?.clientSecret || ch.email?.oauthRefreshToken));
      const emailEnabled = !!ch.email?.enabled;
      const hasAdditionalEmails = Array.isArray(ch.additionalEmails?.mailboxes) && (ch.additionalEmails.mailboxes as unknown[]).length > 0;
      const channels: Channel[] = [
        { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: emailEnabled, configured: emailConfigured },
        { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: hasAdditionalEmails, configured: hasAdditionalEmails },
        { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: !!ch.teams?.enabled, configured: !!(ch.teams?.azureAppId && !String(ch.teams?.azureAppId || '').includes('YOUR_')) },
        { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
        { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: !!ch.calendar?.enabled, configured: !!(ch.calendar?.azureAppId && !String(ch.calendar?.azureAppId || '').includes('YOUR_')) },
        { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: !!ch.sharepoint?.enabled, configured: !!(ch.sharepoint?.azureAppId && !String(ch.sharepoint?.azureAppId || '').includes('YOUR_')) },
      ];
      return { id: def.id, name: def.name, domain: def.domain || '', active: true, channels };
    });
  };

  const saveChannelConfig = async () => {
    if (!configureModal) return;

    const company = companiesConfig?.companies?.find(c => c.id === configureModal.companyId);
    const type = configureModal.channel.type;
    const typeKey = type === 'documents' ? 'sharepoint' : type;

    let updated: Record<string, unknown>;
    if (typeKey === 'additionalEmails') {
      updated = { enabled: additionalEmailsList.length > 0, mailboxes: additionalEmailsList };
    } else {
      updated = { ...(company?.channels?.[typeKey] as Record<string, unknown> || {}), enabled: true };
      Object.entries(channelConfigValues).forEach(([k, v]) => {
        if (v === '' || v === undefined) return;
        updated[k] = v;
      });
      if (typeKey === 'email') updated.enabled = true;
    }

    const comp = companies.find(c => c.id === configureModal.companyId);
    const payload = {
      companyId: String(configureModal.companyId),
      companyName: comp?.name || 'Company',
      companyDomain: comp?.domain || '',
      channelType: typeKey,
      channelConfig: updated,
    };

    try {
      const res = await fetch('/api/companies-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: result.message || `${configureModal.channel.name} configured!` });
        const savedCompanyId = String(configureModal.companyId);
        const savedChannelType = typeKey;
        const cfg = (result as { config?: { companies: Array<{ id: string; name: string; domain: string; channels?: Record<string, Record<string, unknown>> }> } }).config;
        if (cfg) {
          setCompaniesConfig(cfg);
          setCompanies(prev => {
            const next = buildCompaniesFromConfig(cfg, prev);
            return next.map(c => {
              if (String(c.id) !== savedCompanyId) return c;
              return {
                ...c,
                channels: c.channels.map(ch => {
                  const isSaved = ch.type === savedChannelType || ch.id === savedChannelType;
                  return isSaved ? { ...ch, enabled: true, configured: true } : ch;
                }),
              };
            });
          });
        } else {
          const cfgRes = await fetch('/api/companies-config');
          if (cfgRes.ok) {
            const cfgFromApi = await cfgRes.json();
            setCompaniesConfig(cfgFromApi);
            setCompanies(prev => buildCompaniesFromConfig(cfgFromApi, prev));
          }
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save. Is the backend running on port 3000?' });
      setTimeout(() => setMessage(null), 5000);
    }
    closeConfigureModal();
  };

  const persistChannelEnabled = async (companyId: string, channel: Channel, enabled: boolean) => {
    const typeKey = (channel.type === 'documents' ? 'sharepoint' : (channel.type || channel.id)) as string;
    const company = companiesConfig?.companies?.find((c: { id: string }) => String(c.id) === String(companyId));
    const existing = (company?.channels as Record<string, Record<string, unknown>>)?.[typeKey] || {};
    // Don't overwrite channel with minimal payload if we don't have full config (would wipe credentials)
    const hasRealConfig = typeKey === 'additionalEmails' ? Array.isArray((existing as { mailboxes?: unknown }).mailboxes) : Object.keys(existing).length > 1;
    if (!hasRealConfig && !enabled) {
      try {
        const cfgRes = await fetch('/api/companies-config');
        if (cfgRes.ok) {
          const fresh = await cfgRes.json();
          setCompaniesConfig(fresh);
          const comp = (fresh?.companies || []).find((c: { id: string }) => String(c.id) === String(companyId));
          const existingFromApi = (comp?.channels as Record<string, Record<string, unknown>>)?.[typeKey] || {};
          if (Object.keys(existingFromApi).length <= 1 && !enabled) return;
        }
      } catch {
        return;
      }
    }
    const comp = companies.find(c => c.id === companyId);
    const baseConfig = Object.keys(existing).length
      ? existing
      : await fetch('/api/companies-config')
          .then((r) => r.json())
          .then((cfg: { companies?: Array<{ id: string; channels?: Record<string, Record<string, unknown>> }> }) => {
            const c = (cfg?.companies || []).find((cc) => String(cc.id) === String(companyId));
            return (c?.channels as Record<string, Record<string, unknown>>)?.[typeKey] as Record<string, unknown> || {};
          })
          .catch(() => ({}));
    const payload = {
      companyId: String(companyId),
      companyName: comp?.name || (company as { name?: string })?.name || 'Company',
      companyDomain: comp?.domain || (company as { domain?: string })?.domain || '',
      channelType: typeKey,
      channelConfig: { ...baseConfig, enabled },
    };
    try {
      const res = await fetch('/api/companies-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && (result as { config?: unknown }).config) {
        setCompaniesConfig((result as { config: typeof companiesConfig }).config);
        setCompanies(prev => buildCompaniesFromConfig((result as { config: typeof companiesConfig }).config, prev));
      } else if (!res.ok) {
        setMessage({ type: 'error', text: (result as { error?: string }).error || 'Failed to update monitor setting' });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not save. Is the backend running?' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const testChannels = async (companyId: string) => {
    setTestingChannels(true);
    setChannelTestResult(null);
    try {
      const url = companyId === 'all' ? '/api/test/channels-all' : `/api/test/channels?companyId=${companyId}`;
      const res = await fetch(url);
      const data = await res.json();
      setChannelTestResult(data);
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to test channels' });
      } else {
        setMessage({ type: 'success', text: 'Channel test complete. See results below.' });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Connection failed';
      setMessage({ type: 'error', text: 'Backend not reachable. Start it with: node backend/server.js' });
      setChannelTestResult({
        error: 'Network error',
        cause: errMsg,
        fix: 'Start the backend first: double-click START-BACKEND.bat, or run "node backend/server.js" in a terminal.',
      });
    } finally {
      setTestingChannels(false);
    }
  };

  const loadMonitoringCounts = async () => {
    setLoadingCounts(true);
    setMonitoringCounts(null);
    try {
      const res = await fetch('/api/companies-monitoring-counts');
      const data = await res.json();
      if (res.ok) {
        setMonitoringCounts(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load M365 counts' });
      }
    } catch (_) {
      setMessage({ type: 'error', text: 'Backend not reachable. Start it and try again.' });
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleAddCompany = () => {
    if (!newCompany.name || !newCompany.domain) {
      setMessage({ type: 'error', text: 'Please enter company name and domain' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const defaultChannels: Channel[] = [
      { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: false, configured: false },
      { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: false, configured: false },
      { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: false, configured: false },
      { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
      { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: false, configured: false },
      { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: false, configured: false },
    ];

    const newCompanyObj: Company = {
      id: (companies.length + 1).toString(),
      name: newCompany.name,
      domain: newCompany.domain,
      active: true,
      channels: defaultChannels,
    };

    setCompanies([...companies, newCompanyObj]);
    setMessage({ type: 'success', text: `${newCompany.name} added successfully!` });
    setTimeout(() => setMessage(null), 3000);
    setShowAddCompanyModal(false);
    setNewCompany({ name: '', domain: '' });
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.phoneNumber) {
      setMessage({ type: 'error', text: 'Please enter name and phone number' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const newAuthorizedUser: AuthorizedNumber = {
      id: (authorizedNumbers.length + 1).toString(),
      phoneNumber: newUser.phoneNumber,
      name: newUser.name,
      role: newUser.role,
      alertLevel: newUser.alertLevel,
      active: true,
    };

    setAuthorizedNumbers([...authorizedNumbers, newAuthorizedUser]);
    setMessage({ type: 'success', text: `${newUser.name} added successfully!` });
    setTimeout(() => setMessage(null), 3000);
    setShowAddUserModal(false);
    setNewUser({ name: '', phoneNumber: '', role: 'User', alertLevel: 'all' });
  };

  const handleRemoveUser = (id: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      setAuthorizedNumbers(authorizedNumbers.filter(u => u.id !== id));
      setMessage({ type: 'success', text: 'User removed successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center relative">
        <LobsterBackground />
        <div className="flex items-center gap-3 text-lobster-400 relative z-10">
          <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2} />
          <span className="text-sm font-medium">Loading configuration…</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center relative">
        <LobsterBackground />
        <p className="text-red-400 text-sm font-medium relative z-10">Failed to load configuration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative">
      <LobsterBackground />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-gray-950/80 backdrop-blur-xl relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lobster-500/15 border border-lobster-500/30 shadow-glow">
              <LayoutDashboard className="text-lobster-400" size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white font-display">Lobster Console</h1>
              <p className="text-gray-500 text-sm">General setup & agents</p>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary px-5 py-2.5"
          >
            <Save size={18} strokeWidth={2} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </header>

      {/* Warn when config was not loaded (backend down/timeout) so user doesn't overwrite by saving */}
      {configLoadFailed && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-amber-900/30 border border-amber-500/30 text-amber-200/90 text-sm backdrop-blur">
          <strong>Saved config could not be loaded</strong> (backend may be stopped or unreachable). Start the backend and <strong>refresh this page</strong> to see your saved settings. Avoid clicking Save until then or you may overwrite them with the values shown here.
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div className={`${message.type === 'success' ? 'bg-lobster-900/20 border-lobster-600/30' : 'bg-red-900/20 border-red-700/30'} border-b border-white/5 px-4 py-3`}>
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {message.type === 'success' ? <CheckCircle size={20} className="text-lobster-400 shrink-0" /> : <XCircle size={20} className="text-red-400 shrink-0" />}
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 relative z-10">
        {/* Tabs: General | Chanakya | Henry | (more agents later) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-white/[0.03] p-1.5 border border-white/[0.06] flex-1 min-w-0">
            {[
              { id: 'general', label: 'General', icon: Settings, desc: 'Contact, companies, users' },
              { id: 'strategic-advisor', label: 'Chanakya', icon: Sparkles, desc: 'Monitoring, briefings, LLM' },
              { id: 'travel-agent', label: 'Henry', icon: Plane, desc: 'Travel — trip plans, booking, payment' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`console-tab flex-1 min-w-0 justify-center ${
                  activeTab === tab.id ? 'console-tab-active' : 'console-tab-inactive'
                }`}
              >
                <tab.icon size={20} strokeWidth={1.8} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={sendingBriefingTest}
            onClick={async () => {
              setSendingBriefingTest(true);
              setBriefingTestResult(null);
              try {
                const res = await fetch('/api/test/email-briefing');
                const data = await res.json();
                const ok = res.ok && data.success;
                setBriefingTestResult({
                  success: ok,
                  message: data.message,
                  email: data.email,
                  whatsapp: data.whatsapp,
                  error: data.error,
                  emailTo: data.emailTo,
                  whatsappTo: data.whatsappTo,
                });
                if (ok) {
                  const parts = [];
                  if (data.email && data.emailTo) parts.push(`Email sent to ${data.emailTo}`);
                  if (data.whatsapp && data.whatsappTo) parts.push(`WhatsApp sent to ${data.whatsappTo}`);
                  setMessage({ type: 'success', text: parts.length ? parts.join('. ') : data.message });
                } else {
                  setMessage({ type: 'error', text: data.message || data.error || 'Briefing not sent. Check backend console and email/SendGrid config.' });
                }
              } catch (e) {
                setBriefingTestResult({ success: false, error: 'Request failed. Is the backend running?' });
                setMessage({ type: 'error', text: 'Could not reach backend. Start it and try again.' });
              }
              setTimeout(() => setMessage(null), 8000);
              setSendingBriefingTest(false);
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-lobster-500 hover:bg-lobster-400 text-white font-medium border border-lobster-400/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={20} />
            {sendingBriefingTest ? 'Sending…' : 'Send briefing now'}
          </button>
        </div>

        {/* General — applies to all agents: Contact, Companies, Authorized Users */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            <section className="config-card">
              <h2 className="config-heading">
                <Phone className="config-heading-icon" />
                Contact Information
              </h2>
              <p className="text-sm text-gray-400 mb-4">Primary contact for alerts and voice briefings (shared across all agents).</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="config-label">Phone Number</label>
                  <input
                    type="text"
                    value={config.ceo.phoneNumber}
                    onChange={(e) => setConfig({ ...config, ceo: { ...config.ceo, phoneNumber: e.target.value }})}
                    className="config-input"
                  />
                </div>
                <div>
                  <label className="config-label">WhatsApp Number</label>
                  <input
                    type="text"
                    value={config.ceo.whatsappNumber}
                    onChange={(e) => setConfig({ ...config, ceo: { ...config.ceo, whatsappNumber: e.target.value }})}
                    className="config-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="config-label">Email</label>
                  <input
                    type="email"
                    value={config.ceo.email}
                    onChange={(e) => setConfig({ ...config, ceo: { ...config.ceo, email: e.target.value }})}
                    className="config-input"
                  />
                </div>
              </div>
            </section>

            <section className="config-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="config-heading">
                  <Building2 className="config-heading-icon" />
                  Companies & Monitoring Channels
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => testChannels(selectedCompany || '1')}
                    disabled={testingChannels}
                    className="btn-secondary"
                  >
                    <RefreshCw size={18} className={testingChannels ? 'animate-spin' : ''} />
                    {testingChannels ? 'Testing...' : 'Test Selected'}
                  </button>
                  <button
                    onClick={() => testChannels('all')}
                    disabled={testingChannels}
                    className="btn-secondary"
                  >
                    <RefreshCw size={18} className={testingChannels ? 'animate-spin' : ''} />
                    {testingChannels ? 'Testing...' : 'Test All'}
                  </button>
                  <button
                    onClick={loadMonitoringCounts}
                    disabled={loadingCounts}
                    className="btn-secondary"
                    title="Cross-check with network admin's M365 counts"
                  >
                    <RefreshCw size={18} className={loadingCounts ? 'animate-spin' : ''} />
                    {loadingCounts ? 'Loading...' : 'M365 Counts'}
                  </button>
                  <button onClick={() => setShowAddCompanyModal(true)} className="btn-primary">
                    <Plus size={18} />
                    Add Company
                  </button>
                </div>
              </div>
              {monitoringCounts && (
                <div className="mb-6 p-4 bg-slate-800/60 rounded-xl border border-slate-600/50">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <Database size={16} />
                    M365 Monitoring Scope
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {monitoringCounts.companies.map((mc) => (
                      <div key={mc.id} className="bg-slate-700/50 rounded-lg p-3">
                        <div className="font-medium text-white mb-2">{mc.name}</div>
                        {mc.error ? (
                          <p className="text-xs text-amber-400">{mc.error}</p>
                        ) : (
                          <div className="text-xs space-y-1 text-gray-300">
                            <div><span className="text-gray-500">Tenant emails:</span> <strong>{mc.userCount ?? '—'}{mc.hasMoreUsers ? '+' : ''}</strong></div>
                            <div><span className="text-gray-500">Monitored:</span> <strong>{mc.monitoredUserCount ?? '—'}</strong></div>
                            <div><span className="text-gray-500">Teams:</span> <strong>{mc.teamsCount ?? '—'}</strong></div>
                            <div><span className="text-gray-500">Channels:</span> <strong>{mc.channelsCount ?? '—'}</strong></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {monitoringCounts.timestamp && (
                    <p className="text-xs text-gray-500 mt-2">Last refreshed: {new Date(monitoringCounts.timestamp).toLocaleString()}</p>
                  )}
                </div>
              )}
              {channelTestResult && (
                <div className="mb-6 space-y-3">
                  {(() => {
                    const multiCompany = channelTestResult.companies as Array<{ channels?: Record<string, { error?: string; errorHint?: string }> }> | undefined;
                    const singleChannels = channelTestResult.channels as Record<string, { error?: string; errorHint?: string }> | undefined;
                    const allChannels = multiCompany
                      ? multiCompany.flatMap((c) => Object.values(c.channels || {}))
                      : singleChannels
                        ? Object.values(singleChannels)
                        : [];
                    const firstHint = allChannels.find((ch) => ch?.errorHint);
                    const has700016 = allChannels.some((ch) => ch?.error && String(ch.error).includes('700016'));
                    const hasAccessDenied = allChannels.some((ch) => ch?.error && String(ch.error).toLowerCase().includes('access is denied'));
                    const hint = firstHint?.errorHint || (has700016
                      ? 'The Azure app is not registered in your company tenant. Create a new app in Azure Portal while signed into your company tenant (Othain Group), or use an app that was registered there. See ADMIN-CONFIG-REQUEST.md for steps.'
                      : hasAccessDenied
                        ? 'The app lacks permission to read mail. In Azure Portal → App registrations → Your app → API permissions: add Mail.Read (Application), then click Grant admin consent for [Organization].'
                        : null);
                    const hasAzureError = !!firstHint?.errorHint || has700016 || hasAccessDenied;
                    return (
                      <>
                        {hint && (
                          <div className="p-4 bg-amber-900/40 border border-amber-600/50 rounded-xl">
                            <h4 className="font-semibold mb-2 text-amber-400 flex items-center gap-2">
                              <XCircle size={18} />
                              {hasAzureError ? 'Configuration issue – how to fix' : 'Configuration hint'}
                            </h4>
                            <p className="text-sm text-amber-100">{hint}</p>
                          </div>
                        )}
                        <div className="p-4 bg-gray-700/50 rounded-xl overflow-auto max-h-96 border border-gray-600/50">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-lobster-400">Channel Test Results</h4>
                            <CopyToClipboardButton
                              text={JSON.stringify(channelTestResult, null, 2)}
                              label="Copy results"
                            />
                          </div>
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(channelTestResult, null, 2)}
                          </pre>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="space-y-6">
                {companies.map((company) => (
                  <div key={company.id} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${company.active ? 'bg-lobster-500' : 'bg-gray-500'}`} />
                        <div>
                          <h3 className="text-lg font-semibold">{company.name}</h3>
                          <p className="text-sm text-gray-400">{company.domain}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={company.active}
                          onChange={(e) => {
                            setCompanies(companies.map(c =>
                              c.id === company.id ? { ...c, active: e.target.checked } : c
                            ));
                          }}
                          className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                        />
                        Active Monitoring
                      </label>
                    </div>
                    {monitoringCounts && (() => {
                      const mc = monitoringCounts.companies.find((c) => c.id === company.id);
                      if (!mc || mc.error) return null;
                      return (
                        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
                          <div className="text-xs font-medium text-cyan-400 mb-2">M365 scope</div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                            <span>Emails: <strong>{mc.userCount}{mc.hasMoreUsers ? '+' : ''}</strong></span>
                            <span>Monitored: <strong>{mc.monitoredUserCount}</strong></span>
                            <span>Teams: <strong>{mc.teamsCount}</strong></span>
                            <span>Channels: <strong>{mc.channelsCount}</strong></span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Channels</h4>
                      {company.channels.map((channel) => (
                        <div key={channel.id} className="bg-gray-800/60 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={channel.enabled}
                              onChange={async (e) => {
                                const newEnabled = e.target.checked;
                                setCompanies(companies.map(c =>
                                  c.id === company.id
                                    ? { ...c, channels: c.channels.map(ch => ch.id === channel.id ? { ...ch, enabled: newEnabled } : ch) }
                                    : c
                                ));
                                await persistChannelEnabled(company.id, channel, newEnabled);
                              }}
                              className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                            />
                            <div>
                              <span className="text-sm font-medium">{channel.name}</span>
                              {(channel.type === 'email' || channel.id === 'email') && (
                                <p className="text-xs text-gray-500 mt-0.5">Outlook, Gmail, or IMAP — click Configure to choose</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {channel.configured ? (
                              <span className="text-xs bg-lobster-900/50 text-lobster-400 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={12} />
                                Configured
                              </span>
                            ) : (
                              <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-1 rounded-full flex items-center gap-1">
                                <XCircle size={12} />
                                Not Configured
                              </span>
                            )}
                            <button
                              onClick={() => handleConfigureChannel(channel, company.id)}
                              className="btn-primary text-sm py-1.5 px-3"
                            >
                              Configure
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                      <p className="text-xs text-blue-300">
                        Company-wide monitoring for {company.name}: emails, Teams, calendars, documents.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-lobster-900/20 border border-lobster-700/50 rounded-xl">
                <p className="text-sm text-lobster-200">
                  Multi-company insights: the system analyzes all active companies and provides cross-company priorities.
                </p>
              </div>
            </section>

            <section className="config-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="config-heading">
                  <Users className="config-heading-icon" />
                  Authorized Users
                </h2>
                <button onClick={() => setShowAddUserModal(true)} className="btn-primary">
                  <Plus size={20} />
                  Add User
                </button>
              </div>
              <div className="space-y-3">
                {authorizedNumbers.map((number) => (
                  <div key={number.id} className="bg-gray-700/50 rounded-xl p-4 flex items-center justify-between border border-gray-600/50">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${number.active ? 'bg-lobster-500' : 'bg-gray-500'}`} />
                      <div>
                        <div className="font-semibold">{number.name}</div>
                        <div className="text-sm text-gray-400">{number.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm bg-lobster-900/50 text-lobster-400 px-3 py-1 rounded-full">{number.role}</span>
                      <span className="text-sm bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full">{number.alertLevel}</span>
                      <button
                        onClick={() => handleRemoveUser(number.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        disabled={number.role === 'Admin' && authorizedNumbers.length === 1}
                        title={number.role === 'Admin' && authorizedNumbers.length === 1 ? 'Cannot remove the only admin' : 'Remove user'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Chanakya — agent-specific: Monitoring, Briefings, LLM */}
        {activeTab === 'strategic-advisor' && (
          <div className="space-y-8">
            <section className="config-card">
              <h2 className="config-heading">
                <Clock className="config-heading-icon" />
                Monitoring
              </h2>
              <p className="text-sm text-gray-400 mb-4">How often and when Chanakya checks for updates.</p>
              <div className="space-y-4">
                <div>
                  <label className="config-label">Check interval (minutes)</label>
                  <input
                    type="number"
                    value={config.monitoring.intervalMinutes}
                    onChange={(e) => setConfig({ ...config, monitoring: { ...config.monitoring, intervalMinutes: parseInt(e.target.value) }})}
                    className="config-input max-w-xs"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.monitoring.alertOnlyUrgent}
                    onChange={(e) => setConfig({ ...config, monitoring: { ...config.monitoring, alertOnlyUrgent: e.target.checked }})}
                    className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                  />
                  <span>Only alert for urgent items</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.monitoring.quietHoursEnabled}
                    onChange={(e) => setConfig({ ...config, monitoring: { ...config.monitoring, quietHoursEnabled: e.target.checked }})}
                    className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                  />
                  <span>Enable quiet hours</span>
                </label>
                {config.monitoring.quietHoursEnabled && (
                  <div className="grid md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="config-label">Quiet hours start</label>
                      <input
                        type="time"
                        value={config.monitoring.quietHoursStart}
                        onChange={(e) => setConfig({ ...config, monitoring: { ...config.monitoring, quietHoursStart: e.target.value }})}
                        className="config-input"
                      />
                    </div>
                    <div>
                      <label className="config-label">Quiet hours end</label>
                      <input
                        type="time"
                        value={config.monitoring.quietHoursEnd}
                        onChange={(e) => setConfig({ ...config, monitoring: { ...config.monitoring, quietHoursEnd: e.target.value }})}
                        className="config-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="config-card">
              <h2 className="config-heading">
                <Mail className="config-heading-icon" />
                Daily Briefings
              </h2>
              <p className="text-sm text-gray-400 mb-4">Morning and evening briefings with status of your configured companies. Set times and enable/disable email or voice for each.</p>
              <div className="space-y-4">
                <div>
                  <label className="config-label">Frequency</label>
                  <select
                    value={config.briefings.frequency ?? 'daily'}
                    onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, frequency: e.target.value as 'daily' | 'weekdays' | 'off' }})}
                    className="config-input max-w-xs"
                  >
                    <option value="daily">Daily (every day)</option>
                    <option value="weekdays">Weekdays only (Mon–Fri)</option>
                    <option value="off">Off (no scheduled briefings)</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="config-label">Morning briefing time</label>
                    <input
                      type="time"
                      value={config.briefings.morningTime}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, morningTime: e.target.value }})}
                      className="config-input"
                    />
                  </div>
                  <div>
                    <label className="config-label">Evening summary time</label>
                    <input
                      type="time"
                      value={config.briefings.eveningTime}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, eveningTime: e.target.value }})}
                      className="config-input"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Send briefing on demand</h3>
                <p className="text-xs text-gray-500 mb-2">Same as the &quot;Send briefing now&quot; button in the header: generates the live briefing (email + Teams data, AI summary) and sends it to your Contact email and WhatsApp. Requires backend email configured (SendGrid or Gmail/Outlook in .env).</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={sendingBriefingTest}
                    onClick={async () => {
                      setSendingBriefingTest(true);
                      setBriefingTestResult(null);
                      try {
                        const res = await fetch('/api/test/email-briefing');
                        const data = await res.json();
                        const ok = res.ok && data.success;
                        setBriefingTestResult({
                          success: ok,
                          message: data.message,
                          email: data.email,
                          whatsapp: data.whatsapp,
                          error: data.error,
                          emailTo: data.emailTo,
                          whatsappTo: data.whatsappTo,
                        });
                        if (ok) {
                          const parts = [];
                          if (data.email && data.emailTo) parts.push(`Email sent to ${data.emailTo}`);
                          if (data.whatsapp && data.whatsappTo) parts.push(`WhatsApp sent to ${data.whatsappTo}`);
                          setMessage({ type: 'success', text: parts.length ? parts.join('. ') : data.message });
                        } else {
                          setMessage({ type: 'error', text: data.message || data.error || 'Briefing not sent. Check backend and email config.' });
                        }
                      } catch (e) {
                        setBriefingTestResult({ success: false, error: 'Request failed. Is the backend running?' });
                        setMessage({ type: 'error', text: 'Could not reach backend. Start it and try again.' });
                      }
                      setTimeout(() => setMessage(null), 8000);
                      setSendingBriefingTest(false);
                    }}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {sendingBriefingTest ? 'Sending…' : 'Send test briefing to email + WhatsApp'}
                  </button>
                  {briefingTestResult && (
                    <span className={`text-sm ${briefingTestResult.success ? 'text-green-400' : 'text-amber-400'}`}>
                      {briefingTestResult.email && briefingTestResult.emailTo && `✓ Email → ${briefingTestResult.emailTo}`}
                      {briefingTestResult.email && briefingTestResult.whatsapp && ' · '}
                      {briefingTestResult.whatsapp && briefingTestResult.whatsappTo && `✓ WhatsApp → ${briefingTestResult.whatsappTo}`}
                      {!briefingTestResult.success && briefingTestResult.message && ` — ${briefingTestResult.message}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Meeting prep</h3>
                <p className="text-xs text-gray-500 mb-2">Chanakya briefs you before calls with attendees, agenda, and suggested talking points. Prep is sent to your Contact email and WhatsApp. Requires Azure/Calendar configured (same as daily briefings). Automatic prep sends one prep per meeting 15 min before (or one per meeting when multiple are at the same time). On-demand &quot;Send meeting prep now&quot; lists all meetings in the next 24 hours in chronological order.</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.briefings.meetingPrepEnabled === true}
                        onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, meetingPrepEnabled: e.target.checked }})}
                        className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                      />
                      <span className="text-sm text-gray-400">Send meeting prep automatically 15 minutes before each meeting</span>
                    </label>
                  </div>
                  <div>
                    <label className="config-label">Calendar timezone (for meeting times)</label>
                    <input
                      type="text"
                      value={config.briefings.meetingPrepTimezone ?? 'Eastern Standard Time'}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, meetingPrepTimezone: e.target.value || 'Eastern Standard Time' }})}
                      placeholder="Eastern Standard Time"
                      className="config-input max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: Eastern Standard Time (US Eastern). Use Windows timezone names, e.g. Central Standard Time, Pacific Standard Time.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      disabled={sendingMeetingPrep}
                      onClick={async () => {
                        setSendingMeetingPrep(true);
                        setMeetingPrepResult(null);
                        try {
                          const res = await fetch('/api/meeting-prep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nextHours: 24 }) });
                          const data = await res.json();
                          const ok = res.ok && data.success;
                          setMeetingPrepResult({
                            success: ok,
                            message: data.message,
                            meetingsCount: data.meetingsCount,
                            email: data.email,
                            whatsapp: data.whatsapp,
                            whatsappError: data.whatsappError ?? null,
                            error: data.error,
                          });
                          if (ok) {
                            setMessage({ type: 'success', text: data.message || 'Meeting prep sent.' });
                          } else {
                            setMessage({ type: 'error', text: data.error || data.message || 'Meeting prep failed.' });
                          }
                        } catch (e) {
                          setMeetingPrepResult({ success: false, error: 'Request failed. Is the backend running?' });
                          setMessage({ type: 'error', text: 'Could not reach backend. Start it and try again.' });
                        }
                        setTimeout(() => setMessage(null), 8000);
                        setSendingMeetingPrep(false);
                      }}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {sendingMeetingPrep ? 'Sending…' : 'Send meeting prep now'}
                    </button>
                    {meetingPrepResult && (
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm ${meetingPrepResult.success ? 'text-green-400' : 'text-amber-400'}`}>
                          {meetingPrepResult.success && meetingPrepResult.meetingsCount !== undefined && `✓ ${meetingPrepResult.meetingsCount} meeting(s) · `}
                          {meetingPrepResult.success ? (meetingPrepResult.message || 'Sent.') : (meetingPrepResult.error || meetingPrepResult.message)}
                        </span>
                        {meetingPrepResult.success && (meetingPrepResult.whatsappError || (meetingPrepResult.email && !meetingPrepResult.whatsapp)) && (
                          <span className="text-xs text-amber-400/90">
                            {meetingPrepResult.whatsappError ? `WhatsApp: ${meetingPrepResult.whatsappError}` : 'WhatsApp not received? Send "join &lt;your-code&gt;" to your Twilio sandbox number again, or check Twilio console for delivery status.'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Meeting transcription &amp; summary</h3>
                <p className="text-xs text-gray-500 mb-2">For calendar meetings that have ended (with Teams transcription enabled), Chanakya fetches the transcript, generates a summary with items discussed and action items, and sends it to your Contact email and WhatsApp. Works for meetings you attend or don’t. Requires Azure Calendar/Teams and permission OnlineMeetingTranscript.Read.All (and application access policy for the user).</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.briefings.meetingTranscriptionEnabled === true}
                        onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, meetingTranscriptionEnabled: e.target.checked }})}
                        className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                      />
                      <span className="text-sm text-gray-400">Process meeting transcripts automatically (every 30 min)</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <label className="config-label">Look back (hours)</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={config.briefings.meetingTranscriptionHoursLookback ?? 4}
                        onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, meetingTranscriptionHoursLookback: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 4)) }})}
                        className="config-input w-20"
                      />
                    </div>
                    <span className="text-xs text-gray-500">Check meetings that ended in the last N hours for transcripts.</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      disabled={sendingTranscription}
                      onClick={async () => {
                        setSendingTranscription(true);
                        setTranscriptionResult(null);
                        try {
                          const hours = config.briefings.meetingTranscriptionHoursLookback ?? 4;
                          const res = await fetch('/api/meeting-transcription/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hoursLookback: hours }) });
                          const data = await res.json();
                          const ok = res.ok && data.success;
                          setTranscriptionResult({
                            success: ok,
                            message: data.message,
                            processed: data.processed,
                            sent: data.sent,
                            error: data.error,
                          });
                          if (ok) setMessage({ type: 'success', text: data.message || 'Done.' });
                          else setMessage({ type: 'error', text: data.error || data.message || 'Failed.' });
                        } catch (e) {
                          setTranscriptionResult({ success: false, error: 'Request failed. Is the backend running?' });
                          setMessage({ type: 'error', text: 'Could not reach backend.' });
                        }
                        setTimeout(() => setMessage(null), 8000);
                        setSendingTranscription(false);
                      }}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      {sendingTranscription ? 'Running…' : 'Run meeting transcription now'}
                    </button>
                    {transcriptionResult && (
                      <span className={`text-sm ${transcriptionResult.success ? 'text-green-400' : 'text-amber-400'}`}>
                        {transcriptionResult.success ? (transcriptionResult.message ?? `Processed ${transcriptionResult.processed ?? 0}, sent ${transcriptionResult.sent ?? 0}.`) : (transcriptionResult.error || transcriptionResult.message)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Email briefings</h3>
                <p className="text-xs text-gray-500 mb-3">Sent to the email in General → Contact. Requires email configured (SendGrid or Gmail/Outlook in .env).</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.briefings.emailMorning !== false}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, emailMorning: e.target.checked }})}
                      className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                    />
                    <span className="text-sm text-gray-400">Morning email briefing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.briefings.emailEvening !== false}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, emailEvening: e.target.checked }})}
                      className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                    />
                    <span className="text-sm text-gray-400">Evening email summary</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Voice readouts</h3>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.briefings.voiceMorning !== false}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, voiceMorning: e.target.checked }})}
                      className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                    />
                    <span className="text-sm text-gray-400">Voice call with morning briefing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.briefings.voiceEvening !== false}
                      onChange={(e) => setConfig({ ...config, briefings: { ...config.briefings, voiceEvening: e.target.checked }})}
                      className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                    />
                    <span className="text-sm text-gray-400">Voice call with evening summary</span>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={async () => {
                      setCallingNow(true);
                      try {
                        const toNumber = config.ceo?.phoneNumber || config.ceo?.whatsappNumber;
                        const res = await fetch('/api/voice-call', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: 'This is Chanakya. You requested an on-demand voice briefing. All systems operational.',
                            toNumber: toNumber || undefined,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setMessage({ type: 'success', text: data.message || 'Call initiated.' });
                        } else {
                          setMessage({ type: 'error', text: data.error || 'Voice call failed.' });
                        }
                      } catch (err) {
                        setMessage({ type: 'error', text: 'Failed to initiate call. Is the backend running?' });
                      } finally {
                        setCallingNow(false);
                        setTimeout(() => setMessage(null), 4000);
                      }
                    }}
                    disabled={callingNow}
                    className="btn-secondary"
                  >
                    <Phone size={18} />
                    {callingNow ? 'Calling...' : 'Call me now'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setRefreshingCache(true);
                      try {
                        const res = await fetch('/api/channel-cache/refresh', { method: 'POST' });
                        const data = await res.json();
                        if (res.ok && data.ok) {
                          setMessage({ type: 'success', text: data.message || 'Channel cache refreshed.' });
                        } else {
                          setMessage({ type: 'error', text: data.error || data.message || 'Cache refresh failed.' });
                        }
                      } catch (err) {
                        setMessage({ type: 'error', text: 'Could not reach backend. Is it running?' });
                      } finally {
                        setRefreshingCache(false);
                        setTimeout(() => setMessage(null), 6000);
                      }
                    }}
                    disabled={refreshingCache}
                    className="btn-secondary"
                    title="Run full Outlook + Gmail fetch now and store in cache. Person/insight queries use this for fast replies."
                  >
                    <Database size={18} className={refreshingCache ? 'animate-pulse' : ''} />
                    {refreshingCache ? 'Refreshing cache…' : 'Refresh channel cache'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setRestartingBackend(true);
                      try {
                        const res = await fetch('/api/restart-backend', { method: 'POST' });
                        const data = await res.json();
                        if (res.ok) {
                          setMessage({ type: 'success', text: data.message || 'Backend restarting.' });
                        } else {
                          setMessage({ type: 'error', text: data.error || 'Restart failed.' });
                        }
                      } catch (err) {
                        setMessage({ type: 'error', text: 'Could not reach backend. Run RESTART-BACKEND.bat from the project folder.' });
                      } finally {
                        setRestartingBackend(false);
                        setTimeout(() => setMessage(null), 5000);
                      }
                    }}
                    disabled={restartingBackend}
                    className="btn-amber"
                  >
                    <RefreshCw size={18} className={restartingBackend ? 'animate-spin' : ''} />
                    {restartingBackend ? 'Restarting...' : 'Restart backend'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Refresh channel cache: runs full mailbox fetch now so person/insight queries (e.g. &quot;Insights on X&quot;) use it. Uses the phone number from General → Contact for Call me now.</p>
              </div>
            </section>

            <section className="config-card">
              <h2 className="config-heading">
                <Shield className="config-heading-icon" />
                LLM Strategy
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="config-label">Processing strategy</label>
                  <select
                    value={config.llm.strategy}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, strategy: e.target.value }})}
                    className="config-input"
                  >
                    <option value="cloud">Cloud API only (Anthropic Claude)</option>
                    <option value="local">Local LLM only (Ollama)</option>
                    <option value="hybrid">Hybrid (local for sensitive, cloud for complex)</option>
                  </select>
                </div>
                {(config.llm.strategy === 'cloud' || config.llm.strategy === 'hybrid') && (
                  <div>
                    <label className="config-label">Cloud model</label>
                    <input
                      type="text"
                      value={config.llm.cloudModel}
                      disabled
                      className="config-input bg-gray-700/70 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Anthropic Claude Sonnet 4</p>
                  </div>
                )}
                {(config.llm.strategy === 'local' || config.llm.strategy === 'hybrid') && (
                  <div>
                    <label className="config-label">Local model</label>
                    <input
                      type="text"
                      value={config.llm.localModel}
                      onChange={(e) => setConfig({ ...config, llm: { ...config.llm, localModel: e.target.value }})}
                      className="config-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must match ollama list (e.g. llama3.1:8b, gpt-oss:120b)</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {ollamaStatus === null ? (
                        <span className="text-gray-500">Checking Ollama…</span>
                      ) : ollamaStatus.running ? (
                        <>
                          <span className="text-green-500" title="Ollama is running">●</span>
                          <span className="text-gray-300">
                            Ollama running
                            {ollamaStatus.modelLoaded !== false && ollamaStatus.configuredModel
                              ? ` · model "${ollamaStatus.configuredModel}" available`
                              : ollamaStatus.configuredModel
                                ? ` · model "${ollamaStatus.configuredModel}" not found (run: ollama pull ${config.llm.localModel})`
                                : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-500" title="Ollama not reachable">○</span>
                          <span className="text-gray-400">Ollama not running — {ollamaStatus.error || 'Start Ollama to use local/hybrid'}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

      </div>

      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="config-card max-w-md w-full border-white/15 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Plus className="text-lobster-400" size={22} />
                Add Company
              </h2>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-gray-400 hover:text-white rounded-lg p-1 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="config-label">Company name</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                  className="config-input"
                />
              </div>
              <div>
                <label className="config-label">Company domain</label>
                <input
                  type="text"
                  value={newCompany.domain}
                  onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value })}
                  placeholder="e.g., acmecorp.com"
                  className="config-input"
                />
                <p className="text-xs text-gray-500 mt-1">Used to identify company emails and resources</p>
              </div>
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl">
                <p className="text-sm text-blue-300">
                  After adding, you can enable and configure monitoring channels for this company.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700 flex gap-3 justify-end">
              <button onClick={() => setShowAddCompanyModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddCompany} className="btn-primary">
                <Plus size={18} />
                Add Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="config-card max-w-md w-full border-white/15 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Plus className="text-lobster-400" size={22} />
                Add Authorized Number
              </h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-white rounded-lg p-1 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="config-label">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  className="config-input"
                />
              </div>
              <div>
                <label className="config-label">Phone number</label>
                <input
                  type="tel"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                  className="config-input"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
              </div>
              <div>
                <label className="config-label">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="config-input"
                >
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="config-label">Alert level</label>
                <select
                  value={newUser.alertLevel}
                  onChange={(e) => setNewUser({ ...newUser, alertLevel: e.target.value })}
                  className="config-input"
                >
                  <option value="all">All Alerts</option>
                  <option value="critical">Critical Only</option>
                  <option value="none">No Alerts</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700 flex gap-3 justify-end">
              <button onClick={() => setShowAddUserModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddUser} className="btn-primary">
                <Plus size={18} />
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Henry — Travel Agent: trip plans, costs, airlines, hotels, Airbnb, sightseeing, booking + secure payment */}
        {activeTab === 'travel-agent' && config && (
          <div className="space-y-8">
            <section className="config-card">
              <h2 className="config-heading">
                <Plane className="config-heading-icon" />
                Henry — Travel Agent
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Henry creates travel plans (schedule, costs, airlines, hotels, Airbnb, sightseeing, best booking sites). After you confirm, you can store a payment method securely (token only) for booking.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="travelAgentEnabled"
                    checked={config.travelAgent?.enabled ?? false}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), enabled: e.target.checked },
                    })}
                    className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                  />
                  <label htmlFor="travelAgentEnabled" className="text-sm font-medium">Enable Henry (Travel Agent)</label>
                </div>
                <div>
                  <label className="config-label">Currency for costs</label>
                  <select
                    value={config.travelAgent?.currency ?? 'USD'}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), currency: e.target.value },
                    })}
                    className="config-input max-w-xs"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="config-label">Stripe Publishable Key (optional, for secure card tokenization)</label>
                  <input
                    type="password"
                    placeholder="pk_live_... or pk_test_..."
                    value={config.travelAgent?.stripePublishableKey ?? ''}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), stripePublishableKey: e.target.value },
                    })}
                    className="config-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Card data is never stored; only Stripe payment-method tokens are saved encrypted. Add your key when ready to accept payments.</p>
                </div>
                <div>
                  <label className="config-label">Preferred booking sites (hint for Henry)</label>
                  <textarea
                    placeholder="e.g. Booking.com, Expedia, Google Flights, Airbnb, GetYourGuide (hint for Henry)"
                    rows={2}
                    value={config.travelAgent?.preferredBookingSites ?? ''}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), preferredBookingSites: e.target.value },
                    })}
                    className="config-input w-full"
                  />
                </div>
                <div>
                  <label className="config-label">Preferred reservation platforms (dining)</label>
                  <input
                    type="text"
                    placeholder="OpenTable, Resy, Tock"
                    value={config.travelAgent?.preferredReservationPlatforms ?? 'OpenTable, Resy, Tock'}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), preferredReservationPlatforms: e.target.value },
                    })}
                    className="config-input w-full max-w-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Henry will recommend these when suggesting where to book restaurants.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="reminderCallsEnabled"
                    checked={config.travelAgent?.reminderCallsEnabled !== false}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), reminderCallsEnabled: e.target.checked },
                    })}
                    className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                  />
                  <label htmlFor="reminderCallsEnabled" className="text-sm font-medium">Reminder calls (Henry calls before upcoming travel, restaurant, or appointment)</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="monitoringEnabled"
                    checked={config.travelAgent?.monitoringEnabled ?? false}
                    onChange={(e) => setConfig({
                      ...config,
                      travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), monitoringEnabled: e.target.checked },
                    })}
                    className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
                  />
                  <label htmlFor="monitoringEnabled" className="text-sm font-medium">Hard-to-get: monitor for slot openings (future)</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="config-label">Alert cadence (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={config.travelAgent?.alertCadenceMinutes ?? 10}
                      onChange={(e) => setConfig({
                        ...config,
                        travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), alertCadenceMinutes: parseInt(e.target.value, 10) || 10 },
                      })}
                      className="config-input max-w-xs"
                    />
                  </div>
                  <div>
                    <label className="config-label">Monitoring cities (e.g. NYC, SF)</label>
                    <input
                      type="text"
                      placeholder="NYC, San Francisco, Chicago"
                      value={config.travelAgent?.monitoringCities ?? ''}
                      onChange={(e) => setConfig({
                        ...config,
                        travelAgent: { ...(config.travelAgent || { enabled: false, currency: 'USD', stripePublishableKey: '', preferredBookingSites: '', preferredReservationPlatforms: 'OpenTable, Resy, Tock', monitoringEnabled: false, alertCadenceMinutes: 10, monitoringCities: '', reminderCallsEnabled: true }), monitoringCities: e.target.value },
                      })}
                      className="config-input w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={saveConfig} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </section>

            <section className="config-card">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-200">
                <MapPin size={20} />
                Try it — Ask Henry for a travel plan
              </h3>
              <p className="text-sm text-gray-400 mb-4">Single destination: enter From and To plus dates. Multi-city: list cities/countries with dates (one per line); Henry will suggest the best route and most economical options. Optional budget and preferences below.</p>
              <TravelPlanForm
                currency={config.travelAgent?.currency ?? 'USD'}
                enabled={config.travelAgent?.enabled ?? false}
                defaultPreferredClass={config.travelAgent?.preferredClassOfTravel ?? ''}
                defaultPreferredAirlines={config.travelAgent?.preferredAirlines ?? ''}
                defaultMaxStops={config.travelAgent?.maxStops !== undefined && config.travelAgent?.maxStops !== null ? String(config.travelAgent.maxStops) : ''}
              />
            </section>

            <HenryRestaurantAndReminders enabled={config.travelAgent?.enabled ?? false} />

            <div className="p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
              <p className="text-sm text-amber-200">
                <strong>Secure payment:</strong> When you confirm a booking with Henry, only a payment method token (e.g. from Stripe) is stored encrypted. Raw card numbers are never saved. Use Stripe.js on the frontend to tokenize cards before sending.
              </p>
            </div>
          </div>
        )}

      {/* Channel Configuration Modal */}
      {configureModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Database className="text-green-500" />
                  Configure {configureModal.channel.name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  For: {companies.find(c => c.id === configureModal.companyId)?.name}
                </p>
              </div>
              <button onClick={closeConfigureModal} className="text-gray-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(configureModal.channel.type === 'email' || configureModal.channel.id === 'email') && (
                <>
                  <div className="p-3 bg-blue-900/40 border border-blue-600 rounded-lg mb-4">
                    <p className="text-sm text-blue-200 font-medium mb-2">Choose email provider</p>
                    <p className="text-xs text-blue-300/90">Outlook (Microsoft 365), Gmail / Google Workspace, or IMAP for any other provider (Yahoo, Fastmail, etc.).</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Provider</label>
                    <select
                      value={String(channelConfigValues.provider ?? 'outlook')}
                      onChange={(e) => updateChannelConfigValue('provider', e.target.value)}
                      className="w-full bg-gray-700 border-2 border-gray-500 rounded-lg px-4 py-3 text-white text-base focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500"
                    >
                      <option value="outlook">Microsoft Outlook / Exchange</option>
                      <option value="gmail">Gmail / Google Workspace</option>
                      <option value="imap">IMAP (other provider)</option>
                    </select>
                  </div>

                  {(channelConfigValues.provider === 'outlook' || !channelConfigValues.provider) && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Admin Email Account</label>
                        <input
                          type="email"
                          value={String(channelConfigValues.adminEmail ?? '')}
                          onChange={(e) => updateChannelConfigValue('adminEmail', e.target.value)}
                          placeholder="admin@company.com"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Account for Microsoft Graph API</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Azure Client Secret / App Password</label>
                        <input
                          type="password"
                          value={String(channelConfigValues.appPassword ?? '')}
                          onChange={(e) => updateChannelConfigValue('appPassword', e.target.value)}
                          placeholder="Azure app secret"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Exchange Server</label>
                        <input
                          type="text"
                          value={String(channelConfigValues.exchangeServer ?? '')}
                          onChange={(e) => updateChannelConfigValue('exchangeServer', e.target.value)}
                          placeholder="outlook.office365.com"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="monitorAllUserMailboxes"
                          checked={channelConfigValues.monitorAllUserMailboxes === true}
                          onChange={(e) => updateChannelConfigValue('monitorAllUserMailboxes', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor="monitorAllUserMailboxes" className="text-sm">Monitor all employee mailboxes (domain-wide)</label>
                      </div>
                      {channelConfigValues.monitorAllUserMailboxes === true && (
                        <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-green-700/50">
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Max employees to monitor</label>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={Number(channelConfigValues.maxUsers) || 100}
                              onChange={(e) => updateChannelConfigValue('maxUsers', parseInt(e.target.value, 10) || 100)}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Messages per employee</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={Number(channelConfigValues.messagesPerUser) || 5}
                              onChange={(e) => updateChannelConfigValue('messagesPerUser', parseInt(e.target.value, 10) || 5)}
                              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                            />
                          </div>
                        </div>
                      )}
                      <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                        <p className="text-sm text-green-300">
                          ✨ Outlook: automatic discovery of all mailboxes in your domain.
                        </p>
                      </div>
                    </>
                  )}

                  {channelConfigValues.provider === 'gmail' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Gmail Account</label>
                        <input
                          type="email"
                          value={String(channelConfigValues.adminEmail ?? '')}
                          onChange={(e) => updateChannelConfigValue('adminEmail', e.target.value)}
                          placeholder="you@gmail.com or user@company.com"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Gmail App Password</label>
                        <input
                          type="password"
                          value={String(channelConfigValues.appPassword ?? '')}
                          onChange={(e) => updateChannelConfigValue('appPassword', e.target.value)}
                          placeholder="16-character app password"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Google Account → Security → 2-Step Verification → App passwords</p>
                      </div>
                      <div className="p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                        <p className="text-sm text-amber-300">
                          📧 Gmail: this account will be monitored. Save config here; backend Gmail monitoring may require additional setup.
                        </p>
                      </div>
                    </>
                  )}

                  {channelConfigValues.provider === 'imap' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">IMAP Host</label>
                        <input
                          type="text"
                          value={String(channelConfigValues.imapHost ?? '')}
                          onChange={(e) => updateChannelConfigValue('imapHost', e.target.value)}
                          placeholder="imap.gmail.com or imap.company.com"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Port</label>
                          <input
                            type="number"
                            value={String(channelConfigValues.imapPort ?? '993')}
                            onChange={(e) => updateChannelConfigValue('imapPort', e.target.value)}
                            placeholder="993"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">993 (SSL) or 143</p>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="imapSecure"
                            checked={channelConfigValues.imapSecure !== false}
                            onChange={(e) => updateChannelConfigValue('imapSecure', e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="imapSecure" className="text-sm">Use TLS/SSL</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Email / Username</label>
                        <input
                          type="text"
                          value={String(channelConfigValues.adminEmail ?? '')}
                          onChange={(e) => updateChannelConfigValue('adminEmail', e.target.value)}
                          placeholder="user@company.com"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Password / App Password</label>
                        <input
                          type="password"
                          value={String(channelConfigValues.appPassword ?? '')}
                          onChange={(e) => updateChannelConfigValue('appPassword', e.target.value)}
                          placeholder="Password or app-specific password"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        />
                      </div>
                      <div className="p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                        <p className="text-sm text-amber-300">
                          📧 IMAP: any provider (Gmail, Yahoo, Fastmail, etc.). Config is saved; backend IMAP monitoring may require additional setup.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              {(configureModal.channel.type === 'additionalEmails' || configureModal.channel.id === 'additionalEmails') && (
                <>
                  <div className="p-3 bg-blue-900/40 border border-blue-600 rounded-lg mb-4">
                    <p className="text-sm text-blue-200 font-medium">Add Gmail or other IMAP mailboxes to monitor for this company</p>
                    <p className="text-xs text-blue-300/90 mt-1">These are in addition to the primary Email channel (Outlook). Each mailbox is monitored separately.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Configured mailboxes</span>
                      <button
                        type="button"
                        onClick={() => { setMailboxForm({ provider: 'gmail', adminEmail: '', appPassword: '', imapSecure: true }); setEditingMailboxIndex(-1); }}
                        className="text-sm py-1.5 px-3 rounded bg-lobster-600 hover:bg-lobster-500 text-white"
                      >
                        + Add mailbox
                      </button>
                    </div>
                    {additionalEmailsList.length === 0 && editingMailboxIndex !== -1 && (
                      <p className="text-sm text-gray-500">No additional mailboxes yet. Click &quot;Add mailbox&quot; to add Gmail or IMAP.</p>
                    )}
                    {additionalEmailsList.map((mb, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm text-white font-medium">{mb.adminEmail || '(no email)'}</span>
                          <span className="text-xs text-gray-400 ml-2">({mb.provider === 'gmail' ? 'Gmail' : 'IMAP'})</span>
                          {(mb as { oauthRefreshToken?: string }).oauthRefreshToken && (
                            <span className="ml-2 text-xs text-green-400">Signed in with Google</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setMailboxForm({ ...mb, imapSecure: mb.imapSecure !== false }); setEditingMailboxIndex(idx); }} className="text-xs text-lobster-400 hover:text-lobster-300">Edit</button>
                          <button type="button" onClick={() => { setAdditionalEmailsList(prev => prev.filter((_, i) => i !== idx)); setEditingMailboxIndex(null); }} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {editingMailboxIndex !== null && (
                    <div className="border border-gray-600 rounded-lg p-4 space-y-4 bg-gray-800/50">
                      <p className="text-sm font-medium text-gray-300">{editingMailboxIndex === -1 ? 'New mailbox' : 'Edit mailbox'}</p>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Provider</label>
                        <select value={mailboxForm.provider} onChange={(e) => setMailboxForm(f => ({ ...f, provider: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                          <option value="gmail">Gmail / Google Workspace</option>
                          <option value="imap">IMAP (other)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Email</label>
                        <input type="email" value={mailboxForm.adminEmail} onChange={(e) => setMailboxForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="user@gmail.com" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                      </div>
                      {mailboxForm.provider === 'gmail' && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Gmail sign-in</label>
                          <a
                            href={`/api/auth/google?state=${encodeURIComponent(JSON.stringify({
                              companyId: configureModal?.companyId ?? '',
                              channelType: 'additionalEmails',
                              mailboxIndex: editingMailboxIndex ?? -1,
                            }))}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-100 text-sm font-medium border border-gray-300"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            Sign in with Google
                          </a>
                          <p className="text-xs text-gray-500 mt-1">No App Password needed — use your Google account like on your phone.</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">App Password (optional if using Sign in with Google)</label>
                        <input type="password" value={mailboxForm.appPassword} onChange={(e) => setMailboxForm(f => ({ ...f, appPassword: e.target.value }))} placeholder="16-char app password" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                      </div>
                      {mailboxForm.provider === 'imap' && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">IMAP Host</label>
                            <input type="text" value={mailboxForm.imapHost || ''} onChange={(e) => setMailboxForm(f => ({ ...f, imapHost: e.target.value }))} placeholder="imap.gmail.com" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Port</label>
                              <input type="text" value={mailboxForm.imapPort ?? '993'} onChange={(e) => setMailboxForm(f => ({ ...f, imapPort: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                              <input type="checkbox" id="imapSecureMb" checked={mailboxForm.imapSecure !== false} onChange={(e) => setMailboxForm(f => ({ ...f, imapSecure: e.target.checked }))} className="w-4 h-4" />
                              <label htmlFor="imapSecureMb" className="text-xs text-gray-400">Use TLS</label>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { if (editingMailboxIndex === -1) setAdditionalEmailsList(prev => [...prev, { ...mailboxForm }]); else setAdditionalEmailsList(prev => prev.map((m, i) => i === editingMailboxIndex ? { ...mailboxForm } : m)); setEditingMailboxIndex(null); setMailboxForm({ provider: 'gmail', adminEmail: '', appPassword: '', imapSecure: true }); }} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-sm">{editingMailboxIndex === -1 ? 'Add' : 'Update'}</button>
                        <button type="button" onClick={() => { setEditingMailboxIndex(null); setMailboxForm({ provider: 'gmail', adminEmail: '', appPassword: '', imapSecure: true }); }} className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {configureModal.channel.type === 'teams' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Azure App ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.azureAppId ?? '')}
                      onChange={(e) => updateChannelConfigValue('azureAppId', e.target.value)}
                      placeholder="Enter Azure Application ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={String(channelConfigValues.clientSecret ?? '')}
                      onChange={(e) => updateChannelConfigValue('clientSecret', e.target.value)}
                      placeholder="Enter client secret"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tenant ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.tenantId ?? '')}
                      onChange={(e) => updateChannelConfigValue('tenantId', e.target.value)}
                      placeholder="Enter Azure Tenant ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">User Principal Name (for app-only)</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.userPrincipalName ?? '')}
                      onChange={(e) => updateChannelConfigValue('userPrincipalName', e.target.value)}
                      placeholder="e.g. strategic-monitor@company.com"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400 mb-2">Monitoring Options</label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Monitor all teams & channels (automatic discovery)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Include private messages (1-on-1 chats)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Include group chats</span>
                    </label>
                  </div>
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-sm text-green-300">
                      ✨ <strong>Automatic Discovery:</strong> The system will automatically find and monitor ALL teams, channels, and chats in your Microsoft Teams organization. No need to list individual team names!
                    </p>
                  </div>
                </>
              )}

              {configureModal.channel.type === 'slack' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Slack Bot Token</label>
                    <input
                      type="password"
                      placeholder="xoxb-..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Bot must have permissions to read all channels</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Workspace ID</label>
                    <input
                      type="text"
                      placeholder="T0000000000"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-400 mb-2">Monitoring Options</label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Monitor all public channels (automatic discovery)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Include direct messages</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">Include private channels (bot must be invited)</span>
                    </label>
                  </div>
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-sm text-green-300">
                      ✨ <strong>Automatic Discovery:</strong> The system will automatically find and monitor ALL public channels in your Slack workspace. For private channels, simply invite the bot once with <code className="bg-gray-800 px-1">/invite @Chanakya Monitor</code>
                    </p>
                  </div>
                </>
              )}

              {configureModal.channel.type === 'calendar' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Azure App ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.azureAppId ?? '')}
                      onChange={(e) => updateChannelConfigValue('azureAppId', e.target.value)}
                      placeholder="Azure Application ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={String(channelConfigValues.clientSecret ?? '')}
                      onChange={(e) => updateChannelConfigValue('clientSecret', e.target.value)}
                      placeholder="Azure client secret"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tenant ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.tenantId ?? '')}
                      onChange={(e) => updateChannelConfigValue('tenantId', e.target.value)}
                      placeholder="Azure Tenant ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">User Principal Name</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.userPrincipalName ?? '')}
                      onChange={(e) => updateChannelConfigValue('userPrincipalName', e.target.value)}
                      placeholder="e.g. strategic-monitor@company.com"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-sm text-green-300">
                      ✨ <strong>Automatic Discovery:</strong> The system will automatically find and monitor ALL user calendars in the @{companies.find(c => c.id === configureModal.companyId)?.domain} domain using Microsoft Graph API or Google Admin SDK!
                    </p>
                  </div>
                </>
              )}

              {configureModal.channel.type === 'documents' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">SharePoint URL</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.sharePointUrl ?? '')}
                      onChange={(e) => updateChannelConfigValue('sharePointUrl', e.target.value)}
                      placeholder="https://yourcompany.sharepoint.com"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Azure App ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.azureAppId ?? '')}
                      onChange={(e) => updateChannelConfigValue('azureAppId', e.target.value)}
                      placeholder="Azure Application ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={String(channelConfigValues.clientSecret ?? '')}
                      onChange={(e) => updateChannelConfigValue('clientSecret', e.target.value)}
                      placeholder="Azure client secret"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tenant ID</label>
                    <input
                      type="text"
                      value={String(channelConfigValues.tenantId ?? '')}
                      onChange={(e) => updateChannelConfigValue('tenantId', e.target.value)}
                      placeholder="Azure Tenant ID"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">File Types to Monitor</label>
                    <input
                      type="text"
                      placeholder=".docx, .xlsx, .pdf, .pptx"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to monitor all file types</p>
                  </div>
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <p className="text-sm text-green-300">
                      ✨ <strong>Automatic Discovery:</strong> The system will automatically find and monitor ALL SharePoint sites, document libraries, and OneDrive accounts in your organization. No need to specify individual folders!
                    </p>
                  </div>
                </>
              )}

              <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-sm text-blue-300">
                  🔒 <strong>Security:</strong> Credentials are encrypted and stored securely. Only used to monitor company-wide channels for strategic insights. Never shared with third parties.
                </p>
              </div>
              <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-300">
                  ⚠️ <strong>Company-Wide Monitoring:</strong> This will monitor ALL communications in this channel across the entire organization. Ensure you have proper authorization and comply with company policies and local privacy laws.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={closeConfigureModal}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveChannelConfig}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save size={20} />
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
