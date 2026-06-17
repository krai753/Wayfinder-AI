/** Wayfinder AI — TypeScript Types matching Backend Models */

export interface AirportResult {
  iata: string;
  name: string;
  city: string;
  country: string;
  tz: string;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  price: string;
  currency: string;
  cabin_class: string;
  stops: number;
  passenger_id?: string;
}

export interface FlightSearchResult {
  origin: string;
  origin_name: string;
  destination: string;
  destination_name: string;
  departure_date: string;
  passengers: number;
  offer_count: number;
  offers: FlightOffer[];
}

export interface BudgetSearchResult {
  origin: string;
  origin_name: string;
  destination: string;
  destination_name: string;
  departure_date: string;
  passengers: number;
  max_price: number;
  total_offers_found: number;
  offers_within_budget: number;
  offers: FlightOffer[];
}

export interface WizardSession {
  id: string;
  current_step: string;
  origin?: string;
  origin_name?: string;
  destination?: string;
  destination_name?: string;
  departure_date?: string;
  selected_offer_id?: string;
  selected_flight_summary?: string;
  passenger_name?: string;
  passenger_assistance?: string;
  booking_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingResult {
  id: string;
  session_id: string;
  status: string;
  origin: string;
  destination: string;
  departure_date: string;
  passenger_name?: string;
  flight_summary?: string;
  total_amount?: string;
  booking_reference?: string;
  created_at?: string;
}

export interface HistoryResult {
  user_id: string;
  count: number;
  total_count: number;
  bookings: BookingResult[];
}

export interface PortfolioResult {
  total_trips: number;
  total_spent: string;
  favorite_route: string;
  upcoming_trips: any[];
  cancelled_count: number;
}

export interface CancelResult {
  cancellation_id: string;
  refund_amount: string;
  refund_currency: string;
  status: string;
  booking_id?: string;
}

export interface RescheduleOffer {
  offer_id: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  price: string;
  currency: string;
  penalty_amount: string;
  change_total: string;
}

export interface RescheduleResult {
  booking_id: string;
  new_date: string;
  change_offers: RescheduleOffer[];
  offer_count: number;
  message?: string;
}

export interface VoiceCommandResult {
  intent: string;
  parameters: Record<string, any>;
  response_text: string;
}

export interface VoiceListenResult {
  transcript: string;
  filename: string;
  length: number;
}

export interface ApiError {
  detail: string;
}