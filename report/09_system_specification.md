# 2.3 SYSTEM SPECIFICATION

## 2.3.1 General Description

A Software Requirements Specification (SRS) is a detailed description of the software system to be developed. It outlines both the functional and non-functional requirements and often includes a set of use cases that explain how users will interact with the system.

The purpose of an SRS is to establish a mutual understanding between clients and developers regarding what the software will and will not do. It enables thorough analysis of requirements before the design phase begins and helps minimize errors during development. Additionally, an SRS provides a reliable basis for estimating costs, assessing potential risks, and managing project timelines.

Used properly, a well-documented SRS can help prevent project failures by clearly defining the scope and expectations. It must include all necessary requirements to ensure successful software development. Deriving these requirements demands a clear understanding of the project, which is achieved through consistent communication between the development team and the client throughout the software lifecycle.

The EchoGhat Road Safety Project addresses the critical safety challenges in mountainous ghat roads where cellular connectivity is unreliable. The system enables vehicle-to-vehicle communication without relying on traditional infrastructure, providing real-time alerts about approaching vehicles, especially around blind corners and hairpin bends. This specification outlines the technologies, components, and requirements necessary to implement this safety system effectively.

## 2.3.2 Technologies Used

### Next.js
Next.js is a React framework that enables server-side rendering and generating static websites. In the EchoGhat project, Next.js provides the foundation for the web application, offering features like file-based routing, API routes, and optimized performance. The framework allows for a seamless user experience while handling the complex mapping and communication features required for the safety system.

### React
React is a JavaScript library for building user interfaces, particularly single-page applications. In this project, React manages the interactive components of the map interface, vehicle displays, and settings panels. The component-based architecture of React allows for modular development and efficient state management across the application.

### TypeScript
TypeScript extends JavaScript by adding static type definitions, enhancing code quality and developer productivity. The EchoGhat project utilizes TypeScript to ensure type safety when handling critical data such as GPS coordinates, vehicle information, and communication protocols, reducing potential runtime errors in the safety-critical application.

### Capacitor
Capacitor is a cross-platform native runtime that enables web applications to run as native mobile apps with access to device features. In the EchoGhat system, Capacitor provides access to the device's GPS, compass, and accelerometer sensors, which are essential for accurate location tracking and heading calculation. It also manages background processing and native HTTP communications with the LoRa gateway.

### Leaflet.js
Leaflet is an open-source JavaScript library for interactive maps. The EchoGhat project uses Leaflet with custom plugins for offline map capabilities, allowing the system to function without internet connectivity. The library handles map rendering, vehicle markers, path tracking, and spatial calculations crucial for safety alerts.

### Arduino (C/C++)
Arduino programming (based on C/C++) is used for the ESP32 microcontroller that powers the LoRa gateway. This technology handles the low-level operations of the system, including LoRa radio communication, WiFi access point creation, power management, and API endpoints for data exchange with the mobile application.

### LoRa Technology
LoRa (Long Range) is a spread spectrum modulation technique that enables long-range, low-power wireless communication. Operating at 433MHz in the EchoGhat system, LoRa provides reliable communication over distances exceeding 2 kilometers in mountainous terrain, even without line-of-sight between vehicles. The technology forms the backbone of the infrastructure-independent communication network.

### ESP32 Microcontroller
The ESP32 is a powerful, low-cost microcontroller with integrated WiFi and Bluetooth capabilities. In the EchoGhat system, it serves as the central processor for the LoRa gateway, managing wireless communications, data processing, and power optimization. The dual-core processor handles concurrent tasks efficiently, while the deep sleep functionality extends battery life for field operations.

### LocalStorage API
The LocalStorage API provides a simple key-value storage mechanism in web browsers. The EchoGhat application uses LocalStorage for offline data persistence, storing map tiles, vehicle IDs, user preferences, and configuration settings. This enables the system to function reliably without continuous connectivity to external servers.

### WebSpeech API
The WebSpeech API enables voice recognition and speech synthesis capabilities in web applications. The EchoGhat system utilizes the speech synthesis component to deliver hands-free voice alerts about approaching vehicles and road hazards, allowing drivers to maintain visual focus on challenging mountain roads while receiving critical safety information.