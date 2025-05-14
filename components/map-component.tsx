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

const LeafletCapacitorMap = (): ReactElement => {
  const [position, setPosition] = useState<CustomPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(0);
  const [otherVehicles, setOtherVehicles] = useState<Vehicle[]>([]);
  const [serverUrl, setServerUrl] = useState<string>(
    localStorage.getItem('serverUrl') || 'http://10.10.1.7'
  );

  // Add voice alert system at the top of the file
  const playVoiceAlert = (message: string) => {
    const speech = new SpeechSynthesisUtterance(message);
    speech.rate = 1.2;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  const checkForFastVehicles = (vehicles: Vehicle[], ourPosition: CustomPosition | null) => {
    if (!ourPosition) return;

    const SPEED_THRESHOLD = 40; // Lowered to 40 km/h
    const DISTANCE_THRESHOLD = 200; // Lowered to 200 meters for earlier warnings
    const ourHeading = ourPosition.heading || 0;
    const currentTime = Date.now();

    vehicles.forEach(vehicle => {
      const speed = parseFloat(vehicle.s);
      if (speed > SPEED_THRESHOLD) {
        const distance = calculateDistance(
          ourPosition.lat, 
          ourPosition.lng,
          vehicle.la,
          vehicle.lo
        );

        if (distance < DISTANCE_THRESHOLD) {
          const relativeAngle = Math.abs(ourHeading - vehicle.d);
          const distanceInMeters = Math.round(distance);
          
          // Check if we've alerted for this vehicle recently
          const lastAlertTime = vehicle.lastAlertTime || 0;
          if (currentTime - lastAlertTime > 10000) { // 10 second cooldown
            if (relativeAngle > 150 && relativeAngle < 210) {
              playVoiceAlert(`Warning! Vehicle approaching from opposite direction at ${speed.toFixed(0)} kilometers per hour, ${distanceInMeters} meters ahead`);
            } else if (relativeAngle < 30 || relativeAngle > 330) {
              playVoiceAlert(`Warning! Fast vehicle approaching from behind at ${speed.toFixed(0)} kilometers per hour, ${distanceInMeters} meters away`);
            }
            vehicle.lastAlertTime = currentTime;
          }
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

  // Calculate speed based on distance and time
  const calculateSpeed = (newPosition: CustomPosition): number => {
    if (!previousPositionRef.current) {
      previousPositionRef.current = newPosition;
      return 0;
    }

    const prevPos = previousPositionRef.current;
    const distance = calculateDistance(
      prevPos.lat, prevPos.lng,
      newPosition.lat, newPosition.lng
    );
    
    const timeDiff = (newPosition.timestamp - prevPos.timestamp) / 1000;
    
    // Only update if we have a meaningful time difference
    if (timeDiff > 0) {
      const calculatedSpeed = (distance / timeDiff) * 3.6; // Convert m/s to km/h
      
      // Update previous position for next calculation
      previousPositionRef.current = newPosition;
      
      // Return calculated speed if it seems reasonable (less than 200 km/h)
      if (calculatedSpeed >= 0 && calculatedSpeed < 200) {
        return calculatedSpeed;
      }
    }
    
    // Return current speed if calculation seems off
    return speed;
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

  // Function to send data via HTTP
  const sendDataViaHTTP = async (data: Vehicle): Promise<void> => {
    try {
      const options = {
        url: `${serverUrl}/send`,
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
        url: `${serverUrl}/receive`,
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

  // Handle position helper function
  const handlePosition = (geoPosition: GeolocationPosition | null) => {
    if (!geoPosition) return;

    const newPosition: CustomPosition = {
      lat: geoPosition.coords.latitude,
      lng: geoPosition.coords.longitude,
      accuracy: geoPosition.coords.accuracy,
      timestamp: Date.now(),
      heading: geoPosition.coords.heading ?? undefined,
      speed: geoPosition.coords.speed !== null && geoPosition.coords.speed !== undefined 
        ? geoPosition.coords.speed * 3.6 
        : 0  // Always provide a default speed
    };

    setPosition(newPosition);
    setSpeed(newPosition.speed); // Now this is type-safe since speed is always a number
    positionHistoryRef.current.push(newPosition);
  };

  const interpolatePosition = (from: [number, number], to: [number, number], fromSpeed: number, toSpeed: number, direction: number, deltaTime: number): [number, number] => {
    // Convert speed from km/h to m/s
    const speedMS = (fromSpeed + toSpeed) / 2 / 3.6;
    const distance = speedMS * deltaTime;
    
    // Calculate predicted position based on speed and direction
    const directionRad = direction * Math.PI / 180;
    const predictedLat = from[0] + (distance / 111111) * Math.cos(directionRad);
    const predictedLng = from[1] + (distance / (111111 * Math.cos(from[0] * Math.PI / 180))) * Math.sin(directionRad);
    
    // Blend between current position and predicted position
    const blendFactor = 0.3; // Adjust for smoother or more responsive movement
    const lat = from[0] + (predictedLat - from[0]) * blendFactor;
    const lng = from[1] + (predictedLng - from[1]) * blendFactor;
    
    return [lat, lng];
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false, // Remove default zoom control to add custom one
        attributionControl: false // Remove attribution control for full-screen cleanliness
      }).setView([0, 0], 2);
      
      if (mapInstanceRef.current) {
        L.control.attribution({
          position: 'bottomright'
        }).addAttribution('© OpenStreetMap contributors').addTo(mapInstanceRef.current);

        L.control.zoom({
          position: 'topright'
        }).addTo(mapInstanceRef.current);

        // Type assertion for offline functionality
        const tileLayer = (L.tileLayer as any).offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        });

        if (mapInstanceRef.current) {
          tileLayer.addTo(mapInstanceRef.current);

          // Type assertion for savetiles control
          const saveControl = (L.control as any).savetiles(tileLayer, {
            zoomlevels: [12, 13, 14, 15, 16],
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
    const vehicleTimeouts: { [key: string]: { count: number, lastUpdate: number, speed: number } } = {};
    const updateInterval = 50;
    const lastAlertTime = { current: 0 };

    const updateVehicleMarkers = () => {
      if (!mapInstanceRef.current) return;

      const currentTime = Date.now();

      // Update or add markers for received vehicles
      otherVehicles.forEach((vehicle: Vehicle) => {
        const { i, t, s, la, lo, d } = vehicle;
        const vehicleType = getVehicleTypeString(t);
        const newPosition: [number, number] = [la, lo];
        const currentSpeed = parseFloat(s);

        if (!vehicleTimeouts[i]) {
          vehicleTimeouts[i] = { count: 0, lastUpdate: currentTime, speed: currentSpeed };
        } else {
          vehicleTimeouts[i].lastUpdate = currentTime;
          vehicleTimeouts[i].speed = currentSpeed;
        }

        if (vehicleMarkersRef.current[i]) {
          const currentMarker = vehicleMarkersRef.current[i];
          const currentPosition = currentMarker.getLatLng();
          const deltaTime = updateInterval / 1000; // Convert to seconds

          const interpolatedPosition = interpolatePosition(
            [currentPosition.lat, currentPosition.lng],
            newPosition,
            vehicleTimeouts[i].speed,
            currentSpeed,
            d,
            deltaTime
          );

          currentMarker.setLatLng(interpolatedPosition);
          currentMarker.setRotationAngle(d);
          currentMarker.setPopupContent(`Speed: ${s} km/h`);
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

      // Check for fast vehicles
      checkForFastVehicles(otherVehicles, position);

      // Add hazard checks
      checkForHazards(position, otherVehicles, lastAlertTime);

      // Check for stale vehicles
      Object.entries(vehicleTimeouts).forEach(([id, data]) => {
        const timeSinceUpdate = currentTime - data.lastUpdate;
        if (timeSinceUpdate > 2000) { // More than 2 seconds since last update
          data.count++;
          if (data.count >= 5) { // Remove after 5 missed updates
            if (vehicleMarkersRef.current[id]) {
              vehicleMarkersRef.current[id].remove();
              delete vehicleMarkersRef.current[id];
            }
            delete vehicleTimeouts[id];
          } else {
            // Continue moving based on last known speed and direction
            const marker = vehicleMarkersRef.current[id];
            if (marker) {
              const currentPos = marker.getLatLng();
              const deltaTime = updateInterval / 1000;
              const lastDirection = marker.options.rotationAngle || 0;
              
              const predictedPosition = interpolatePosition(
                [currentPos.lat, currentPos.lng],
                [currentPos.lat, currentPos.lng], // Same position as target
                data.speed,
                data.speed,
                lastDirection,
                deltaTime
              );
              
              marker.setLatLng(predictedPosition);
            }
          }
        }
      });
    };

    const interval = setInterval(updateVehicleMarkers, updateInterval);
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

    const heading = position.heading || 0;
    const newPosition: [number, number] = [position.lat, position.lng];

    if (markerRef.current) {
      const currentPosition = markerRef.current.getLatLng();
      const interpolatedPosition = interpolatePosition(
        [currentPosition.lat, currentPosition.lng],
        newPosition,
        speed,
        speed,
        heading,
        1 // Assuming 1 second interval
      );
      markerRef.current.setLatLng(interpolatedPosition);
      markerRef.current.setIcon(createArrowIcon(heading));
    } else {
      markerRef.current = L.marker(newPosition, {
        icon: createArrowIcon(heading),
      });
      if (mapInstanceRef.current) {
        markerRef.current.addTo(mapInstanceRef.current);
      }
    }

    if (isTracking && mapInstanceRef.current) {
      mapInstanceRef.current.setView(newPosition, 16);
    }

    drawPath();
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
        className="absolute bottom-4 right-4 z-10 p-2 bg-white rounded-full shadow-md"
      >
        {showControls ? '✕' : '⚙️'}
      </button>
      
      {/* Custom controls panel in top left */}
      {showControls && (
        <div 
          ref={controlsRef}
          className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 p-4 rounded-lg shadow-md max-w-xs"
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
