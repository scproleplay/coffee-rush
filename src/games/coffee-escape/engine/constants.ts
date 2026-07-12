/** Coffee Escape world / pacing constants. */

export const STORAGE_KEY = 'codecup-coffee-escape-best';

/** Three lanes: left / center / right */
export const LANE_X = [-1.6, 0, 1.6] as const;
export const LANE_SWITCH_MS = 160;
export const GROUND_Y = 0;
export const JUMP_VY = 9.0;
export const GRAVITY = 22.0;

export const OBSTACLE_POOL_SIZE = 26;
export const OBSTACLE_START_Z = -70;
export const OBSTACLE_END_Z = 6;
export const RECYCLE_Z = -85;

/** World scroll speed (units/sec). Gentle for 5s, then ramps to cap ~55s. */
export const BASE_SPEED = 12;
export const MAX_SPEED = 36;
export const SPEED_RAMP = 0.6;
export const SPEED_GRACE_SECONDS = 5;

export const SPAWN_INTERVAL_START = 0.95;
export const SPAWN_INTERVAL_MIN = 0.45;
export const SPAWN_RAMP_SECONDS = 25;
export const SPAWN_JITTER = 0.3;

export const PAIR_SPAWN_BASE = 0.15;
export const PAIR_SPAWN_RAMP = 0.025;
export const SAME_LANE_MIN_GAP = 12;

export const BEAN_SPAWN_CHANCE = 0.5;
export const BEAN_INTERVAL_MIN = 2.2;
export const BEAN_INTERVAL_MAX = 3.8;
export const BEAN_POOL_SIZE = 14;

export const SCORE_PER_SECOND = 10;

export const MOTE_COUNT = 26;
export const DUST_POOL_SIZE = 32;
export const BOOST_PARTICLE_POOL = 24;
