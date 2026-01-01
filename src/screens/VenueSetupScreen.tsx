import { useState, useEffect } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import {
  getLocalVenue,
  checkSlugAvailable,
  createVenue,
  joinVenue,
  clearLocalVenue,
  isSupabaseConfigured,
} from '../utils/supabase';

export function VenueSetupScreen() {
  const { setScreen } = useSession();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [joinSlug, setJoinSlug] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingVenue = getLocalVenue();
  const isConfigured = isSupabaseConfigured();

  // Auto-generate slug from name
  useEffect(() => {
    if (!existingVenue && mode === 'create') {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
      setSlug(generated);
      setIsAvailable(null);
    }
  }, [name, existingVenue, mode]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 3 || existingVenue || mode !== 'create') {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      const available = await checkSlugAvailable(slug);
      setIsAvailable(available);
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, existingVenue, mode]);

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Please enter a venue name');
      return;
    }

    if (slug.length < 3) {
      setError('URL slug must be at least 3 characters');
      return;
    }

    if (isAvailable === false) {
      setError('This URL is already taken');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSaving(true);
    setError(null);

    const venue = await createVenue(slug, name.trim(), password);

    if (venue) {
      setScreen('setup');
    } else {
      setError('Failed to create venue. Please try again.');
    }

    setIsSaving(false);
  };

  const handleJoin = async () => {
    if (!joinSlug.trim()) {
      setError('Please enter the venue URL slug');
      return;
    }

    if (!joinPassword.trim()) {
      setError('Please enter the venue password');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await joinVenue(joinSlug.trim(), joinPassword);

    if (result.success) {
      setScreen('setup');
    } else {
      setError(result.error || 'Failed to join venue');
    }

    setIsSaving(false);
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure? This will disconnect this device from the venue.')) {
      clearLocalVenue();
      setName('');
      setSlug('');
      setPassword('');
      setConfirmPassword('');
      setJoinSlug('');
      setJoinPassword('');
      setIsAvailable(null);
    }
  };

  const venueUrl = `pickleq.app/venue/${slug || 'your-venue'}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venue Settings</h1>
            <p className="text-gray-600 text-sm">Configure your public leaderboard</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setScreen('setup')}>
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8">
        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <span className="text-2xl">&#9888;</span>
              <div>
                <p className="font-medium text-yellow-800">Offline Mode</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Supabase is not configured. Venue setup will be local only.
                  To enable public leaderboards, add VITE_SUPABASE_URL and
                  VITE_SUPABASE_ANON_KEY to your environment.
                </p>
              </div>
            </div>
          </div>
        )}

        {existingVenue ? (
          // Already configured
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">&#10003;</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{existingVenue.name}</h2>
                  <p className="text-green-600 text-sm">Venue connected</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">Public Leaderboard URL</p>
                <p className="font-mono text-green-700 break-all">
                  pickleq.app/venue/{existingVenue.slug}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Share this URL with players so they can view the leaderboard and share
                their stats on their own devices.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">QR Code (Coming Soon)</h3>
              <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center">
                <p className="text-gray-400">QR code will appear here</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect Venue
            </Button>
          </div>
        ) : (
          // Setup new venue or join existing
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="bg-white rounded-2xl p-2 shadow-sm flex">
              <button
                onClick={() => { setMode('create'); setError(null); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  mode === 'create'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => { setMode('join'); setError(null); }}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  mode === 'join'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Join Existing
              </button>
            </div>

            {mode === 'create' ? (
              // Create new venue form
              <>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Create Your Venue
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Manila Pickleball Club"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL Slug
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">pickleq.app/venue/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => {
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                            setIsAvailable(null);
                          }}
                          placeholder="your-venue"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                        />
                      </div>
                      {slug.length >= 3 && (
                        <p className={`text-sm mt-1 ${
                          isChecking
                            ? 'text-gray-500'
                            : isAvailable
                              ? 'text-green-600'
                              : isAvailable === false
                                ? 'text-red-600'
                                : ''
                        }`}>
                          {isChecking
                            ? 'Checking availability...'
                            : isAvailable
                              ? 'Available!'
                              : isAvailable === false
                                ? 'This URL is already taken'
                                : ''}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password for staff access"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Staff will need this password to sync sessions from other devices
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-700 mb-2">Preview URL</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="font-mono text-green-700 break-all">{venueUrl}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Players will visit this URL to see the leaderboard
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCreate}
                  disabled={isSaving || !name.trim() || !slug.trim() || slug.length < 3 || !password.trim()}
                  className="w-full"
                >
                  {isSaving ? 'Creating Venue...' : 'Create Venue'}
                </Button>
              </>
            ) : (
              // Join existing venue form
              <>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Join Existing Venue
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect this device to an existing venue. You'll need the venue URL slug and password from the venue admin.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue URL Slug
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">pickleq.app/venue/</span>
                        <input
                          type="text"
                          value={joinSlug}
                          onChange={(e) => setJoinSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="venue-slug"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Password
                      </label>
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        placeholder="Enter venue password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleJoin}
                  disabled={isSaving || !joinSlug.trim() || !joinPassword.trim()}
                  className="w-full"
                >
                  {isSaving ? 'Joining Venue...' : 'Join Venue'}
                </Button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
