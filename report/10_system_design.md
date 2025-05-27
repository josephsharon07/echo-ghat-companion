# SYSTEM DESIGN

## INTRODUCTION

System design is the process of planning how the different parts of a project will work together. It helps turn user needs into a clear technical solution. In the EchoGhat Road Safety Project, system design shows how vehicle location data, LoRa communication, ESP32 hardware, GPS sensors, mapping interface, and safety alert features connect and work smoothly.

We use object-oriented design and simple diagrams like architecture diagram, use case diagram, class diagram, and data flow diagrams to explain how users, vehicles, and system components (like mapping, communication, and alerts) interact with each other. This helps us clearly understand how the whole system works to enhance road safety in mountainous ghat regions.

## ARCHITECTURE DIAGRAM

The architecture diagram illustrates the overall structure of the EchoGhat Road Safety System, showing how the various components interact to create a comprehensive safety solution for mountainous ghat roads.

At the center is the **ESP32-LoRa Gateway Device**, which serves as the critical communication hub. This hardware component consists of the ESP32 microcontroller coupled with a LoRa radio module operating at 433MHz. The gateway creates a local WiFi access point and manages the LoRa radio communication, including transmission and reception of vehicle data packets.

Connected to the ESP32-LoRa Gateway through a WiFi connection is the **Next.js Web Application**, which provides the user interface and core functionality. This component is responsible for GPS tracking, map visualization, vehicle detection, and safety alerts. It includes several key modules: the Map Component (for displaying location and other vehicles), the Settings Component (for user preferences), and the Safety Alert System (for processing hazard warnings).

The **Capacitor Mobile Wrapper** encapsulates the web application and provides native device access, enabling features like GPS location services, accelerometer data, and background processing on Android devices.

The architecture shows how location data flows from GPS satellites to the user's device, how this information is processed through the application, and how it is transmitted via LoRa to other vehicles in the vicinity (and vice versa). This creates a decentralized vehicle-to-vehicle communication network that functions entirely without cellular infrastructure.

The diagram also highlights the offline capabilities of the system, including map tile caching and local storage of vehicle information, which are essential for operation in remote mountain areas.

![Architecture Diagram](./images/Architecture%20Diagram.svg)

Figure 3.1 Architecture Diagram

## ER DIAGRAM

The Entity Relationship (ER) diagram represents the logical structure of the data management in the EchoGhat Road Safety Project. It visually depicts the key entities: Users, Vehicles, and Messages, and describes the relationships between them.

The **Users** entity contains the attributes: User_id (primary key), Username, and Preferences. These fields are essential for user identification and personalized settings. The **Vehicles** entity stores information about each vehicle using the system, including Vehicle_id (primary key), Type (car, truck, bike, or bus), and Owner_id (foreign key linking to Users).

The **Messages** entity represents the communication packets sent between vehicles via LoRa technology. Its attributes include Message_id (primary key), Sender_id (foreign key to Vehicles), Location_data (latitude and longitude), Speed, Heading, and Timestamp.

The relationship between Users and Vehicles is one-to-many, meaning each user can have multiple vehicles registered in the system, but each vehicle belongs to only one user. The relationship between Vehicles and Messages is also one-to-many, as each vehicle can send multiple messages, and each message is sent by exactly one vehicle.

This ER diagram ensures that all communication is properly tracked and linked to specific vehicles and users, allowing for efficient data management in the offline environment of the EchoGhat system.

![ER Diagram](./images/ER%20Diagram.svg)

Figure 3.2 ER Diagram

## CLASS DIAGRAM

A class diagram is a part of the Unified Modeling Language (UML) that describes the structure of a software system by showing its classes, attributes, methods, and the relationships between them. In the EchoGhat project, the class diagram represents the core components of the road safety system.

The **User** class manages user information and preferences. The **Vehicle** class handles vehicle-specific data like type, ID, and owner reference. The **LoRaGateway** class manages the ESP32-LoRa hardware communication, with methods for sending and receiving data packets.

The **MapController** class is responsible for the mapping interface, offline map storage, and vehicle visualization. The **SafetyAlertSystem** class processes incoming vehicle data to detect potential hazards and trigger appropriate warnings.

There is a composition relationship between User and Vehicle (users own vehicles), and association relationships between Vehicle and LoRaGateway (vehicles communicate via LoRa) and between MapController and SafetyAlertSystem (map data is used for safety calculations).

This structure supports the distributed nature of the EchoGhat system, allowing each component to fulfill its responsibilities while maintaining the necessary connections for effective vehicle-to-vehicle communication.

![Class Diagram](./images/Class%20Diagram.svg)

Figure 3.3 Class Diagram

## USE CASE DIAGRAM

The Use Case Diagram illustrates the various interactions between users and the EchoGhat Road Safety System. It visually represents how the system responds to different user-initiated actions. This diagram includes two actors: the Driver and the System.

