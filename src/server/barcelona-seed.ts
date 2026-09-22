/**
 * Barcelona pilot — SAMPLE dataset (phase 1).
 *
 * ★ INTEGRITY RULE ★
 * Access Atlas promises VERIFIED detail. We have not measured anything in
 * Barcelona, and nothing here is a real business. So:
 *   • every place name, address and measurement below is FICTIONAL — no real
 *     business is described, and no invented measurement is attributed to one;
 *   • every row carries `sample = true`, and the server functions surface that
 *     as "Prototype sample data — not yet field-verified";
 *   • neighborhoods are real Barcelona neighborhoods (Eixample, Gothic Quarter,
 *     Gràcia, Barceloneta, Poblenou) so the demo geography is legible;
 *   • `status` values are chosen honestly as *types of claim*:
 *       measured      — a number someone wrote down (illustrative here)
 *       estimated     — the business' own approximation, not verified
 *       unknown       — a profile-relevant detail nobody has published
 *       not_applicable— the detail does not apply to this place
 *     Unknowns are FEATURES: they feed the verify-before-booking list.
 *   • units are inches / ratios (1:12), matching the landing page's vocabulary
 *     (34″, 1:12, 24″) so phase 2's UI reads continuously with the site demo.
 *
 * The seed is applied idempotently on a natural key (`places.slug`,
 * `access_fields(place_id, category, field)`), so re-running updates in place
 * instead of duplicating rows.
 */

export type PlaceKind = "stay" | "activity";
export type FieldCategory =
  | "entrance"
  | "room"
  | "bathroom"
  | "venue"
  | "transport"
  | "terrain"
  | "contact";
export type FieldStatus = "measured" | "estimated" | "unknown" | "not_applicable";
export type FieldSource = "business" | "contributor" | "public_info" | "demo";

export type SeedPlace = {
  slug: string;
  kind: PlaceKind;
  name: string;
  neighborhood: string;
  address: string;
  summary: string;
};

export type SeedField = {
  slug: string;
  category: FieldCategory;
  field: string;
  label: string;
  value: string;
  unit: string | null;
  status: FieldStatus;
  source: FieldSource;
  note: string | null;
};

/** Field-row terse constructor — keeps the seed table readable. */
const f = (
  slug: string,
  category: FieldCategory,
  field: string,
  label: string,
  value: string,
  unit: string | null,
  status: FieldStatus,
  source: FieldSource,
  note: string | null = null,
): SeedField => ({ slug, category, field, label, value, unit, status, source, note });

export const SAMPLE_NOTICE = "Prototype sample data — not yet field-verified";

export const SEED_PLACES: SeedPlace[] = [
  {
    slug: "hotel-marbre-eixample",
    kind: "stay",
    name: "Hotel Marbre Eixample",
    neighborhood: "Eixample",
    address: "Carrer de la Llum 84, Eixample (fictional address)",
    summary:
      "Modern boutique hotel on a level Eixample street. Wheelchair-accessible room described by the hotel; the shower tray has never been published — the flagship “verify before booking” case.",
  },
  {
    slug: "pensio-tramuntana-gracia",
    kind: "stay",
    name: "Pensió Tramuntana",
    neighborhood: "Gràcia",
    address: "Carrer de la Font Vella 12, Gràcia (fictional address)",
    summary:
      "Small family guesthouse in a converted Gràcia townhouse. Three steps at the door, two flights of stairs inside, shower over a bath — the honest “not for me” example for stair-free profiles.",
  },
  {
    slug: "hotel-marina-blau-barceloneta",
    kind: "stay",
    name: "Hotel Marina Blau",
    neighborhood: "Barceloneta",
    address: "Passeig del Mar Blau 3, Barceloneta (fictional address)",
    summary:
      "Waterfront hotel with an accessible room. Almost everything here is the hotel's own estimate — nothing has been measured independently yet, which is itself the finding.",
  },
  {
    slug: "aparthotel-ronda-verda-poblenou",
    kind: "stay",
    name: "Aparthotel Ronda Verda",
    neighborhood: "Poblenou",
    address: "Ronda Verda 210, Poblenou (fictional address)",
    summary:
      "New-build aparthotel with a fully measured accessible apartment — the control case where almost every detail is published and measured.",
  },
  {
    slug: "museu-ciutat-vella-gotic",
    kind: "activity",
    name: "Museu de la Ciutat Vella",
    neighborhood: "Gothic Quarter",
    address: "Plaça de la Ciutat Vella 4, Gothic Quarter (fictional address)",
    summary:
      "Small history museum in the Gothic Quarter. The step-free route is the side door, not the main entrance, and the last 120 m of the approach is cobbled.",
  },
  {
    slug: "galeria-llum-nova-eixample",
    kind: "activity",
    name: "Galeria Llum Nova",
    neighborhood: "Eixample",
    address: "Carrer de la Llum 140, Eixample (fictional address)",
    summary:
      "Two-room contemporary gallery. The heavy 19th-century front door has never been measured and the gallery answers the telephone, not email.",
  },
  {
    slug: "teatre-del-far-poblenou",
    kind: "activity",
    name: "Teatre del Far",
    neighborhood: "Poblenou",
    address: "Carrer del Far 8, Poblenou (fictional address)",
    summary:
      "600-seat theatre with a level foyer and two wheelchair spaces — but amplified shows peak near 95 dB and every ticket is a fixed timed slot.",
  },
  {
    slug: "parc-turo-verd-gracia",
    kind: "activity",
    name: "Parc del Turó Verd",
    neighborhood: "Gràcia",
    address: "Camí del Turó 3, Gràcia (fictional address)",
    summary:
      "Hillside park above Gràcia. The main path is wide but gravel-surfaced; the shortcut from the metro is cobbled and much steeper than 1:12.",
  },
  {
    slug: "tast-mar-blau-barceloneta",
    kind: "activity",
    name: "Tast Mar Blau",
    neighborhood: "Barceloneta",
    address: "Carrer del Mar Blau 21, Barceloneta (fictional address)",
    summary:
      "Small seafood tasting room behind the promenade. Narrow door on a cobbled street, counter stools only — but the team answer questions in writing.",
  },
];

