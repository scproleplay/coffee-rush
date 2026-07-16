/** Coffee Escape world / pacing constants. Phase 2: denser house chase. */

export const STORAGE_KEY = 'codecup-coffee-escape-best';

/** Three lanes: left / center / right */
export const LANE_X = [-1.6, 0, 1.6] as const;
export const LANE_SWITCH_MS = 160;
export const GROUND_Y = 0;
/** First jump: clears mid furniture (~0.55–0.58) with a normal arc */
export const JUMP_VY = 9.0;
/**
 * Second air jump — small steam puff / correction boost.
 * Must be ≤ first jump and not launch near the ceiling.
 * Peak combo height stays around ~2.0 so high caffeine pickups remain optional candy.
 */
export const DOUBLE_JUMP_VY = 5.4;
/** Max jumps before landing (ground + one air) */
export const MAX_JUMPS = 2;
/** Base gravity while rising — slightly firmer than the old floaty feel */
export const GRAVITY = 26.0;
/** Extra pull on the way down for snappier landings */
export const FALL_GRAVITY_MULT = 1.45;

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
