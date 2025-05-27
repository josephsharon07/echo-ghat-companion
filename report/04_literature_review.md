# LITERATURE REVIEW

## Existing System

Current safety systems for mountainous ghat roads primarily rely on **traditional passive measures** such as guardrails, warning signs, and reflective markers. For vehicle-to-vehicle communication, existing technologies include:

- **DSRC (Dedicated Short Range Communications)**: Standard V2V technology with a range of 300-500 meters, requiring direct line-of-sight
- **C-V2X (Cellular Vehicle-to-Everything)**: Communication system dependent on cellular networks and infrastructure
- **Standard GPS navigation apps**: Provide static route guidance without real-time hazard detection
- **Bluetooth-based proximity warning systems**: Limited to very short ranges (30-50 meters)

These systems typically require established infrastructure support and depend on reliable cellular connectivity to function effectively.

## Disadvantages of Existing System

- **Limited range in mountainous terrain**: DSRC and Bluetooth systems have significantly reduced effectiveness in winding mountain roads
- **Cellular dependency**: V2X systems fail in areas with poor or no cellular coverage, which is common in remote ghat roads
- **Infrastructure requirements**: Most solutions need roadside units or cellular towers, making deployment costly in remote areas
- **Battery consumption**: Continuous use of cellular or GPS technologies drains mobile device batteries quickly
- **Lack of specialized algorithms**: Generic navigation systems don't account for the unique challenges of hairpin bends and blind corners
- **No offline functionality**: Most systems cease to function when internet connectivity is lost
- **Driver distraction**: Complex interfaces require visual attention, creating additional safety risks

## Need for the Project

Ghat roads in mountainous regions present **unique safety challenges** that current systems fail to address adequately:

- India records over **150,000 road fatalities annually**, with mountainous regions seeing higher-than-average accident rates
- **85% of serious accidents** on ghat roads occur at blind corners or hairpin bends where drivers lack visibility
- Cellular coverage is **absent or unreliable in 60%** of mountain road stretches
- Emergency response times in these regions average **45-60 minutes longer** than in urban areas
- Existing warning signs and barriers provide only **passive protection** without dynamic information

A specialized system that works independently of cellular infrastructure is essential to address these critical safety gaps and provide reliable communication in these challenging environments.

## Proposed System

The EchoGhat system uses **LoRa (Long Range) wireless technology** integrated with ESP32 microcontrollers to create a mesh-like communication network between vehicles. The system consists of:

1. **ESP32-LoRa hardware gateway**: Creates a WiFi access point and manages LoRa radio communication
2. **Next.js web application**: Provides user interface with interactive mapping
3. **Android mobile application**: Enables location tracking, offline maps, and voice alerts

Each vehicle broadcasts its **location, speed, heading, and vehicle type** while receiving similar data from other EchoGhat users within range. The system works entirely **offline** without requiring cellular connectivity, with LoRa signals capable of propagating over hills and around curves.

## Features of Proposed System

- **Long-range communication**: 2+ kilometer range using LoRa technology (433MHz frequency)
- **Infrastructure independence**: Functions without cellular networks or internet connectivity
- **Advanced heading calculation**: Uses movement-based algorithms instead of unreliable compass data
- **Kalman-filtered speed calculation**: Sophisticated algorithm for accurate speed calculation in mountain terrain
- **Offline maps**: Pre-caches map data for a 50km radius around the user's location
- **Voice safety alerts**: Hands-free notifications about approaching vehicles and road hazards
- **Hairpin bend detection**: Identifies sharp turns and warns about oncoming traffic
- **Low-power operation**: ESP32 deep sleep mode extends battery life
- **Simple user interface**: Minimizes driver distraction with clear visual cues and voice alerts
- **Vehicle type identification**: Distinguishes between cars, trucks, buses, and two-wheelers

## Advantages of Proposed System

- **Enhanced road safety**: Early warning of approaching vehicles around blind corners reduces collision risk
- **Reliable communication**: Works in areas with no cellular coverage
- **Cost-effective solution**: Uses affordable hardware (ESP32, LoRa modules) and open-source software
- **Low operational cost**: No cellular data charges or subscription fees
- **Battery efficiency**: LoRa technology consumes significantly less power than cellular communication
- **Easy adoption**: Simple installation without requiring complex vehicle modifications
- **Scalable communication**: Performance improves as more vehicles adopt the system
- **Privacy-preserving**: No central server storing location history
- **Minimal driver distraction**: Voice alerts allow drivers to maintain focus on the road
- **Adaptable to various vehicles**: Works for both four-wheelers and two-wheelers