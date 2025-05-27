# RESULTS AND TESTING

## 5.1 SCREENSHOTS FOR HOME PAGE

![Figure 5.1 Screenshot for Home page](../public/screenshots/home_page.png)

* This welcoming screen introduces users to the EchoGhat Road Safety System.
* It features a clean, intuitive interface with quick access to the map and safety features.
* The design uses high-contrast elements to ensure visibility even in bright daylight while driving.
* Navigation options are prominently displayed for easy access to key functions.

## 5.2 SCREENSHOT FOR SIGN UP PAGE

![Figure 5.2 Screenshot for Signup page](../public/screenshots/signup_page.png)

* The signup form allows new users to create an account by entering a username, email, and password.
* It features vehicle type selection, critical for appropriate hazard calculations and map icons.
* The layout is designed for quick completion, minimizing distraction during pre-journey setup.
* Form validation ensures all necessary information is collected accurately.

## 5.3 SCREENSHOT FOR LOGIN PAGE

![Figure 5.3 Screenshot for Login page](../public/screenshots/login_page.png)

* This login page allows existing users to access the platform by entering their email and password.
* The design emphasizes quick access with minimal input required.
* An optional "Continue without login" button enables core safety features without requiring authentication.
* Offline login capabilities ensure access even without internet connectivity.

## 5.4 SCREENSHOT FOR SUCCESSFUL LOGON

![Figure 5.4 Screenshot for Successful Login](../public/screenshots/successful_login.png)

* The above screenshot displays a successful login attempt on the application.
* A confirmation indicator appears briefly before redirecting to the main interface.
* User preferences and vehicle settings are automatically loaded upon successful authentication.
* This indicates that the user authentication system is working correctly.

## 5.5 SCREENSHOT FOR DASHBOARD

![Figure 5.5 Screenshot for Dashboard](../public/screenshots/dashboard.png)

* The screenshot above shows the dashboard view that appears after successful login.
* Key metrics including connection status, nearby vehicles, and system health are displayed.
* Quick access buttons for the map, settings, and LoRa gateway connection are prominently shown.
* This confirms that the user has been authenticated and granted access to the main features of the application.

## 5.6 SCREENSHOT FOR MAP INTERFACE

![Figure 5.6 Screenshot for Map Interface](../public/screenshots/map_interface.png)

* The screenshot shows the interactive Map Interface where the user's current position is centered.
* Other EchoGhat-equipped vehicles are displayed with directional icons showing their heading.
* The map features offline capability with pre-cached tiles for the surrounding 50km radius.
* Road hazards and approaching vehicle warnings are visually indicated with highlighted markers.
* The status bar shows connection to the LoRa gateway and current GPS accuracy.

## 5.7 SCREENSHOT FOR VEHICLE DETECTION

![Figure 5.7 Screenshot for Vehicle Detection](../public/screenshots/vehicle_detection.png)

* This screenshot displays the system actively detecting an approaching vehicle around a blind corner.
* The detected vehicle is highlighted with distance and approach speed indicators.
* A visual warning appears along with the voice alert "Vehicle approaching from right, 200 meters."
* The hazard severity is color-coded (yellow for moderate, red for immediate attention required).
* Map view automatically adjusts to show both vehicles and their projected paths.

## 5.8 SCREENSHOT FOR HAIRPIN BEND ALERT

![Figure 5.8 Screenshot for Hairpin Bend Alert](../public/screenshots/hairpin_alert.png)

* This screenshot showcases the Hairpin Bend Alert feature in action.
* The system has detected an upcoming hairpin turn based on road geometry analysis.
* A visual indicator shows the sharp turn ahead with appropriate warning distance.
* Voice alert "Hairpin bend ahead, reduce speed" complements the visual warning.
* If other vehicles are detected in the vicinity of the hairpin, their presence is highlighted with enhanced visibility.

## 5.9 SCREENSHOT FOR SETTINGS PAGE

![Figure 5.9 Screenshot for Settings Page](../public/screenshots/settings_page.png)

* This screenshot captures the Settings interface where users can customize their experience.
* Options include alert volume, voice selection, and distance units (meters/feet).
* Vehicle type selection affects both the icon displayed to others and collision risk calculations.
* Map preferences allow toggling between different view modes (satellite, terrain, street).
* Alert thresholds can be adjusted based on user comfort level and driving conditions.

## 5.10 SCREENSHOT FOR OFFLINE MAP MANAGEMENT

![Figure 5.10 Screenshot for Offline Map Management](../public/screenshots/offline_maps.png)

* This page shows the Offline Map Management interface.
* Users can select regions to pre-download for offline use.
* Storage usage indicators help manage device space efficiently.
* Downloaded regions are shown with date of last update and coverage area.
* One-touch update option refreshes map data when connectivity is available.

## 5.11 SCREENSHOT FOR LORA GATEWAY CONNECTION

![Figure 5.11 Screenshot for LoRa Gateway Connection](../public/screenshots/lora_connection.png)

* This screenshot displays the LoRa Gateway Connection page.
* Status indicators show signal strength, battery level, and active connections.
* Network name and connection details are displayed for troubleshooting.
* Connection wizard helps users establish communication with their EchoGhat device.
* Advanced settings are available for customizing radio parameters if needed.

## 5.12 SCREENSHOT FOR PROFILE MANAGEMENT

![Figure 5.12 Screenshot for Profile Management](../public/screenshots/profile_management.png)

* This page shows the user profile management interface.
* Users can update their personal information and vehicle details.
* Privacy settings allow controlling what information is shared with nearby vehicles.
* History of recent journeys with safety statistics is available for review.
* Account preferences can be synchronized for use across multiple devices.

## 5.13 SCREENSHOT FOR HELP AND SUPPORT

