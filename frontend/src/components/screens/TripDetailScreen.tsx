/**
 * TripDetailScreen — shows a single trip and offers Cancel + Reschedule.
 *
 * Cancel flow:
 *  1. Tap "Cancel flight"
 *  2. Show refund amount + confirm/cancel buttons
 *  3. On confirm, call /booking/{id}/cancel/confirm and show success
 *
 * Reschedule flow:
 *  1. Tap "Change date"
 *  2. Pick a new date
 *  3. See options with price differences
 *  4. Pick one and confirm
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Volume2,
  Calendar,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Plane,
  Sparkles,
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak } from "../../hooks/useSpeech";
import { api } from "../../services/api";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { Badge } from "../ui/Badge";
import { NavFn } from "../../types";
import { formatDateSpoken, formatTime, stopLabel } from "../../lib/format";
import type { BookingResult, RescheduleOffer } from "../../types";
import { addDaysIso, todayIso } from "../../lib/format";

interface TripDetailScreenProps {
  navigate: NavFn;
  params?: { bookingId?: string };
}

type Flow = "view" | "cancel-confirm" | "cancel-done" | "reschedule-date" | "reschedule-options" | "reschedule-done";

export function TripDetailScreen({ navigate, params }: TripDetailScreenProps) {
  const { trips, refreshTrips } = useUser();
  const booking = trips.find((t) => t.id === params?.bookingId);
  const [flow, setFlow] = useState<Flow>("view");
  const [cancelData, setCancelData] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string>(addDaysIso(todayIso(), 7));
  const [rescheduleOptions, setRescheduleOptions] = useState<RescheduleOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<RescheduleOffer | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) navigate("bookings");
  }, [booking, navigate]);

  if (!booking) return null;

  function handleReadBooking() {
    speak({
      text: `From ${booking.origin} to ${booking.destination}, on ${formatDateSpoken(booking.departure_date)}. Status ${booking.status}. Reference ${booking.booking_reference || "pending"}. ${booking.total_amount || ""}.`,
    });
  }

  async function handleStartCancel() {
    setFlow("cancel-confirm");
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res: any = await api.cancelBooking(booking.id);
      setCancelData(res);
      speak({
        text: `Cancellation initiated. You'll get ${res.refund_amount} ${res.refund_currency} back. Say "confirm" or tap the confirm button.`,
      });
    } catch (e: any) {
      setCancelError(e?.message ?? "Cancellation failed");
      speak({ text: `Sorry, I couldn't start the cancellation. ${e?.message || ""}` });
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelData?.cancellation_id) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      await api.confirmCancellation(booking.id, cancelData.cancellation_id);
      setFlow("cancel-done");
      speak({ text: `Booking cancelled. ${cancelData.refund_amount} ${cancelData.refund_currency} will be refunded.` });
      await refreshTrips();
    } catch (e: any) {
      setCancelError(e?.message ?? "Confirmation failed");
    } finally {
      setCancelLoading(false);
    }
  }

  function handleRescheduleClick() {
    setFlow("reschedule-date");
  }

  async function handleSearchReschedule() {
    if (!newDate) return;
    setFlow("reschedule-options");
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await api.rescheduleSearch(booking.id, newDate);
      setRescheduleOptions(res.change_offers || []);
      speak({
        text: `Found ${res.change_offers?.length || 0} reschedule options for ${formatDateSpoken(newDate)}.`,
      });
    } catch (e: any) {
      setRescheduleError(e?.message ?? "Search failed");
      speak({ text: `Reschedule search failed. ${e?.message || ""}` });
    } finally {
      setRescheduleLoading(false);
    }
  }

  async function handleConfirmReschedule() {
    if (!selectedOffer) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      await api.rescheduleConfirm(booking.id, selectedOffer.offer_id);
      setFlow("reschedule-done");
      speak({ text: `Reschedule confirmed. ${selectedOffer.airline} on ${formatDateSpoken(newDate)}.` });
      await refreshTrips();
    } catch (e: any) {
      setRescheduleError(e?.message ?? "Reschedule failed");
    } finally {
      setRescheduleLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.75) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("bookings")}
            aria-label="Back to trips"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            "
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">Trip details</h1>
            <p className="text-sm text-slate-400 truncate">
              {booking.origin} → {booking.destination}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReadBooking}
            aria-label="Read booking details aloud"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            "
          >
            <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {flow === "view" && (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-5 pt-4 space-y-4"
          >
            <GlassCard className="p-5" ariaLabel="Trip summary">
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  color={
                    booking.status === "cancelled"
                      ? "red"
                      : booking.status === "rescheduled"
                        ? "amber"
                        : "green"
                  }
                >
                  {booking.status || "confirmed"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-center flex-1">
                  <p className="text-3xl font-extrabold text-white">{booking.origin}</p>
                </div>
                <Plane size={20} className="text-slate-400" aria-hidden="true" />
                <div className="text-center flex-1">
                  <p className="text-3xl font-extrabold text-white">
                    {booking.destination}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-base text-slate-300">
                <Calendar size={16} aria-hidden="true" />
                <span>{formatDateSpoken(booking.departure_date)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/8 space-y-2 text-sm">
                <Row label="Reference" value={booking.booking_reference || "—"} mono />
                <Row label="Passenger" value={booking.passenger_name || "—"} />
                <Row
                  label="Assistance"
                  value={
                    booking.passenger_assistance === "wheelchair"
                      ? "Wheelchair"
                      : booking.passenger_assistance === "visual"
                        ? "Visual"
                        : "None"
                  }
                />
                {booking.total_amount && <Row label="Total" value={booking.total_amount} />}
              </div>
            </GlassCard>

            {booking.status !== "cancelled" && booking.duffel_order_id && (
              <div className="space-y-3">
                <PrimaryButton
                  onClick={handleRescheduleClick}
                  variant="secondary"
                  size="lg"
                  icon={<RefreshCw size={20} />}
                  className="w-full"
                >
                  Change date
                </PrimaryButton>
                <PrimaryButton
                  onClick={handleStartCancel}
                  variant="danger"
                  size="lg"
                  icon={<X size={20} />}
                  className="w-full"
                  loading={cancelLoading}
                >
                  Cancel flight
                </PrimaryButton>
              </div>
            )}
            {!booking.duffel_order_id && (
              <GlassCard className="p-4" ariaLabel="Notice">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-amber-100">
                    Cancel and reschedule require a confirmed Duffel booking.
                  </p>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}

        {flow === "cancel-confirm" && (
          <motion.div
            key="cancel-confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-5 pt-4 space-y-4"
          >
            <GlassCard className="p-5" ariaLabel="Cancellation summary">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.2)" }}
                  aria-hidden="true"
                >
                  <X size={22} className="text-red-300" />
                </div>
                <p className="text-xl font-bold text-white">Cancel this flight?</p>
              </div>
              {cancelData ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                    <p className="text-xs uppercase tracking-widest font-bold text-emerald-300 mb-1">
                      You'll receive
                    </p>
                    <p className="text-3xl font-extrabold text-emerald-200">
                      {cancelData.refund_amount} {cancelData.refund_currency}
                    </p>
                    <p className="text-sm text-emerald-200/70 mt-1">
                      Status: {cancelData.status}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-base text-slate-300">Calculating refund…</p>
              )}
              {cancelError && (
                <div role="alert" className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-400/30">
                  <p className="text-sm text-red-100">{cancelError}</p>
                </div>
              )}
            </GlassCard>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancelData || cancelLoading}
                className="
                  w-full min-h-[72px] rounded-2xl
                  flex items-center justify-center gap-3
                  font-bold text-white text-lg
                  focus:outline-none focus:ring-4 focus:ring-red-400/70
                  active:scale-[0.98] transition-all
                  disabled:opacity-50
                "
                style={{
                  background: "linear-gradient(135deg,#DC2626,#EF4444)",
                  boxShadow: "0 10px 30px rgba(220,38,38,0.4)",
                }}
              >
                {cancelLoading ? (
                  <span className="inline-block w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                ) : (
                  <X size={22} strokeWidth={3} aria-hidden="true" />
                )}
                <span>{cancelLoading ? "Cancelling…" : "Yes, cancel"}</span>
              </button>
              <PrimaryButton
                onClick={() => {
                  setFlow("view");
                  setCancelData(null);
                }}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Keep my booking
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {flow === "cancel-done" && (
          <motion.div
            key="cancel-done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pt-4"
          >
            <GlassCard className="p-6 text-center" ariaLabel="Cancellation complete">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                aria-hidden="true"
              >
                <Check size={40} color="#fff" strokeWidth={3} />
              </div>
              <p className="text-2xl font-extrabold text-white mb-2">
                Booking cancelled
              </p>
              <p className="text-base text-slate-300">
                {cancelData?.refund_amount} {cancelData?.refund_currency} will be refunded.
              </p>
              <div className="mt-6">
                <PrimaryButton
                  onClick={() => navigate("bookings")}
                  size="lg"
                  className="w-full"
                >
                  Back to my trips
                </PrimaryButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {flow === "reschedule-date" && (
          <motion.div
            key="reschedule-date"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-5 pt-4 space-y-4"
          >
            <GlassCard className="p-5" ariaLabel="Choose new date">
              <p className="text-lg font-bold text-white mb-1">Change to which date?</p>
              <p className="text-sm text-slate-400 mb-4">
                We'll find alternative flights and any extra cost
              </p>
              <label htmlFor="new-date" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                New departure date
              </label>
              <div className="relative">
                <Calendar
                  size={22}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="new-date"
                  type="date"
                  value={newDate}
                  min={todayIso()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="
                    w-full h-[64px] pl-14 pr-4 rounded-2xl
                    bg-black/30 border border-white/10
                    text-lg text-white
                    focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                    [color-scheme:dark]
                  "
                />
              </div>
            </GlassCard>
            <div className="space-y-3">
              <PrimaryButton
                onClick={handleSearchReschedule}
                size="xl"
                icon={<Sparkles size={22} />}
                className="w-full"
              >
                Find options
              </PrimaryButton>
              <PrimaryButton
                onClick={() => setFlow("view")}
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Back
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {flow === "reschedule-options" && (
          <motion.div
            key="reschedule-options"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pt-4 space-y-4"
          >
            <h2 className="text-base font-bold text-white">
              Options for {formatDateSpoken(newDate)}
            </h2>
            {rescheduleLoading && (
              <div className="text-center py-12">
                <div className="inline-block w-10 h-10 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" aria-hidden="true" />
                <p className="text-base text-slate-300 mt-4">Finding options…</p>
              </div>
            )}
            {rescheduleError && (
              <div role="alert" className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30">
                <p className="text-sm text-red-100">{rescheduleError}</p>
              </div>
            )}
            {rescheduleOptions.length === 0 && !rescheduleLoading && !rescheduleError && (
              <GlassCard className="p-5 text-center">
                <p className="text-base text-slate-300">No options for this date.</p>
                <p className="text-sm text-slate-400 mt-1">Try a different date.</p>
              </GlassCard>
            )}
            {rescheduleOptions.map((o, i) => {
              const isSelected = selectedOffer?.offer_id === o.offer_id;
              return (
                <GlassCard
                  key={o.offer_id}
                  className={`p-4 ${isSelected ? "ring-2 ring-indigo-400/60" : ""}`}
                  selected={isSelected}
                  onClick={() => {
                    setSelectedOffer(o);
                    speak({
                      text: `Selected ${o.airline} flight ${o.flight_number}. Total change ${o.change_total} ${o.currency}.`,
                    });
                  }}
                  ariaLabel={`${o.airline} flight ${o.flight_number}, departing ${formatTime(o.departure_time)}, total change ${o.change_total} ${o.currency}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                      aria-hidden="true"
                    >
                      <Plane size={18} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-white">
                        {o.airline} {o.flight_number}
                      </p>
                      <p className="text-sm text-slate-400">
                        {formatTime(o.departure_time)} → {formatTime(o.arrival_time)}
                      </p>
                    </div>
                    {i === 0 && <Badge color="green" icon={<Sparkles size={12} />}>Cheapest</Badge>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/8">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                        Total change
                      </p>
                      <p className="text-2xl font-extrabold text-white">
                        {o.change_total} {o.currency}
                      </p>
                      {parseFloat(o.penalty_amount) > 0 && (
                        <p className="text-xs text-amber-200 mt-0.5">
                          (incl. {o.penalty_amount} penalty)
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                        aria-hidden="true"
                      >
                        <Check size={22} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
            {selectedOffer && (
              <div className="pt-2">
                <PrimaryButton
                  onClick={handleConfirmReschedule}
                  size="xl"
                  icon={<Check size={22} />}
                  loading={rescheduleLoading}
                  className="w-full"
                >
                  Confirm reschedule
                </PrimaryButton>
              </div>
            )}
          </motion.div>
        )}

        {flow === "reschedule-done" && (
          <motion.div
            key="reschedule-done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-5 pt-4"
          >
            <GlassCard className="p-6 text-center" ariaLabel="Reschedule complete">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#16A34A,#22C55E)" }}
                aria-hidden="true"
              >
                <Check size={40} color="#fff" strokeWidth={3} />
              </div>
              <p className="text-2xl font-extrabold text-white mb-2">Flight moved</p>
              <p className="text-base text-slate-300">
                Your trip is now on {formatDateSpoken(newDate)}.
              </p>
              <div className="mt-6">
                <PrimaryButton
                  onClick={() => navigate("bookings")}
                  size="lg"
                  className="w-full"
                >
                  Back to my trips
                </PrimaryButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm font-semibold text-white ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
