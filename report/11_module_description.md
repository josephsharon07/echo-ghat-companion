# CHAPTER 4 MODULE DESCRIPTION

## INTRODUCTION

Implementation is the stage in the project where the theoretical design is transformed into a working system. It provides confidence to the users that the developed application will function reliably and effectively. This stage involves detailed planning, integration of system components, and testing of each module to ensure expected outcomes. In the project "ECHO GHAT - GHAT ROAD SAFETY PROJECT", implementation plays a crucial role in realizing vehicle-to-vehicle communication, GPS tracking, hazard detection, and interactive mapping interfaces to provide effective safety alerts in mountainous ghat roads where cellular connectivity is unreliable or nonexistent.

## MODULE DESCRIPTION

The proposed system offers many advantages over existing systems. "ECHO GHAT - GHAT ROAD SAFETY PROJECT" provides infrastructure-independent communication, offline map capabilities, advanced heading algorithms, and voice-based alerts for enhanced safety in challenging terrain.

Our project is divided into the following modules:

1. ESP32-LoRa Communication Module
2. GPS and Location Management
3. Interactive Map Interface
4. Hazard Detection System
5. User Authentication
6. Mobile Integration

### ESP32-LoRa Communication Module

The ESP32-LoRa Communication Module forms the foundation of the infrastructure-independent communication system that enables the entire EchoGhat network. This module utilizes the ESP32 microcontroller coupled with a LoRa (Long Range) radio transceiver operating at 433MHz frequency.

The firmware implementation creates a self-contained WiFi access point with the SSID "EchoGhat Device" that mobile devices can connect to. Once connected, the ESP32 provides RESTful API endpoints for data exchange:

- `/send` - POST endpoint for transmitting location and vehicle data via LoRa
- `/receive` - GET endpoint for retrieving data received from other vehicles
- `/battery` - GET endpoint for monitoring the device's battery status
- `/status` - GET endpoint for checking system status and connectivity

The LoRa radio implementation includes precise configuration of spreading factor, bandwidth, and coding rate parameters to optimize for the challenging propagation environment of mountainous terrain. The module achieves a communication range exceeding 2 kilometers even in non-line-of-sight conditions.

To maximize battery life, the implementation includes deep sleep functionality when the vehicle is stationary, with intelligent wake-up triggers when movement is detected. Data packets are structured in JSON format with fields for location, speed, heading, vehicle type, and timestamp to ensure efficient transmission while providing all necessary safety information.

This module enables the critical vehicle-to-vehicle communication infrastructure that functions entirely without cellular networks or internet connectivity.

### GPS and Location Management

The GPS and Location Management module handles the acquisition, processing, and interpretation of geospatial data essential for vehicle tracking and hazard detection. This module addresses the unique challenges of GPS reliability in mountainous terrain with dense foliage and steep slopes.

The implementation includes:

1. **Advanced Location Filtering Algorithm**: Implements a customized Kalman filter to smooth out GPS jitter and compensate for temporary signal loss in tunnels or under dense foliage.

2. **Movement-Based Heading Calculation**: Instead of relying on unreliable compass readings (which are affected by magnetic interference in vehicles), the system calculates vehicle heading based on the trajectory of recent GPS positions with a weighted time-decay function.

3. **Speed Calculation**: Implements both instantaneous and average speed calculations, with anomaly detection to filter out erroneous spikes in GPS-reported velocity.

4. **Position History Management**: Maintains a bounded-size history of recent positions to support heading calculations and trajectory prediction while optimizing memory usage.

The module interfaces with the Capacitor Geolocation plugin to access native GPS functionality on Android devices with permission handling for location services. Position updates are acquired continuously when in motion, with adaptive polling rates based on vehicle speed to balance between update frequency and battery consumption.

### Interactive Map Interface

The Interactive Map Interface module provides the visual representation of the vehicle's location, nearby EchoGhat users, and potential hazards. Built using Leaflet.js, this module offers robust mapping capabilities even in offline environments.

The implementation includes:

1. **Offline Map Functionality**: Utilizes the Leaflet.offline plugin to pre-cache map tiles for a 50km radius around the user's current location. This ensures maps remain available even when traveling through areas with no cellular connectivity.

