/** Coffee Escape world / pacing constants. Phase 2: denser house chase. */

export const STORAGE_KEY = 'codecup-coffee-escape-best';

/** Three lanes: left / center / right */
export const LANE_X = [-1.6, 0, 1.6] as const;
export const LANE_SWITCH_MS = 160;
export const GROUND_Y = 0;
/** First jump: clears mid furniture with a tighter arc (less hang / less “far”) */
export const JUMP_VY = 8.6;
/**
 * Second air jump — small steam puff / correction boost.
 * A bit higher than the ultra-low hop, still under the ceiling.
 */
export const DOUBLE_JUMP_VY = 4.7;
/**
 * When already rising faster than the double-jump target, keep this fraction of excess
 * so we never yank velocity downward.
 */
export const DOUBLE_JUMP_RISE_KEEP = 0.7;
/**
 * Max instantaneous vy change on double-jump press (units/sec).
 * Hard-capped so falling reverse never feels like a whip — the rest eases in.
 */
export const DOUBLE_JUMP_MAX_IMMEDIATE = 1.05;
/**
 * Fraction of the remaining gap applied on press (before the max-immediate cap).
 * Low = silky steam puff; high = snappy arcade kick.
 */
export const DOUBLE_JUMP_IMMEDIATE_FRAC = 0.2;
/**
 * How quickly remaining double-jump boost is eased in (higher = snappier, lower = silkier).
 */
export const DOUBLE_JUMP_BOOST_SMOOTH = 9.5;
/**
 * While the double-jump boost is still easing in, gravity is scaled by this
 * so the puff lifts smoothly without floating too long (distance).
 */
export const DOUBLE_JUMP_BOOST_GRAVITY = 0.58;
/** Max jumps before landing (ground + one air) */
export const MAX_JUMPS = 2;
/** Base gravity while rising — higher = less hang time / shorter jump distance */
export const GRAVITY = 29.0;
/** Extra pull on the way down — shorter air time, cleaner landings */
export const FALL_GRAVITY_MULT = 1.45;
/** How long a jump press is remembered if it arrives a hair early/late (seconds) */
export const JUMP_BUFFER_SEC = 0.14;
/**
 * Visual react + flip window for double-jump (seconds).
 * Matches the tighter air time so the flip finishes before landing.
 */
export const DOUBLE_JUMP_REACT_SEC = 0.42;

export const OBSTACLE_POOL_SIZE = 30;
/** Closer first wave so something appears within ~4–6s at base speed */
export const OBSTACLE_START_Z = -52;
export const OBSTACLE_END_Z = 6;
export const RECYCLE_Z = -85;

/** World scroll speed (units/sec). Gentle for a short grace, then ramps. */
export const BASE_SPEED = 12;
export const MAX_SPEED = 36;
export const SPEED_RAMP = 0.6;
export const SPEED_GRACE_SECONDS = 3.5;

/** Spawn cadence — denser early, still fair for mobile */
export const SPAWN_INTERVAL_START = 0.68;
export const SPAWN_INTERVAL_MIN = 0.38;
export const SPAWN_RAMP_SECONDS = 20;
export const SPAWN_JITTER = 0.22;

export const PAIR_SPAWN_BASE = 0.18;
export const PAIR_SPAWN_RAMP = 0.028;
/** Min Z gap between consecutive obstacle waves */
export const SAME_LANE_MIN_GAP = 10;

export const BEAN_SPAWN_CHANCE = 0.58;
export const BEAN_INTERVAL_MIN = 1.5;
export const BEAN_INTERVAL_MAX = 2.7;
export const BEAN_POOL_SIZE = 14;

export const SCORE_PER_SECOND = 10;

export const MOTE_COUNT = 26;
export const DUST_POOL_SIZE = 32;
export const BOOST_PARTICLE_POOL = 24;

// --- Tired man chase (meter-based, no AI pathing yet) ---
/** Danger meter 0..max. At max the man "catches" the cup. */
export const CHASE_MAX = 100;
/** Danger added when hitting an obstacle without boost. */
export const CHASE_HIT_DANGER = 28;
/** Danger removed when collecting a caffeine bean. */
export const CHASE_BEAN_RELIEF = 12;
/** Danger drained per second while boost is active. */
export const CHASE_BOOST_DRAIN_PER_SEC = 16;
/**
 * Very light passive creep (units/sec) so the chase is always present.
 * Kept low — hits and boost remain the main levers.
 */
export const CHASE_PASSIVE_PER_SEC = 1.1;
/** Seconds of hit invulnerability so one obstacle can't multi-tick. */
export const CHASE_HIT_IFRAME_SEC = 0.5;
/**
 * Man world-Z relative to the cup at z≈0 (camera at z≈4.5 looking toward −Z).
 * He stays BETWEEN camera and cup so he reads as chasing from behind —
 * never at the camera plane (huge / clipped) and never past the cup.
 * Far = deeper in frame (smaller), near = closer to cup (more pressure).
 */
export const CHASE_MAN_Z_FAR = 2.55;
export const CHASE_MAN_Z_NEAR = 1.05;
/**
 * Horizontal: follow the cup with a small right bias so he sits behind
 * the lanes, not stuck on the screen edge or over the caffeine HUD.
 */
export const CHASE_MAN_X_BIAS = 0.42;
/** Scale when far (low danger) vs near (high danger). */
export const CHASE_MAN_SCALE_FAR = 0.48;
export const CHASE_MAN_SCALE_NEAR = 0.72;
