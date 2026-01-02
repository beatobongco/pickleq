import posthog from 'posthog-js';

// Identify the venue (acts as the "user" since this is a staff app)
export function identifyVenue(venueId: string, venueName: string, venueSlug: string) {
  posthog.identify(venueId, {
    name: venueName,
    slug: venueSlug,
  });
}

// Reset identity (on disconnect)
export function resetIdentity() {
  posthog.reset();
}

// Custom events
export function trackVenueCreated(venueSlug: string, venueName: string) {
  posthog.capture('venue_created', {
    venue_slug: venueSlug,
    venue_name: venueName,
  });
}

export function trackVenueJoined(venueSlug: string, venueName: string) {
  posthog.capture('venue_joined', {
    venue_slug: venueSlug,
    venue_name: venueName,
  });
}

export function trackSessionStarted(playerCount: number, courtCount: number, location: string) {
  posthog.capture('session_started', {
    player_count: playerCount,
    court_count: courtCount,
    location,
  });
}

export function trackGameRecorded(totalGamesInSession: number) {
  posthog.capture('game_recorded', {
    total_games_in_session: totalGamesInSession,
  });
}

export function trackSessionEnded(totalGames: number, playerCount: number, durationMinutes: number) {
  posthog.capture('session_ended', {
    total_games: totalGames,
    player_count: playerCount,
    duration_minutes: durationMinutes,
  });
}

export function trackStatsShared(cardType: 'session' | 'alltime', method: 'native' | 'download') {
  posthog.capture('stats_shared', {
    card_type: cardType,
    share_method: method,
  });
}

export function trackPublicLeaderboardViewed(venueSlug: string) {
  posthog.capture('public_leaderboard_viewed', {
    venue_slug: venueSlug,
  });
}

export function trackPublicSessionViewed(venueSlug: string, sessionId: string) {
  posthog.capture('public_session_viewed', {
    venue_slug: venueSlug,
    session_id: sessionId,
  });
}

export function trackLandingPageViewed() {
  posthog.capture('landing_page_viewed');
}

export function trackGetStartedClicked() {
  posthog.capture('get_started_clicked');
}