The Driver actor represents an individual using the EchoGhat device while navigating ghat roads. The System actor symbolizes the internal system functionalities that support driver safety. Each ellipse (oval shape) denotes a specific use case or feature provided by the system.

The primary use cases are:

- **Register Vehicle**: Allows a driver to register their vehicle type and ID in the system
- **View Map**: Enables the driver to see the interactive map with their current location
- **Receive Safety Alerts**: Notifies the driver about approaching vehicles and road hazards
- **Track Other Vehicles**: Shows the position of other EchoGhat users in the vicinity
- **Configure Settings**: Lets the driver adjust alert preferences and system settings
- **Save Offline Maps**: Stores map data for areas without internet connectivity

All interactions initiated by the driver are supported by the internal system components, particularly the LoRa communication network that enables vehicle-to-vehicle data exchange without cellular infrastructure.

This use case diagram effectively outlines the high-level functional requirements and user interactions, providing a clear understanding of how the system is designed to enhance road safety in mountainous regions.

![Use Case Diagram](./images/Use%20Case%20Diagram.svg)

Figure 3.4 Use Case Diagram

## ACTIVITY DIAGRAM

The activity diagram illustrates the flow of user activities in the EchoGhat Road Safety System. It represents the sequence of steps that a driver follows from device initialization to receiving safety alerts and responding to hazards.

The process begins when the driver starts the vehicle and turns on the EchoGhat device. The system initializes by establishing a LoRa connection and accessing the GPS location. If the GPS signal is found, the system loads the map centered on the current location; if not, it continues trying to acquire GPS data.

Once the map is loaded, the system enters a parallel workflow where it simultaneously:
1. Broadcasts the vehicle's location, speed, and heading data
2. Listens for data from other nearby EchoGhat devices
3. Processes incoming data to calculate potential hazards

When a potential hazard is detected (such as an approaching vehicle around a blind corner), the system generates an appropriate voice alert. The driver then takes necessary action based on the alert.

This activity diagram clearly depicts the real-time, continuous nature of the EchoGhat system's operation during vehicle movement on ghat roads.

![Activity Diagram](./images/Activity%20Diagram.svg)

Figure 3.5 Activity Diagram

## SEQUENCE DIAGRAM

The sequence diagram illustrates the step-by-step interaction between the Driver, Mobile App, LoRa Gateway, and Other Vehicles components of the EchoGhat Road Safety System. It shows the flow of messages over time and highlights how the system processes location data and provides safety alerts.

The sequence begins with the Driver initiating the EchoGhat app. The Mobile App connects to the LoRa Gateway, which then begins broadcasting the vehicle's location data (obtained from the device's GPS). Simultaneously, the LoRa Gateway listens for signals from other EchoGhat-equipped vehicles in the vicinity.

When another vehicle is detected, its location data is received by the LoRa Gateway and passed to the Mobile App. The Mobile App processes this data to determine if the vehicle poses a potential hazard (based on distance, relative direction, and road geometry). If a hazard is detected, the app generates an appropriate voice alert for the Driver.

The diagram also shows the continuous nature of this communication, with periodic updates of location data being exchanged between vehicles as they move along the ghat roads.

![Sequence Diagram](./images/Sequence%20Diagram.svg)

Figure 3.6 Sequence Diagram

## DATA FLOW DIAGRAM

A Data Flow Diagram (DFD) is a graphical representation that shows how data moves through a system. It illustrates the flow of information between drivers, processes, data stores, and external components. DFDs help visualize how inputs are transformed into outputs, making it easier to understand and design complex systems.

### DFD Level 0

The Level 0 Data Flow Diagram represents the overall flow of the EchoGhat Road Safety System as a single process. The driver interacts with the system by providing location data via GPS. The system processes this data along with incoming signals from other vehicles, and provides appropriate safety alerts as output. This high-level diagram highlights the interaction between the external user (driver) and the main system function without detailing internal processes or data stores.

![DFD Level 0](./images/DFD%20Level%200.svg)

Figure 3.7 Data Flow Diagram Level 0

### DFD Level 1

The Level 1 Data Flow Diagram (DFD) shows how the main processes in the EchoGhat system work together. First, the GPS Location Tracking process (1.1) collects the vehicle's current position, speed, and heading, storing it in the Vehicle Data store (D1).

The LoRa Communication process (1.2) both broadcasts the vehicle's data and receives data from other vehicles, which is then stored in the Nearby Vehicles store (D2). The Hazard Detection process (1.3) analyzes this information to identify potential safety risks.

When hazards are detected, the Alert Generation process (1.4) creates appropriate voice and visual warnings for the driver. Simultaneously, the Map Visualization process (1.5) displays the vehicle's position and nearby EchoGhat users on the offline map interface.

![DFD Level 1](./images/DFD%20Level%201.svg)

Figure 3.8 Data Flow Diagram Level 1