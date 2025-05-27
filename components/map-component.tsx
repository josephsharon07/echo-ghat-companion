"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ReactElement } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import type { GeolocationPosition } from '@capacitor/geolocation';
import { CapacitorHttp } from '@capacitor/core';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.offline';
import 'leaflet-rotatedmarker';
import { VehicleTypeMap } from './settings-component';

// Type declarations for Leaflet offline functionality
declare module 'leaflet' {
  interface TileLayerStatic {
    offline(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  }
  
  interface ControlStatic {
    savetiles(layer: TileLayer, options?: any): Control;
  }

  interface Marker {
    setRotationAngle(angle: number): this;
  }

  interface MarkerOptions {
    rotationAngle?: number;
  }
}

interface CustomPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  heading?: number;
  speed: number; // Changed from speed?: number to speed: number
}

interface Vehicle {
  i: string;  // id
  t: number;  // type (0: car, 1: bike, 2: truck, 3: bus)
  s: string;  // speed
  la: number; // latitude
  lo: number; // longitude
  d: number;  // direction
  lastAlertTime?: number; // timestamp of last alert
}

// Function to get vehicle type string from number
const getVehicleTypeString = (typeNum: number): string => {
  const types = ['car', 'bike', 'truck', 'bus'];
  return types[typeNum] || 'car';
};

// Fix for default marker icons in Leaflet with webpack
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Constants for vehicle marker handling
const TIMEOUT_THRESHOLD = 5000; // 5 seconds before starting fade
const REMOVE_THRESHOLD = 10000; // 10 seconds before complete removal