export const SEED_FIELDS: SeedField[] = [
  // ── Hotel Marbre Eixample (stay) — measured, except the shower tray ────────
  f("hotel-marbre-eixample", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level, no step at the door", null, "measured", "contributor", "No step and no ramp needed."),
  f("hotel-marbre-eixample", "entrance", "entrance_used", "Which entrance is step-free", "Main door on Carrer de la Llum", null, "measured", "contributor", "The courtyard door has two steps."),
  f("hotel-marbre-eixample", "entrance", "door_width", "Entrance door width", "34", "in", "measured", "contributor", "Clear opening."),
  f("hotel-marbre-eixample", "entrance", "threshold", "Entrance threshold height", "0.5", "in", "measured", "contributor", "Level threshold, no lip."),
  f("hotel-marbre-eixample", "room", "room_door_width", "Room door width", "32", "in", "measured", "contributor", null),
  f("hotel-marbre-eixample", "room", "turning_circle", "Turning circle in room", "60", "in", "measured", "contributor", "Measured in the accessible room, between bed and window."),
  f("hotel-marbre-eixample", "room", "bed_height", "Bed height", "24", "in", "measured", "contributor", null),
  f("hotel-marbre-eixample", "room", "transfer_space_beside_bed", "Space beside bed", "36", "in", "measured", "contributor", "Clear on both sides of the bed."),
  f("hotel-marbre-eixample", "room", "noise_level", "Noise level", "Quiet — room faces the inner courtyard", null, "measured", "contributor", null),
  f("hotel-marbre-eixample", "room", "elevator_status", "Elevator status", "Operational, serves all floors", null, "measured", "contributor", null),
  f("hotel-marbre-eixample", "room", "elevator_door_width", "Elevator door width", "32", "in", "measured", "contributor", null),
  f("hotel-marbre-eixample", "room", "elevator_cabin_dimensions", "Elevator cabin dimensions", "5 × 4", "ft", "measured", "contributor", null),
  f("hotel-marbre-eixample", "bathroom", "roll_in_shower", "Roll-in shower", "Yes — flat entry, no lip", null, "measured", "contributor", "Confirmed on a contributor visit."),
  f("hotel-marbre-eixample", "bathroom", "shower_tray_dimensions", "Shower tray dimensions", "Not published", null, "unknown", "public_info", "The hotel says “roll-in shower” but publishes no tray dimensions or plan. Ask in writing for the tray size and a photo of the bathroom before booking."),
  f("hotel-marbre-eixample", "bathroom", "shower_seat", "Shower seat", "Removable seat on request", null, "measured", "business", null),
  f("hotel-marbre-eixample", "bathroom", "grab_bars", "Grab bars", "Fixed bars at the shower and the toilet", null, "measured", "contributor", null),
  f("hotel-marbre-eixample", "bathroom", "toilet_height", "Toilet height", "18", "in", "measured", "contributor", null),
  f("hotel-marbre-eixample", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Passeig de la Llum — step-free, street to platform", null, "measured", "public_info", null),
  f("hotel-marbre-eixample", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Level kerb directly at the door", null, "measured", "contributor", null),
  f("hotel-marbre-eixample", "terrain", "approach_surface", "Approach surface", "Paved, level sidewalk; a 40 m stretch of cobbles at the corner", null, "measured", "contributor", null),
  f("hotel-marbre-eixample", "terrain", "gradient", "Approach gradient", "1:20", null, "measured", "contributor", "Gentle, well under 1:12."),
  f("hotel-marbre-eixample", "venue", "room_move_policy", "Room-change policy", "Will move guests to another room if a detail proves wrong", null, "measured", "business", null),
  f("hotel-marbre-eixample", "contact", "contact_preference", "How to ask questions", "Email and web form, answered in writing", null, "measured", "business", null),

  // ── Pensió Tramuntana (stay) — the honest "not for me" case ───────────────
  f("pensio-tramuntana-gracia", "entrance", "step_free_entrance", "Step-free entrance", "No — three steps at the entrance, stairs to every room", null, "measured", "contributor", "18 cm per step, no ramp."),
  f("pensio-tramuntana-gracia", "entrance", "door_width", "Entrance door width", "30", "in", "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "entrance", "threshold", "Entrance threshold height", "7", "in", "measured", "contributor", "Three 18 cm steps in practice; the flat threshold does not exist."),
  f("pensio-tramuntana-gracia", "room", "room_door_width", "Room door width", "28", "in", "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "room", "turning_circle", "Turning circle in room", "Not published", null, "unknown", "public_info", "No room plan or measurements published. Ask the guesthouse for the free floor space and a photo before booking."),
  f("pensio-tramuntana-gracia", "room", "bed_height", "Bed height", "26", "in", "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "room", "transfer_space_beside_bed", "Space beside bed", "Not published", null, "unknown", "public_info", "The guesthouse has not published how much clear space is beside the bed (rooms differ)."),
  f("pensio-tramuntana-gracia", "room", "noise_level", "Noise level", "Quiet — rooms face the inner courtyard", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "room", "elevator_status", "Elevator status", "No elevator — 2 flights of stairs (24 steps) to all rooms", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "bathroom", "roll_in_shower", "Roll-in shower", "No — shower over a bath, no roll-in", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "bathroom", "shower_seat", "Shower seat", "None", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "bathroom", "grab_bars", "Grab bars", "None", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "bathroom", "toilet_height", "Toilet height", "16", "in", "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Font Vella — stairs only at the street entrance, no elevator", null, "measured", "public_info", null),
  f("pensio-tramuntana-gracia", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Steps from the kerb up to the door (3 steps)", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "terrain", "approach_surface", "Approach surface", "Paved plaza, then 60 m of cobblestones up to the door", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "terrain", "gradient", "Approach gradient", "1:8 on the last 15 m (steep cobbled ramp)", null, "measured", "contributor", null),
  f("pensio-tramuntana-gracia", "contact", "contact_preference", "How to ask questions", "Phone only — no email or web form published", null, "measured", "public_info", null),

  // ── Hotel Marina Blau (stay) — estimates only, no independent measurement ─
  f("hotel-marina-blau-barceloneta", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level from the promenade", null, "estimated", "business", "Hotel's own description; not measured independently."),
  f("hotel-marina-blau-barceloneta", "entrance", "entrance_used", "Which entrance is step-free", "Front entrance, promenade side", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "entrance", "door_width", "Entrance door width", "36", "in", "estimated", "business", "Hotel estimate (“wide enough for a wheelchair”)."),
  f("hotel-marina-blau-barceloneta", "room", "room_door_width", "Room door width", "32", "in", "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "room", "turning_circle", "Turning circle in room", "60", "in", "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "room", "bed_height", "Bed height", "24", "in", "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "room", "transfer_space_beside_bed", "Space beside bed", "Not published", null, "unknown", "business", "The hotel says “space for a wheelchair” but gives no measurement, and rooms differ."),
  f("hotel-marina-blau-barceloneta", "room", "noise_level", "Noise level", "Moderate — street-facing rooms pick up promenade noise until about midnight", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "room", "elevator_status", "Elevator status", "Operational, but guests report long waits at peak times", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "bathroom", "roll_in_shower", "Roll-in shower", "Yes", null, "estimated", "business", "Hotel states a roll-in shower; no tray dimensions given."),
  f("hotel-marina-blau-barceloneta", "bathroom", "shower_seat", "Shower seat", "Removable", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "bathroom", "grab_bars", "Grab bars", "Yes", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "bathroom", "toilet_height", "Toilet height", "17", "in", "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Low-floor bus 39 stop 120 m away; metro Barceloneta has an elevator whose status changes often", null, "estimated", "public_info", null),
  f("hotel-marina-blau-barceloneta", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Level promenade directly in front of the door", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "terrain", "approach_surface", "Approach surface", "Paved promenade and boardwalk — level, no cobbles", null, "measured", "contributor", null),
  f("hotel-marina-blau-barceloneta", "terrain", "gradient", "Approach gradient", "1:50", null, "estimated", "business", null),
  f("hotel-marina-blau-barceloneta", "venue", "room_move_policy", "Room-change policy", "No room changes after booking (per booking terms)", null, "measured", "business", null),
  f("hotel-marina-blau-barceloneta", "contact", "contact_preference", "How to ask questions", "Email, WhatsApp or web form", null, "measured", "business", null),

  // ── Aparthotel Ronda Verda (stay) — fully measured control case ────────────
  f("aparthotel-ronda-verda-poblenou", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level, automatic sliding doors", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "entrance", "entrance_used", "Which entrance is step-free", "Main entrance on Ronda Verda", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "entrance", "door_width", "Entrance door width", "40", "in", "measured", "contributor", "Automatic sliding doors, clear opening."),
  f("aparthotel-ronda-verda-poblenou", "entrance", "threshold", "Entrance threshold height", "0", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "room_door_width", "Room door width", "36", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "turning_circle", "Turning circle in room", "70", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "bed_height", "Bed height", "23", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "transfer_space_beside_bed", "Space beside bed", "40", "in", "measured", "contributor", "Clear on both sides."),
  f("aparthotel-ronda-verda-poblenou", "room", "noise_level", "Noise level", "Quiet — courtyard side, double glazing", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "elevator_status", "Elevator status", "Operational — two lifts, both serve all floors", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "elevator_door_width", "Elevator door width", "36", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "room", "elevator_cabin_dimensions", "Elevator cabin dimensions", "6 × 5", "ft", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "roll_in_shower", "Roll-in shower", "Yes — level entry, floor drain", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "shower_tray_dimensions", "Shower tray dimensions", "60 × 47", "in", "measured", "contributor", "150 × 120 cm, taped on a contributor visit; floor drain at the entry."),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "shower_seat", "Shower seat", "Fold-down seat, fixed", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "grab_bars", "Grab bars", "Fixed bars at the shower and the toilet", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "toilet_height", "Toilet height", "18", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "bathroom_turning_circle", "Turning circle in bathroom", "64", "in", "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "bathroom", "toilet_transfer_side", "Toilet transfer side", "Left and right", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Ronda Verda — step-free, lifts to platform", null, "measured", "public_info", null),
  f("aparthotel-ronda-verda-poblenou", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Level kerb, covered drop-off bay", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "terrain", "approach_surface", "Approach surface", "Paved, level, smooth — no cobbles", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "terrain", "gradient", "Approach gradient", "1:50", null, "measured", "contributor", null),
  f("aparthotel-ronda-verda-poblenou", "venue", "room_move_policy", "Room-change policy", "Will move guests to another room if a detail proves wrong", null, "measured", "business", null),
  f("aparthotel-ronda-verda-poblenou", "contact", "contact_preference", "How to ask questions", "Email and web form; video call on request", null, "measured", "business", null),

  // ── Museu de la Ciutat Vella (activity) ──────────────────────────────────
  f("museu-ciutat-vella-gotic", "entrance", "step_free_entrance", "Step-free entrance", "Yes — side door on Carrer dels Corders", null, "measured", "contributor", "The main entrance on the square has 12 steps."),
  f("museu-ciutat-vella-gotic", "entrance", "entrance_used", "Which entrance is step-free", "Side door around the corner from the main entrance", null, "measured", "contributor", "Adds roughly 5 minutes from the square."),
  f("museu-ciutat-vella-gotic", "entrance", "door_width", "Entrance door width", "33", "in", "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "entrance", "threshold", "Entrance threshold height", "1", "in", "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "bathroom", "accessible_toilet", "Accessible toilet", "Yes — level, 44 in transfer space on the left", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "bathroom", "toilet_height", "Toilet height", "17", "in", "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "venue", "noise_level", "Noise level", "Quiet on weekdays; school groups mid-morning", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "venue", "seating", "Seating", "Benches in most rooms; portable stools at the desk", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "venue", "timed_entry", "Entry and timing", "Open entry — no timed slot, tickets valid all day", null, "measured", "business", null),
  f("museu-ciutat-vella-gotic", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Ciutat Vella — stairs only from the square; step-free route is via Jaume Nord, 350 m", null, "measured", "public_info", null),
  f("museu-ciutat-vella-gotic", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Level kerb on Carrer dels Corders, 20 m from the side door", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "terrain", "approach_surface", "Approach surface", "120 m of cobblestones between the square and the side door", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "terrain", "gradient", "Approach gradient", "1:25, gentle rise", null, "measured", "contributor", null),
  f("museu-ciutat-vella-gotic", "contact", "contact_preference", "How to ask questions", "Email, answered in writing", null, "measured", "business", null),

  // ── Galeria Llum Nova (activity) — unmeasured door + phone-only ───────────
  f("galeria-llum-nova-eixample", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level from the street", null, "measured", "contributor", null),
  f("galeria-llum-nova-eixample", "entrance", "door_width", "Entrance door width", "Not published", null, "unknown", "public_info", "Heavy 19th-century door; the gallery has never published a clear opening width. Ask for a photo with a tape measure across the opening."),
  f("galeria-llum-nova-eixample", "entrance", "threshold", "Entrance threshold height", "1.5", "in", "measured", "contributor", "Small lip at the door."),
  f("galeria-llum-nova-eixample", "bathroom", "accessible_toilet", "Accessible toilet", "Not published", null, "unknown", "public_info", "The gallery lists an “accessible WC” but publishes no dimensions or transfer side."),
  f("galeria-llum-nova-eixample", "venue", "noise_level", "Noise level", "Moderate — street noise when the front door is open", null, "estimated", "contributor", null),
  f("galeria-llum-nova-eixample", "venue", "seating", "Seating", "Two benches; no armrests", null, "measured", "contributor", null),
  f("galeria-llum-nova-eixample", "venue", "timed_entry", "Entry and timing", "Open entry — no timed slot", null, "measured", "business", null),
  f("galeria-llum-nova-eixample", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Llum Nova — step-free, elevator to street", null, "measured", "public_info", null),
  f("galeria-llum-nova-eixample", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Level kerb at the door", null, "measured", "contributor", null),
  f("galeria-llum-nova-eixample", "terrain", "approach_surface", "Approach surface", "Paved, level sidewalk — no cobbles", null, "measured", "contributor", null),
  f("galeria-llum-nova-eixample", "terrain", "gradient", "Approach gradient", "1:40", null, "measured", "contributor", null),
  f("galeria-llum-nova-eixample", "contact", "contact_preference", "How to ask questions", "Phone only — no email or web form published", null, "measured", "public_info", null),

  // ── Teatre del Far (activity) — loud + fixed times ───────────────────────
  f("teatre-del-far-poblenou", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level foyer from the street, automatic doors", null, "measured", "contributor", null),
  f("teatre-del-far-poblenou", "entrance", "door_width", "Entrance door width", "42", "in", "measured", "contributor", "Automatic doors."),
  f("teatre-del-far-poblenou", "bathroom", "accessible_toilet", "Accessible toilet", "Yes — level, 40 in transfer space, right-hand transfer", null, "measured", "contributor", null),
  f("teatre-del-far-poblenou", "bathroom", "toilet_height", "Toilet height", "17", "in", "measured", "contributor", null),
  f("teatre-del-far-poblenou", "venue", "noise_level", "Noise level", "Loud — amplified music, peaks near 95 dB during shows", null, "measured", "contributor", "Measured with a phone sound meter in row 12 during a soundcheck."),
  f("teatre-del-far-poblenou", "venue", "quiet_hours", "Quieter options", "Quiet-adapted performance on the first Sunday of the month", null, "measured", "business", null),
  f("teatre-del-far-poblenou", "venue", "seating", "Seating", "2 wheelchair spaces in row 12 with companion seats beside; fixed rows elsewhere", null, "measured", "business", null),
  f("teatre-del-far-poblenou", "venue", "timed_entry", "Entry and timing", "Timed entry — fixed show times, doors close at the start", null, "measured", "business", null),
  f("teatre-del-far-poblenou", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Far Nord — step-free, lifts to street", null, "measured", "public_info", null),
  f("teatre-del-far-poblenou", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Drop-off bay 15 m from the foyer, level kerb", null, "measured", "contributor", null),
  f("teatre-del-far-poblenou", "terrain", "approach_surface", "Approach surface", "Paved plaza — no cobbles", null, "measured", "contributor", null),
  f("teatre-del-far-poblenou", "terrain", "gradient", "Approach gradient", "1:60", null, "measured", "contributor", null),
  f("teatre-del-far-poblenou", "contact", "contact_preference", "How to ask questions", "Email and web form; phone for same-day requests", null, "measured", "business", null),

  // ── Parc del Turó Verd (activity) — gravel, steep shortcut, no WC data ───
  f("parc-turo-verd-gracia", "entrance", "step_free_entrance", "Step-free entrance", "Yes — level gate on the Carrer de la Font Vella side", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "entrance", "door_width", "Gate clear width", "44", "in", "measured", "contributor", null),
  f("parc-turo-verd-gracia", "bathroom", "accessible_toilet", "Accessible toilet", "Not published", null, "unknown", "public_info", "The park lists a WC but publishes no dimensions; staff were not available to ask."),
  f("parc-turo-verd-gracia", "venue", "noise_level", "Noise level", "Quiet — birdsong, occasional school groups", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "venue", "seating", "Seating", "Benches roughly every 80 m along the main path", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "venue", "timed_entry", "Entry and timing", "Open entry, no booking", null, "measured", "public_info", null),
  f("parc-turo-verd-gracia", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Metro Font Vella — stairs only at the park side; step-free route is 600 m via Carrer Gran", null, "measured", "public_info", null),
  f("parc-turo-verd-gracia", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Taxi can reach the upper gate; level kerb", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "terrain", "approach_surface", "Approach surface", "Gravel main path (compacted, loose in patches); 60 m cobbled shortcut from the metro", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "terrain", "path_width", "Main path width", "80", "in", "measured", "contributor", null),
  f("parc-turo-verd-gracia", "terrain", "gradient", "Approach gradient", "1:14 on the main path; 1:6 on the shortcut", null, "measured", "contributor", null),
  f("parc-turo-verd-gracia", "contact", "contact_preference", "How to ask questions", "Email, answered in writing by the park office", null, "measured", "business", null),

  // ── Tast Mar Blau (activity) — narrow door, cobbles, unusable WC ─────────
  f("tast-mar-blau-barceloneta", "entrance", "step_free_entrance", "Step-free entrance", "Yes — one 4 in lip at the door, no steps", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "entrance", "door_width", "Entrance door width", "31", "in", "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "entrance", "threshold", "Entrance threshold height", "4", "in", "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "bathroom", "accessible_toilet", "Accessible toilet", "No — the WC is downstairs, 6 steps", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "venue", "noise_level", "Noise level", "Moderate — loud when full (small room, hard surfaces)", null, "estimated", "contributor", null),
  f("tast-mar-blau-barceloneta", "venue", "seating", "Seating", "Fixed stools at the counter; one low table in the corner", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "venue", "timed_entry", "Entry and timing", "Fixed tasting slots (19:00 and 21:00), booked in advance", null, "measured", "business", null),
  f("tast-mar-blau-barceloneta", "transport", "nearest_accessible_metro", "Nearest step-free metro", "Low-floor bus 39 on the promenade; metro Barceloneta elevator status changes often", null, "estimated", "public_info", null),
  f("tast-mar-blau-barceloneta", "transport", "accessible_taxi_dropoff", "Accessible taxi drop-off", "Taxi stops on the promenade; 40 m of cobbles to the door", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "terrain", "approach_surface", "Approach surface", "40 m of cobblestones from the promenade to the door", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "terrain", "gradient", "Approach gradient", "1:30", null, "measured", "contributor", null),
  f("tast-mar-blau-barceloneta", "contact", "contact_preference", "How to ask questions", "Email or web form, answered in writing", null, "measured", "business", null),
];
