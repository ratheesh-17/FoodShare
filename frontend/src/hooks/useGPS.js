import { useState, useEffect } from 'react';

/**
 * Custom hook for handling GPS location
 * Returns: { lat, lng, loading, error, getLocation }
 */
export const useGPS = () => {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Unable to get location');
        setLoading(false);
      }
    );
  };

  // Auto-get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  return {
    ...location,
    loading,
    error,
    getLocation,
    hasLocation: location.lat !== null && location.lng !== null,
  };
};

export default useGPS;
