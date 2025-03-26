import React, { useEffect, useState, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { BleClient } from '@capacitor-community/bluetooth-le'; // BLE library
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LeafletCapacitorMap = () => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(0); // Speed in km/h
  const [otherVehicles, setOtherVehicles] = useState([]); // Store data of other vehicles
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);
  const positionHistoryRef = useRef([]);
  const controlsRef = useRef(null);
  const previousPositionRef = useRef(null);
  const vehicleMarkersRef = useRef({}); // Store markers for other vehicles

  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  const calculateSpeed = (newPosition) => {
    if (!previousPositionRef.current) {
      previousPositionRef.current = newPosition;
      return 0;
    }

    const prevPos = previousPositionRef.current;
    const distance = calculateDistance(
      prevPos.lat, prevPos.lng,
      newPosition.lat, newPosition.lng
    );
    
    const timeDiff = (newPosition.timestamp - prevPos.timestamp) / 1000; // in seconds
    
    // Only update if we have a meaningful time difference
    if (timeDiff > 0) {
      // Speed in km/h = (distance in meters / time in seconds) * 3.6
      const calculatedSpeed = (distance / timeDiff) * 3.6;
      
      // Filter out unrealistic jumps (can happen due to GPS errors)
      if (calculatedSpeed < 200) { // Cap at 200 km/h to filter outliers
        previousPositionRef.current = newPosition;
        return calculatedSpeed;
      }
    }
    
    // Keep previous value if calculation seems off
    return speed;
  };

  // Create a custom arrow icon using the provided image
  const createArrowIcon = (heading) => {
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

  // Function to send data via BLE
  const sendDataViaBLE = async (data) => {
    try {
      const jsonData = JSON.stringify(data);
      // Replace with actual BLE write logic
      console.log('Sending data via BLE:', jsonData);
      // Example: await BleClient.write(deviceId, serviceUUID, characteristicUUID, jsonData);
    } catch (err) {
      console.error('Error sending data via BLE:', err);
    }
  };

  // Function to receive data via BLE
  const receiveDataViaBLE = async () => {
    try {
      // Replace with actual BLE read/notification logic
      // Example: const receivedData = await BleClient.read(deviceId, serviceUUID, characteristicUUID);
      const receivedData = '{"id":"123","type":"car","speed":"60","lat":"8.25400","lon":"77.518000","dir":"90"}'; // Mock data
      const parsedData = JSON.parse(receivedData);
      setOtherVehicles((prev) => {
        const updatedVehicles = prev.filter((v) => v.id !== parsedData.id);
        return [...updatedVehicles, parsedData];
      });
    } catch (err) {
      console.error('Error receiving data via BLE:', err);
    }
  };

  // Function to create a vehicle icon based on type
  const createVehicleIcon = (type) => {
    const icons = {
      car: 'car.png',
      bus: 'https://example.com/bus-icon.png',
      truck: 'https://example.com/truck-icon.png',
      bike: 'https://example.com/bike-icon.png',
    };
    return L.icon({
      iconUrl: icons[type] || icons['car'], // Default to car icon
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false, // Remove default zoom control to add custom one
        attributionControl: false // Remove attribution control for full-screen cleanliness
      }).setView([0, 0], 2);
      
      // Add attribution to bottom right
      L.control.attribution({
        position: 'bottomright'
      }).addAttribution('© OpenStreetMap contributors').addTo(mapInstanceRef.current);
      
      // Add zoom control to top right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstanceRef.current);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
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
        
        const newPosition = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude,
          accuracy: coordinates.coords.accuracy,
          timestamp: new Date().getTime(),
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
        
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().getTime(),
          heading: position.coords.heading, // Add heading
        };
        
        // Try to get speed from the Geolocation API first
        let currentSpeed;
        if (position.coords.speed !== null && position.coords.speed !== undefined) {
          // Convert m/s to km/h
          currentSpeed = position.coords.speed * 3.6;
        } else {
          // Calculate speed based on position change
          currentSpeed = calculateSpeed(newPosition);
        }
        
        // Update speed state
        setSpeed(currentSpeed);
        
        // Update position
        setPosition(newPosition);
        positionHistoryRef.current.push(newPosition);
        
        // Limit history length to prevent memory issues
        if (positionHistoryRef.current.length > 100) {
          positionHistoryRef.current = positionHistoryRef.current.slice(-100);
        }
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

  // Update map when position changes
  useEffect(() => {
    if (position && mapInstanceRef.current) {
      const heading = position.heading || 0; // Default to 0 if heading is unavailable

      // Center map if it's the first position or if tracking is on
      if (positionHistoryRef.current.length === 1 || isTracking) {
        mapInstanceRef.current.setView([position.lat, position.lng], 16);
      }
      
      // Add or update marker with arrow icon
      if (markerRef.current) {
        markerRef.current.setLatLng([position.lat, position.lng]);
        markerRef.current.setIcon(createArrowIcon(heading));
      } else {
        markerRef.current = L.marker([position.lat, position.lng], {
          icon: createArrowIcon(heading),
        })
          .addTo(mapInstanceRef.current)
          .bindPopup('You are here');
      }
      
      // Remove accuracy circle logic
      
      // Draw path if we have multiple positions
      if (positionHistoryRef.current.length > 1) {
        const pathPoints = positionHistoryRef.current.map(pos => [pos.lat, pos.lng]);
        
        // Remove old path if exists and draw new one
        mapInstanceRef.current.eachLayer(layer => {
          if (layer instanceof L.Polyline && !(layer instanceof L.Circle)) {
            mapInstanceRef.current.removeLayer(layer);
          }
        });
        
        L.polyline(pathPoints, {
          color: 'red',
          weight: 3,
          opacity: 0.7
        }).addTo(mapInstanceRef.current);
      }
    }
  }, [position, isTracking]);

  // Update map with other vehicles
  useEffect(() => {
    if (mapInstanceRef.current) {
      otherVehicles.forEach((vehicle) => {
        const { id, type, speed, lat, lon } = vehicle;

        // Update or create marker for the vehicle
        if (vehicleMarkersRef.current[id]) {
          vehicleMarkersRef.current[id].setLatLng([lat, lon]);
        } else {
          const marker = L.marker([lat, lon], {
            icon: createVehicleIcon(type),
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(`Speed: ${speed} km/h`);
          vehicleMarkersRef.current[id] = marker;
        }
      });
    }
  }, [otherVehicles]);

  // Send current vehicle data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (position) {
        const data = {
          id: localStorage.getItem('vehicleId'),
          type: localStorage.getItem('vehicleType'),
          speed: speed.toFixed(1),
          lat: position.lat,
          lon: position.lng,
          dir: position.heading || 0,
        };
        sendDataViaBLE(data);
      }
    }, 1000); // Send data every second

    return () => clearInterval(interval);
  }, [position, speed]);

  // Start receiving data via BLE
  useEffect(() => {
    const bleListener = setInterval(() => {
      receiveDataViaBLE();
    }, 1000); // Check for incoming data every second

    return () => clearInterval(bleListener);
  }, []);

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
                  mapInstanceRef.current.setView([position.lat, position.lng], 16);
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