const LeafletCapacitorMap = (): ReactElement => {
  const vehicleTimeouts: { [key: string]: { count: number, lastUpdate: number, speed: number, fadeOutStart?: number } } = {};
  const [position, setPosition] = useState<CustomPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(0);
  const [otherVehicles, setOtherVehicles] = useState<Vehicle[]>([]);
  const [serverUrl, setServerUrl] = useState<string>(
    localStorage.getItem('serverUrl') || '192.168.4.1'
  );

  // Add voice alert system at the top of the file
  const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

  const playBeep = (frequency = 440, duration = 200) => {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  };

  const playVoiceAlert = (message: string) => {
    try {
      if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(message);
        speech.rate = 1.2;
        speech.pitch = 1;
        speech.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
      } else {
        // Fallback to beep patterns
        switch (true) {
          case message.includes('opposite direction'):
            playBeep(880, 200); // High pitch for opposite direction
            setTimeout(() => playBeep(880, 200), 300);
            break;
          case message.includes('behind'):
            playBeep(440, 300); // Medium pitch for vehicle behind
            break;
          case message.includes('bend'):
            playBeep(660, 150); // Quick beeps for bends
            setTimeout(() => playBeep(660, 150), 200);
            break;
          case message.includes('collision'):
            playBeep(1100, 100); // Rapid high beeps for collision risk
            setTimeout(() => playBeep(1100, 100), 150);
            setTimeout(() => playBeep(1100, 100), 300);
            break;
          default:
            playBeep(550, 200); // Default alert
        }
      }
    } catch (error) {
      console.error('Error in audio alert:', error);
    }
  };

  const checkForFastVehicles = (vehicles: Vehicle[], ourPosition: CustomPosition | null) => {
    if (!ourPosition) return;

    const SPEED_THRESHOLD = 30; // Lower threshold for mountain roads
    const CLOSE_DISTANCE = 100; // Very close vehicles (100 meters)
    const WARN_DISTANCE = 150; // Warning distance (150 meters)
    const ourHeading = ourPosition.heading || 0;
    const currentTime = Date.now();

    vehicles.forEach(vehicle => {
      const speed = parseFloat(vehicle.s);
      const distance = calculateDistance(
        ourPosition.lat, 
        ourPosition.lng,
        vehicle.la,
        vehicle.lo
      );

      // Skip if vehicle is too far
      if (distance > WARN_DISTANCE) return;

      // Calculate relative angle and normalize to 0-360
      const relativeAngle = ((vehicle.d - ourHeading + 360) % 360);
      const isBehind = relativeAngle > 135 && relativeAngle < 225;
      const isOpposite = relativeAngle < 45 || relativeAngle > 315;
      
      // Get relative speed (negative means approaching)
      const relativeSpeed = speed - ourPosition.speed;
      
      // Check last alert time for this vehicle
      const lastAlertTime = vehicle.lastAlertTime || 0;
      if (currentTime - lastAlertTime > 5000) { // 5 second cooldown
        
        // Priority 1: Very close fast vehicles
        if (distance < CLOSE_DISTANCE && speed > SPEED_THRESHOLD) {
          if (isBehind) {
            playVoiceAlert(`Warning! Fast vehicle ${Math.round(distance)} meters behind you`);
          } else if (isOpposite) {
            playVoiceAlert(`Warning! Oncoming vehicle ${Math.round(distance)} meters ahead`);
          }
          vehicle.lastAlertTime = currentTime;
        }
        // Priority 2: Approaching vehicles with high relative speed
        else if (distance < WARN_DISTANCE && relativeSpeed < -20) {
          if (isBehind) {
            playVoiceAlert(`Fast approaching vehicle from behind, ${Math.round(distance)} meters`);
          } else if (isOpposite) {
            playVoiceAlert(`Fast oncoming vehicle, ${Math.round(distance)} meters ahead`);
          }
          vehicle.lastAlertTime = currentTime;
        }
      }
    });
  };

  const isHairpinBend = (direction: number, prevDirection: number): boolean => {
    const angleDiff = Math.abs(direction - prevDirection);
    return angleDiff > 135 && angleDiff < 225;
  };

  const isSharpBend = (direction: number, prevDirection: number): boolean => {
    const angleDiff = Math.abs(direction - prevDirection);
    return angleDiff > 45 && angleDiff < 135;
  };

  const checkCollisionRisk = (ourPos: CustomPosition, otherVehicle: Vehicle): number => {
    const relativeSpeed = parseFloat(otherVehicle.s) - ourPos.speed;
    const distance = calculateDistance(ourPos.lat, ourPos.lng, otherVehicle.la, otherVehicle.lo);
    const timeToCross = distance / (Math.abs(relativeSpeed) / 3.6); // Convert to meters per second
    return timeToCross;
  };

  const playBendAlert = (isHairpin: boolean, hasOpposingTraffic: boolean) => {
    let message = isHairpin ? "Hairpin bend ahead" : "Sharp bend ahead";
    if (hasOpposingTraffic) {
      message += " with opposing traffic";
    }
    playVoiceAlert(message);
  };

  const checkForHazards = (position: CustomPosition | null, vehicles: Vehicle[], lastAlert: { current: number }) => {
    if (!position) return;
    
    const currentTime = Date.now();
    if (currentTime - lastAlert.current < 5000) return; // 5-second cooldown between alerts

    const ourHeading = position.heading || 0;
    const prevHeading = positionHistoryRef.current.length > 1 ? 
      positionHistoryRef.current[positionHistoryRef.current.length - 2]?.heading || 0 : 
      ourHeading;

    // Check for bends
    const isHairpin = isHairpinBend(ourHeading, prevHeading);
    const isSharp = isSharpBend(ourHeading, prevHeading);

    // Find opposing vehicles within range
    const opposingVehicles = vehicles.filter(v => {
      const distance = calculateDistance(position.lat, position.lng, v.la, v.lo);
      const relativeAngle = Math.abs(ourHeading - v.d);
      return distance < 100 && (relativeAngle > 150 && relativeAngle < 210);
    });

    // Alert priorities
    if (isHairpin || isSharp) {
      playBendAlert(isHairpin, opposingVehicles.length > 0);
      lastAlert.current = currentTime;
    }

    // Check collision risks
    vehicles.forEach(vehicle => {
      const timeToCross = checkCollisionRisk(position, vehicle);
      if (timeToCross < 5 && timeToCross > 0) { // Less than 5 seconds to potential collision
        playVoiceAlert(`Warning! High collision risk ${Math.round(timeToCross)} seconds ahead`);
        lastAlert.current = currentTime;
      }
    });
  };

  // Update serverUrl when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'serverUrl') {
        setServerUrl(e.newValue || 'http://192.168.1.4');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const positionHistoryRef = useRef<CustomPosition[]>([]);
  const controlsRef = useRef<HTMLDivElement>(null);
  const previousPositionRef = useRef<CustomPosition | null>(null);
  const vehicleMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const speedHistoryRef = useRef<number[]>([]);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Improved speed calculation with Kalman filtering and smoothing
  const calculateSpeed = (newPosition: CustomPosition): number => {
    if (!previousPositionRef.current) {
      previousPositionRef.current = newPosition;
      return 0;
    }

    const prevPos = previousPositionRef.current;
    
    // Calculate distance between points
    const distance = calculateDistance(
      prevPos.lat, prevPos.lng,
      newPosition.lat, newPosition.lng
    );
    
    // Time difference in seconds
    const timeDiff = (newPosition.timestamp - prevPos.timestamp) / 1000;
    
    // Speed history for smoothing
    if (!speedHistoryRef.current) {
      speedHistoryRef.current = [];
    }
    
    // If time difference is too small or too large, it's likely unreliable
    if (timeDiff < 0.1 || timeDiff > 5) {
      // Just return the last known speed or 0
      const lastSpeed = speedHistoryRef.current.length > 0 
        ? speedHistoryRef.current[speedHistoryRef.current.length - 1] 
        : 0;
      
      previousPositionRef.current = newPosition;
      return lastSpeed;
    }
    
    // Apply accuracy-based noise filtering
    // Higher accuracy (lower number) means more reliable
    const accuracyFactor = Math.min(1, 5 / newPosition.accuracy);
    
    // Initial raw speed calculation (m/s converted to km/h)
    let rawSpeed = (distance / timeDiff) * 3.6;
    
    // Detect and handle GPS jumps (likely errors)
    if (distance > 50 && timeDiff < 2 && speedHistoryRef.current.length > 0) {
      // This is probably a GPS jump - use previous speed
      rawSpeed = speedHistoryRef.current[speedHistoryRef.current.length - 1];
    }
    
    // Apply physical movement constraints
    // Max reasonable acceleration/deceleration ~3 m/s² (10.8 km/h per second)
    const maxSpeedChange = 10.8 * timeDiff;
    const prevSpeed = speedHistoryRef.current.length > 0 
      ? speedHistoryRef.current[speedHistoryRef.current.length - 1] 
      : 0;
    
    const constrainedSpeed = Math.max(
      0, 
      Math.min(
        prevSpeed + maxSpeedChange,
        Math.max(0, prevSpeed - maxSpeedChange),
        rawSpeed
      )
    );
    
    // Apply exponential moving average smoothing
    // Alpha depends on GPS accuracy and speed (higher speed = more responsive)
    const baseAlpha = 0.3 * accuracyFactor;
    const alpha = Math.min(0.8, baseAlpha + (constrainedSpeed / 100));
    
    const smoothedSpeed = prevSpeed * (1 - alpha) + constrainedSpeed * alpha;
    
    // Keep a short history for average calculations (last 3 readings)
    speedHistoryRef.current.push(smoothedSpeed);
    if (speedHistoryRef.current.length > 5) {
      speedHistoryRef.current.shift();
    }
    
    // Update previous position for next calculation
    previousPositionRef.current = newPosition;
    
    // Final speed value is a trimmed mean of recent values to further smooth outliers
    const sortedSpeeds = [...speedHistoryRef.current].sort((a, b) => a - b);
    let finalSpeed = smoothedSpeed;
    
    if (sortedSpeeds.length >= 3) {
      // Remove highest and lowest if we have enough samples
      const trimmedSpeeds = sortedSpeeds.slice(1, -1);
      finalSpeed = trimmedSpeeds.reduce((sum, s) => sum + s, 0) / trimmedSpeeds.length;
    }
    
    return finalSpeed;
  };

  // Create a custom arrow icon using the provided image
  const createArrowIcon = (heading: number): L.DivIcon => {
    const arrowIcon = L.divIcon({
      className: 'arrow-icon',
      html: `<img 
        src="https://static.thenounproject.com/png/3128977-200.png" 
        style="transform: rotate(${heading}deg); width: 30px; height: 30px; transform-origin: center;" 
        alt="Arrow Marker" 
      />`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    return arrowIcon;
  };

  // Enhanced interpolation function with better smoothing
  const interpolatePosition = (from: [number, number], to: [number, number], fromSpeed: number, toSpeed: number, direction: number, deltaTime: number): [number, number] => {
    // Convert speeds from km/h to m/s
    const fromSpeedMS = fromSpeed / 3.6;
    const toSpeedMS = toSpeed / 3.6;
    
    // Use acceleration/deceleration for smoother speed transitions
    const avgSpeed = (fromSpeedMS + toSpeedMS) / 2;
    const maxAcceleration = 2; // m/s^2
    const speedDiff = toSpeedMS - fromSpeedMS;
    const acceleration = Math.min(Math.abs(speedDiff) / deltaTime, maxAcceleration) * Math.sign(speedDiff);
    const currentSpeed = fromSpeedMS + (acceleration * deltaTime);
    
    // Calculate distance traveled
    const distance = currentSpeed * deltaTime;
    
    // Convert direction to radians
    const directionRad = direction * Math.PI / 180;
    
    // Calculate movement vector
    const dx = distance * Math.sin(directionRad);
    const dy = distance * Math.cos(directionRad);
    
    // Convert to lat/lng (approximate)
    const metersPerLat = 111111;
    const metersPerLng = metersPerLat * Math.cos(from[0] * Math.PI / 180);
    
    // Apply easing function for smoother transitions
    const easing = (t: number) => t * t * (3 - 2 * t); // Smooth step function
    const t = easing(Math.min(1, deltaTime));
    
    // Blend between current position and predicted position
    const predictedLat = from[0] + (dy / metersPerLat);
    const predictedLng = from[1] + (dx / metersPerLng);
    
    const lat = from[0] + (predictedLat - from[0]) * t;
    const lng = from[1] + (predictedLng - from[1]) * t;
    
    return [lat, lng];
  };

  // Function to send data via HTTP
  const sendDataViaHTTP = async (data: Vehicle): Promise<void> => {
    try {
      const options = {
        url: `http://${serverUrl}/send`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: data,
      };

      const response = await CapacitorHttp.post(options);
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error sending data via HTTP:', err);
    }
  };

  // Function to receive data via HTTP
  const receiveDataViaHTTP = async () => {
    try {
      const options = {
        url: `http://${serverUrl}/receive`,
      };

      const response = await CapacitorHttp.get(options);

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      if (data && Object.keys(data).length > 0) {
        const receivedVehicles = Array.isArray(data) ? data : [data];
        const validVehicles = receivedVehicles.filter(v => 
          v.i &&
          typeof v.t === 'number' &&
          typeof v.la === 'number' &&
          typeof v.lo === 'number' &&
          v.s &&
          typeof v.d === 'number'
        );
        setOtherVehicles(validVehicles);
      } else {
        setOtherVehicles([]);
        Object.values(vehicleMarkersRef.current).forEach(marker => {
          marker.remove();
        });
        vehicleMarkersRef.current = {};
      }
    } catch (err) {
      console.error('Error receiving data via HTTP:', err);
      setOtherVehicles([]);
      Object.values(vehicleMarkersRef.current).forEach(marker => {
        marker.remove();
      });
      vehicleMarkersRef.current = {};
    }
  };

  // Function to create a vehicle icon based on type
  const createVehicleIcon = (type: string): L.Icon => {
    const icons = {
      car: 'car.png',
      bus: 'https://example.com/bus-icon.png',
      truck: 'https://example.com/truck-icon.png',
      bike: 'https://example.com/bike-icon.png',
    } as const;

    return L.icon({
      iconUrl: icons[type as keyof typeof icons] || icons.car,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Draw path helper function
  const drawPath = () => {
    if (!mapInstanceRef.current) return;

    const pathPoints = positionHistoryRef.current.map(pos => [pos.lat, pos.lng] as [number, number]);

    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Polyline && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    if (pathPoints.length > 1 && mapInstanceRef.current) {
      L.polyline(pathPoints, {
        color: 'red',
        weight: 3,
        opacity: 0.7
      }).addTo(mapInstanceRef.current);
    }
  };

  // Calculate heading based on movement
  const calculateHeadingFromMovement = (current: CustomPosition, previous: CustomPosition | null): number | undefined => {
    if (!previous) return undefined;
    
    // Need at least some movement to calculate direction
    const distance = calculateDistance(
      previous.lat, previous.lng,
      current.lat, current.lng
    );
    
    // Only calculate heading if we've moved at least 3 meters (reduces jitter)
    if (distance < 3) return previous.heading;
    
    // Calculate angle between points
    const y = Math.sin(current.lng - previous.lng) * Math.cos(current.lat);
    const x = Math.cos(previous.lat) * Math.sin(current.lat) -
              Math.sin(previous.lat) * Math.cos(current.lat) * Math.cos(current.lng - previous.lng);
    
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    heading = (heading + 360) % 360; // Normalize to 0-360
    
    // Apply some smoothing with previous heading if available
    if (previous.heading !== undefined) {
      // More weight to the new heading at higher speeds for responsiveness
      const weight = Math.min(0.8, Math.max(0.2, current.speed / 20));
      return previous.heading * (1 - weight) + heading * weight;
    }
    
    return heading;
  };

  // Handle position helper function
  const handlePosition = (geoPosition: GeolocationPosition | null) => {
    if (!geoPosition) return;

    const newPosition: CustomPosition = {
      lat: geoPosition.coords.latitude,
      lng: geoPosition.coords.longitude,
      accuracy: geoPosition.coords.accuracy,
      timestamp: Date.now(),
      speed: geoPosition.coords.speed !== null && geoPosition.coords.speed !== undefined 
        ? geoPosition.coords.speed * 3.6 
        : 0  // Always provide a default speed
    };

    // Calculate speed if not provided by GPS
    if (geoPosition.coords.speed === null || geoPosition.coords.speed === undefined) {
      newPosition.speed = calculateSpeed(newPosition);
    }

    // Calculate heading based on movement instead of compass
    const previousPosition = positionHistoryRef.current.length > 0 
      ? positionHistoryRef.current[positionHistoryRef.current.length - 1] 
      : null;
      
    // Only use device compass as fallback when not moving or for initial heading
    if (newPosition.speed < 3) {
      // At very low speeds, use device compass if available, otherwise keep previous heading
      newPosition.heading = geoPosition.coords.heading ?? previousPosition?.heading;
    } else {
      // At higher speeds, calculate heading from movement
      newPosition.heading = calculateHeadingFromMovement(newPosition, previousPosition);
    }

    setPosition(newPosition);
    setSpeed(newPosition.speed);
    positionHistoryRef.current.push(newPosition);
  };

  // Create reference for last alert time
  const lastAlertTimeRef = useRef<{ current: number }>({ current: 0 });

  // Update marker movement in updateVehicleMarkers
  const updateVehicleMarkers = (updateInterval: number) => {
    if (!mapInstanceRef.current) return;

    const currentTime = Date.now();

    // Update or add markers for received vehicles
    otherVehicles.forEach((vehicle: Vehicle) => {
      const { i, t, s, la, lo, d } = vehicle;
      const vehicleType = getVehicleTypeString(t);
      const newPosition: [number, number] = [la, lo];
      const currentSpeed = parseFloat(s);

      // Reset timeout data when we receive an update
      vehicleTimeouts[i] = { 
        count: 0, 
        lastUpdate: currentTime, 
        speed: currentSpeed,
        fadeOutStart: undefined 
      };

      if (vehicleMarkersRef.current[i]) {
        const currentMarker = vehicleMarkersRef.current[i];
        const currentPosition = currentMarker.getLatLng();
        const deltaTime = updateInterval / 1000;

        // Apply smooth rotation
        const currentAngle = currentMarker.options.rotationAngle || 0;
        const angleDiff = ((d - currentAngle + 540) % 360) - 180;
        const smoothAngle = currentAngle + (angleDiff * Math.min(1, deltaTime * 3));

        // Get interpolated position with improved smoothing
        const interpolatedPosition = interpolatePosition(
          [currentPosition.lat, currentPosition.lng],
          newPosition,
          vehicleTimeouts[i].speed,
          currentSpeed,
          smoothAngle,
          deltaTime
        );

        currentMarker.setLatLng(interpolatedPosition);
        currentMarker.setRotationAngle(smoothAngle);
        currentMarker.setPopupContent(`Speed: ${s} km/h`);
        
        // Reset opacity if the marker was fading
        currentMarker.setOpacity(1);
      } else if (mapInstanceRef.current) {
        const marker = L.marker(newPosition, {
          icon: createVehicleIcon(vehicleType),
          rotationAngle: d
        })
          .bindPopup(`Speed: ${s} km/h`)
          .addTo(mapInstanceRef.current);
        vehicleMarkersRef.current[i] = marker;
      }
    });
    checkForHazards(position, otherVehicles, lastAlertTimeRef.current);
    // Check for fast vehicles and hazards as before
    checkForFastVehicles(otherVehicles, position);
    checkForHazards(position, otherVehicles, { current: lastAlertTimeRef.current.current });

    // Handle stale vehicles
    Object.entries(vehicleTimeouts).forEach(([id, data]) => {
      const timeSinceUpdate = currentTime - data.lastUpdate;
      const marker = vehicleMarkersRef.current[id];
      
      if (!marker) return;

      if (timeSinceUpdate > TIMEOUT_THRESHOLD) {
        // Start fade out if we haven't already
        if (!data.fadeOutStart) {
          data.fadeOutStart = currentTime;
        }

        // Calculate fade progress
        const fadeTime = currentTime - (data.fadeOutStart || currentTime);
        const fadeProgress = fadeTime / (REMOVE_THRESHOLD - TIMEOUT_THRESHOLD);
        const opacity = Math.max(0, 1 - fadeProgress);

        if (timeSinceUpdate > REMOVE_THRESHOLD) {
          // Finally remove the marker
          marker.remove();
          delete vehicleMarkersRef.current[id];
          delete vehicleTimeouts[id];
        } else {
          // Continue moving based on last known speed and direction
          const currentPos = marker.getLatLng();
          const deltaTime = updateInterval / 1000;
          const lastDirection = marker.options.rotationAngle || 0;
          
          // Gradually reduce speed as the vehicle fades
          const reducedSpeed = data.speed * (1 - fadeProgress);
          
          const predictedPosition = interpolatePosition(
            [currentPos.lat, currentPos.lng],
            [currentPos.lat, currentPos.lng],
            reducedSpeed,
            reducedSpeed,
            lastDirection,
            deltaTime
          );
          
          marker.setLatLng(predictedPosition);
          marker.setOpacity(opacity);
          
          // Update popup to show stale status
          const timeAgo = Math.floor(timeSinceUpdate / 1000);
          marker.setPopupContent(`Last seen ${timeAgo}s ago\nLast speed: ${data.speed.toFixed(1)} km/h`);
        }
      }
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false, // Remove default zoom control to add custom one
        attributionControl: false // Remove attribution control for full-screen cleanliness
      }).setView([0, 0], 15); // Change initial zoom from 2 to 15 for a closer view
      
      if (mapInstanceRef.current) {
        L.control.attribution({
          position: 'bottomright'
        }).addAttribution('© OpenStreetMap contributors').addTo(mapInstanceRef.current);

        L.control.zoom({
          position: 'topright'
        }).addTo(mapInstanceRef.current);

        // Type assertion for offline functionality
        const tileLayer = (L.tileLayer as any).offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          minzoom: 10,
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        });

        if (mapInstanceRef.current) {
          tileLayer.addTo(mapInstanceRef.current);

          // Type assertion for savetiles control
          const saveControl = (L.control as any).savetiles(tileLayer, {
            zoomlevels: [10, 11, 12, 13, 14, 15, 16, 18, 19],
            confirm(layer: any, successCallback: () => void) {
              if (window.confirm('Save tiles for offline use?')) {
                successCallback();
              }
            },
            confirmRemoval(layer: any, successCallback: () => void) {
              if (window.confirm('Remove all saved tiles?')) {
                successCallback();
              }
            }
          });

          saveControl.addTo(mapInstanceRef.current);
        }
      }
    }

    // Request permissions and initial position
    const setupGeolocation = async () => {
      try {
        const permissionsStatus = await Geolocation.checkPermissions();
        if (permissionsStatus.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
        
        // Get initial position
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true
        });
        
        const newPosition: CustomPosition = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy,
          timestamp: Date.now(),
          speed: coordinates.coords.speed !== null ? coordinates.coords.speed * 3.6 : 0 // Convert m/s to km/h if available
        };
        
        setPosition(newPosition);
        // If device provides speed directly, use it
        if (coordinates.coords.speed !== null) {
          setSpeed(newPosition.speed);
        }
        
        positionHistoryRef.current.push(newPosition);
        setLoading(false);
        
        // Update map view to user's location with appropriate zoom level
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newPosition.lat, newPosition.lng], 16);
        }
        
        // Start continuous tracking with 1s interval
        startLocationTracking();
      } catch (err) {
        console.error('Error setting up geolocation', err);
        setError('Failed to get your location. Please check your permissions.');
        setLoading(false);
      }
    };

    setupGeolocation();

    // Clean up
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      }
    };
  }, []);

  // Start tracking location with watch position
  const startLocationTracking = async () => {
    try {
      if (watchIdRef.current) {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      }
      
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Want fresh data always
        // 1 second interval
      }, (position, err) => {
        if (err) {
          setError(`Location error: ${err.message}`);
          return;
        }
        
        handlePosition(position);
      });
      
      watchIdRef.current = watchId;
      setIsTracking(true);
    } catch (err) {
      console.error('Error starting location tracking', err);
      setError('Failed to track your location.');
      setIsTracking(false);
    }
  };

  // Stop tracking location
  const stopLocationTracking = async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  // Toggle tracking state
  const toggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls(!showControls);
  };

  // Effect to update vehicle markers
  useEffect(() => {
    const TIMEOUT_THRESHOLD = 5000; // 5 seconds before starting fade
    const REMOVE_THRESHOLD = 10000; // 10 seconds before complete removal
    const lastAlertTime = { current: 0 };
    const vehicleTimeouts: { 
      [key: string]: { 
        count: number, 
        lastUpdate: number, 
        speed: number, 
        fadeOutStart?: number 
      } 
    } = {};
    const updateInterval = 50;

    const interval = setInterval(() => updateVehicleMarkers(updateInterval), updateInterval);
    return () => clearInterval(interval);
  }, [otherVehicles, position]);

  // Effect to send current position data
  useEffect(() => {
    if (!position) return;

    const sendPositionData = () => {
      const data: Vehicle = {
        i: localStorage.getItem('vehicleId') || '',
        t: parseInt(localStorage.getItem('vehicleTypeNumber') || '0'),
        s: speed.toFixed(1),
        la: position.lat,
        lo: position.lng,
        d: position.heading || 0,
      };

      void sendDataViaHTTP(data);
    };

    const interval = setInterval(sendPositionData, 1000);
    return () => clearInterval(interval);
  }, [position, speed]);

  // Effect to receive other vehicles' data
  useEffect(() => {
    const dataListener = setInterval(() => {
      void receiveDataViaHTTP();
    }, 2000);  // Changed from 1000 to 2000

    return () => clearInterval(dataListener);
  }, []);

  // Effect to update map view and marker when position changes
  useEffect(() => {
    if (!position || !mapInstanceRef.current) return;

    const newPosition: [number, number] = [position.lat, position.lng];
    const heading = position.heading || 0;

    // Create or update marker
    if (!markerRef.current) {
      markerRef.current = L.marker(newPosition, {
        icon: createArrowIcon(heading)
      }).addTo(mapInstanceRef.current);
    } else {
      // Update existing marker position and rotation
      markerRef.current.setLatLng(newPosition);
      markerRef.current.setIcon(createArrowIcon(heading));
    }

    // Update path history
    const pathPoints = [...positionHistoryRef.current, position];
    positionHistoryRef.current = pathPoints;
    drawPath();

    // Update map view if tracking is enabled
    if (isTracking && mapInstanceRef.current) {
      mapInstanceRef.current.setView(newPosition, mapInstanceRef.current.getZoom() || 16);
    }
  }, [position, isTracking]);

  return (
    <div className="relative w-full h-screen">
      {/* Full screen map */}
      <div 
        ref={mapRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      ></div>
      
      {/* Speed display - always visible */}
      <div className="absolute bottom-20 right-4 z-10 bg-black bg-opacity-70 p-3 rounded-lg text-white text-xl font-bold">
        {speed.toFixed(1)} <span className="text-sm">km/h</span>
      </div>
      
      {/* Toggle controls button - always visible */}
      <button
        onClick={toggleControls}
        className="absolute bottom-20 left-4 z-10 p-2 bg-white rounded-full shadow-md"
      >
        {showControls ? '✕' : '⚙️'}
      </button>
      
      {/* Custom controls panel in top left */}
      {showControls && (
        <div 
          ref={controlsRef}
          className="absolute bottom-20 left-12 z-10 bg-white bg-opacity-90 p-4 rounded-lg shadow-md max-w-xs"
        >
          <div className="mb-2 text-sm font-bold">Location Controls</div>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={toggleTracking}
              className={`px-3 py-2 rounded text-sm ${isTracking 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            
            <button 
              onClick={() => {
                if (position) {
                  mapInstanceRef.current?.setView([position.lat, position.lng], 16);
                }
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 text-sm"
              disabled={!position}
            >
              Center Map
            </button>
            
            {position && (
              <div className="text-xs">
                <div>Lat: {position.lat.toFixed(6)}</div>
                <div>Lng: {position.lng.toFixed(6)}</div>
                <div>Accuracy: {position.accuracy.toFixed(1)}m</div>
                <div>Speed: {speed.toFixed(1)} km/h</div>
                <div className="mt-1 font-bold">
                  {isTracking ? 'Updating every 1s' : 'Tracking paused'}
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-1 p-2 bg-red-100 text-red-600 rounded text-xs">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-20">
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <div className="mb-2">Getting your location...</div>
            <div className="text-sm">Please allow location permissions</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletCapacitorMap;
