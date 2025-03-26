import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

interface DeviceOrientationEvent {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  heading: number | null;
}

const LocationMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [location, setLocation] = useState<LocationData>({
    latitude: 0,
    longitude: 0,
    heading: null,
  });

  useEffect(() => {
    // Request permissions
    const requestPermissions = async () => {
      await Geolocation.requestPermissions();
    };
    requestPermissions();

    // Initialize map
    if (typeof window !== 'undefined') {
      mapRef.current = L.map('map').setView([0, 0], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

      const arrowIcon = L.divIcon({
        className: 'location-arrow',
        html: '➤',
        iconSize: [20, 20],
      });

      markerRef.current = L.marker([0, 0], { icon: arrowIcon }).addTo(mapRef.current);
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    let watchId: string;
    let orientationListener: any;

    const startTracking = async () => {
      // Watch position using Capacitor
      watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 1000,
      }, (position) => {
        if (position) {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
          };

          setLocation(newLocation);

          if (mapRef.current && markerRef.current) {
            const latLng = [newLocation.latitude, newLocation.longitude] as [number, number];
            markerRef.current.setLatLng(latLng);
            mapRef.current.setView(latLng);
          }
        }
      });

      // Watch device orientation
      orientationListener = await Device.addListener('orientationChanged', 
        (orientation: DeviceOrientationEvent) => {
          const arrow = document.querySelector('.location-arrow');
          if (arrow && orientation.alpha !== null) {
            arrow.setAttribute(
              'style',
              `transform: rotate(${orientation.alpha}deg)`
            );
          }
      });
    };

    startTracking();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
      if (orientationListener) {
        orientationListener.remove();
      }
    };
  }, []);

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
};

export default LocationMap;