2. **Custom Vehicle Markers**: Implements rotatable vehicle icons that reflect the actual heading of each vehicle, with different icons for cars, trucks, buses, and two-wheelers.

3. **Hazard Visualization**: Represents potential hazards with animated warning indicators on the map, with color-coding based on severity and proximity.

4. **Map Controls**: Provides intuitive zoom, centering, and tracking controls optimized for in-vehicle use with minimal distraction.

5. **Track Recording**: Optionally records the vehicle's path for later review and sharing.

The map component is implemented as a React component using TypeScript for type safety, with state management to handle real-time updates from both the GPS module and incoming LoRa messages.

| Attribute name | Attribute type |
|----------------|---------------|
| latitude | double |
| longitude | double |
| zoom | integer |
| mapStyle | string |
| showOtherVehicles | boolean |
| trackingEnabled | boolean |

Table 4.1 Schema for Map Configuration

### Hazard Detection System

The Hazard Detection System module is responsible for analyzing GPS data, road topology, and vehicle trajectories to identify potential hazards and trigger appropriate alerts. This module is critical for providing advance warning about approaching vehicles, especially around blind corners and hairpin bends.

The implementation includes:

1. **Proximity Analysis**: Calculates the distance and relative approach velocity between the user's vehicle and other EchoGhat devices in the vicinity.

2. **Collision Prediction**: Uses trajectory projection to identify potential collision paths, with priority alerts for head-on approaches on narrow roads.

3. **Hairpin Detection**: Identifies sharp turns in the road geometry through analysis of position history and triggers heightened awareness mode.

4. **Voice Alert System**: Integrates with the WebSpeech API to provide hands-free voice notifications about approaching vehicles, allowing drivers to maintain visual focus on the road.

5. **Alert Prioritization**: Implements an intelligent alert queue that prioritizes imminent hazards to prevent alert fatigue.

The module processes incoming LoRa messages to extract vehicle positions, then applies spatial algorithms to determine risk levels. Alert thresholds are adjustable based on user preferences and road conditions.

| Attribute name | Attribute type |
|----------------|---------------|
| alertType | enum (COLLISION, APPROACHING, HAIRPIN) |
| severity | enum (LOW, MEDIUM, HIGH) |
| distance | double |
| relativeHeading | double |
| vehicleType | enum (CAR, TRUCK, BUS, BIKE) |
| timestamp | timestamp |

Table 4.2 Schema for Hazard Alerts

### User Authentication

The User Authentication module provides secure access to the EchoGhat application, ensuring that user preferences, vehicle information, and location data are protected. While the core safety functionality works without requiring login, authentication enables enhanced features and personalization.

The implementation utilizes Supabase authentication services with:

1. **Email/Password Authentication**: Secure login with password hashing and protection against common attacks.

2. **Vehicle Profile Management**: Allows users to specify their vehicle type, which affects both the icon displayed on other users' maps and the collision risk calculations.

3. **Preference Persistence**: Stores user preferences such as alert thresholds, voice settings, and map configurations.

4. **Session Management**: Maintains authenticated sessions with secure token handling for seamless resumption of activity.

Authentication is optional but recommended for full feature access, with careful consideration for the offline nature of the application. User credentials and preference sync occur when internet connectivity is available, but the absence of connection does not prevent core safety functionality.

### Mobile Integration

The Mobile Integration module bridges the web application with native Android capabilities using the Capacitor framework. This enables access to device sensors, background processing, and native UI components essential for a seamless mobile experience.

The implementation includes:

1. **Background Operation**: Allows the EchoGhat application to continue monitoring and broadcasting location even when the screen is off or another app is in the foreground.

2. **Native Sensor Access**: Provides optimized access to GPS, accelerometer, and compass sensors with appropriate power management.

3. **Notification System**: Implements Android notifications for critical alerts when the app is in the background.

4. **Offline Functionality**: Ensures all critical features work without internet connectivity, with smart storage management for map tiles and vehicle data.

5. **Hardware Integration**: Manages connections to the ESP32-LoRa gateway device via WiFi, with automatic reconnection when in range.

The Capacitor configuration optimizes battery usage while ensuring reliable performance, addressing the unique challenges of using a mobile device as a safety system in a moving vehicle with intermittent connectivity.