![Figure 5.13 Screenshot for Help and Support](../public/screenshots/help_support.png)

* This page provides access to help resources and support options.
* Tutorial videos demonstrate key features and safety functions.
* Troubleshooting guides address common issues with connectivity or GPS.
* Feedback mechanism allows users to report problems or suggest improvements.
* Emergency contact information is prominently displayed for roadside assistance.

## 5.14 TESTING

Testing is a critical phase in the software development lifecycle to ensure the correctness, reliability, and performance of the system. For the EchoGhat Road Safety Project, various testing methodologies were applied to verify that the system behaves as expected in different scenarios, particularly focusing on the challenging environment of mountainous ghat roads.

### 5.14.1 Unit Testing

Unit testing involves testing individual components or functions of the system in isolation. Each module such as the GPS tracking, LoRa communication, hazard detection, and voice alert system was tested separately using sample inputs to validate their outputs. Jest was used for JavaScript components, while Arduino unit testing frameworks were employed for the ESP32 firmware testing. These tests verified:

* Accuracy of GPS position calculations
* Correct formatting and parsing of LoRa JSON messages
* Proper detection of hazard conditions based on sample data
* Voice alert generation with correct pronunciation and timing

### 5.14.2 Integration Testing

Integration testing ensures that different modules of the EchoGhat system—such as the ESP32 gateway, mobile application, and mapping interface—work together seamlessly. After unit testing, modules were combined, and test cases were executed to check the flow of data between them. For example:

* Transmission of GPS coordinates from the mobile app to the LoRa gateway
* Reception and display of other vehicles' data on the map interface
* Hazard detection based on combined data from multiple sources
* Voice alert triggering based on detected hazards

These tests verified that data flowed correctly through the system's components and that each part responded appropriately to inputs from other modules.

### 5.14.3 Functional Testing

Functional testing was performed to verify whether the EchoGhat system met the specified requirements. Test cases included:

* Detecting approaching vehicles at various distances and angles
* Identifying hazardous road conditions such as hairpin bends
* Operating correctly without internet connectivity
* Providing timely voice alerts with appropriate urgency based on proximity
* Maintaining location accuracy in challenging GPS environments

Each function was tested with both typical and edge-case inputs to ensure robustness across a range of driving scenarios.

### 5.14.4 Field Testing

Field testing was particularly important for the EchoGhat system due to its real-world safety implications. The system was tested in actual mountainous ghat roads to validate performance under genuine conditions:

* Range testing of LoRa communication in various terrain configurations
* GPS accuracy in dense foliage and steep canyons
* Alert timing and relevance in real driving situations
* Battery life and power management during extended journeys
* System resilience to environmental factors like temperature variations and vibration

These real-world tests provided valuable validation of the system's effectiveness in its intended environment and identified practical improvements needed before final deployment.

## 5.15 TEST CASES

### LoRa Communication Module

| Test Case ID | Description | Input | Expected Result |
|-------------|-------------|-------|----------------|
| TC-LORA-01 | Valid data transmission | GPS coordinates in JSON format | Data successfully transmitted with acknowledgment |
| TC-LORA-02 | Out of range detection | Move devices beyond maximum range | Connection loss detected and reported to user |
| TC-LORA-03 | Message integrity | Send message with checksum | Receiver validates checksum and accepts only valid messages |
| TC-LORA-04 | Battery optimization | Device stationary for 5 minutes | Deep sleep mode activated with periodic wake-up |
| TC-LORA-05 | Recovery from interference | Create signal interference | System recovers and re-establishes communication |

Table 5.1 LoRa Communication Testing

### Location and Mapping

| Test Case ID | Description | Input | Expected Result |
|-------------|-------------|-------|----------------|
| TC-MAP-01 | Accurate position display | GPS coordinates | Position marked correctly on map with ±5m accuracy |
| TC-MAP-02 | Offline map functionality | Disable internet | Map continues to function with pre-cached tiles |
| TC-MAP-03 | Vehicle heading calculation | Move in curved path | Heading indicator shows correct direction of travel |
| TC-MAP-04 | Map rotation and zoom | Touch gestures | Map responds with appropriate rotation and zoom |
| TC-MAP-05 | Poor GPS handling | Block GPS signal temporarily | System indicates reduced accuracy and relies on estimation |

Table 5.2 Location and Mapping Testing

### Hazard Detection

| Test Case ID | Description | Input | Expected Result |
|-------------|-------------|-------|----------------|
| TC-HAZ-01 | Approaching vehicle detection | Vehicle approaching at 50 km/h | Alert triggered at appropriate distance based on speed |
| TC-HAZ-02 | Hairpin bend detection | Approach hairpin curve | Advanced warning provided before reaching the curve |
| TC-HAZ-03 | Multiple hazard prioritization | Several simultaneous hazards | Most critical hazard presented first with others queued |
| TC-HAZ-04 | False positive filtering | Non-threatening situation | No alert triggered to avoid alert fatigue |
| TC-HAZ-05 | Alert escalation | Hazard distance decreasing rapidly | Alert urgency increases with proximity |

Table 5.3 Hazard Detection Testing

### User Interface

| Test Case ID | Description | Action | Expected Result |
|-------------|-------------|--------|----------------|
| TC-UI-01 | Responsive design | View on various screen sizes | Interface elements adjust appropriately |
| TC-UI-02 | Daylight readability | Test in bright sunlight | Interface remains visible and usable |
| TC-UI-03 | Minimal distraction | Use while simulating driving | Interface requires minimal attention from driver |
| TC-UI-04 | Voice control functionality | Issue voice commands | System recognizes and executes commands |
| TC-UI-05 | Night mode | Toggle night mode | Display adjusts for low-light conditions |

Table 5.4 User Interface Testing