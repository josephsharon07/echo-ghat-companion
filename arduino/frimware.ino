#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Pin definitions
#define SCK_PIN 5
#define MISO_PIN 19
#define MOSI_PIN 27
#define NSS_PIN 18
#define RST_PIN 23
#define DIO0_PIN 26
#define STATUS_LED 13
#define POWER_BUTTON 12
#define BATTERY_PIN 34

// Access Point configuration
const char* ap_ssid = "EchoGhat Device 02";      // Name of the AP
const char* ap_password = "loragateway";     // Password for the AP (must be at least 8 characters)
IPAddress local_ip(192, 168, 4, 1);         // IP address of the AP
IPAddress gateway(192, 168, 4, 1);          // Gateway (same as IP)
IPAddress subnet(255, 255, 255, 0);         // Subnet mask

// Battery voltage calculation
const float BATTERY_DIVIDER_RATIO = 2.0;    // 100k/(100k+100k) = 0.5, inverse = 2
const float ADC_REFERENCE_VOLTAGE = 3.3;
const float ADC_RESOLUTION = 4095.0;

// Server & data handling
WebServer server(80);
JsonArray receivedDataArray;                // Store received data as an array
DynamicJsonDocument receivedDataDoc(8192);  // Document to store multiple messages
bool deviceStatus = true;

// Deep sleep configuration
const int DEBOUNCE_TIME = 100;              // ms
bool powerButtonPressed = false;
unsigned long lastDebounceTime = 0;

// Function prototypes
void setupLoRa();
void setupAccessPoint();
void handleSend();
void handleReceive();
void handleBattery();
void handleStatus();
void receiveLoRaData();
float readBatteryVoltage();
int batteryPercentage(float voltage);
void IRAM_ATTR handlePowerButton();
void goToDeepSleep();
void handleCORS();
void handleNotFound();
void handleRoot();

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n----- ESP32 LoRa Web Server Starting (AP Mode) -----");
  Serial.println("Initializing...");
  
  // Initialize pins
  Serial.println("Setting up pins...");
  pinMode(STATUS_LED, OUTPUT);
  pinMode(POWER_BUTTON, INPUT_PULLUP);
  digitalWrite(STATUS_LED, HIGH);           // Turn on status LED
  Serial.println("Status LED ON, Power button configured with pull-up");
  
  // Set up interrupt for power button
  attachInterrupt(digitalPinToInterrupt(POWER_BUTTON), handlePowerButton, FALLING);
  Serial.println("Power button interrupt attached");
  
  // Initialize LoRa module
  setupLoRa();
  
  // Set up Access Point
  setupAccessPoint();
  
  // Set up server endpoints
  Serial.println("Setting up HTTP server endpoints...");
  
  // Root endpoint (for test page)
  server.on("/", HTTP_GET, handleRoot);
  
  // Handle OPTIONS requests for CORS preflight
  server.on("/send", HTTP_OPTIONS, handleCORS);
  server.on("/receive", HTTP_OPTIONS, handleCORS);
  server.on("/battery", HTTP_OPTIONS, handleCORS);
  server.on("/status", HTTP_OPTIONS, handleCORS);
  
  // Regular endpoints
  server.on("/send", HTTP_POST, handleSend);
  server.on("/receive", HTTP_GET, handleReceive);
  server.on("/battery", HTTP_GET, handleBattery);
  server.on("/status", HTTP_GET, handleStatus);
  
  // Handle not found
  server.onNotFound(handleNotFound);
  
  // Start server
  server.begin();
  Serial.println("HTTP server started at IP: " + local_ip.toString());
  
  // Initialize JSON array for storing received data
  receivedDataArray = receivedDataDoc.to<JsonArray>();
  Serial.println("JSON data storage initialized");
  
  Serial.println("----- Initialization Complete -----");
}

void loop() {
  server.handleClient();
  
  // Check for incoming LoRa packets
  receiveLoRaData();
  
  // Check if power button was pressed (debounce)
  if (powerButtonPressed && ((millis() - lastDebounceTime) > DEBOUNCE_TIME)) {
    Serial.println("Power button press confirmed after debounce");
    powerButtonPressed = false;
    goToDeepSleep();
  }
  
  // Blink status LED to indicate device is running
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    lastBlink = millis();
    
    // Log system status every 10 seconds
    static unsigned long lastStatusLog = 0;
    if (millis() - lastStatusLog > 10000) {
      Serial.println("--- System Status ---");
      Serial.print("Uptime: ");
      Serial.print(millis() / 1000);
      Serial.println(" seconds");
      
      // Log WiFi AP status
      Serial.print("AP SSID: ");
      Serial.println(ap_ssid);
      Serial.print("Connected clients: ");
      Serial.println(WiFi.softAPgetStationNum());
      
      Serial.print("Battery voltage: ");
      Serial.print(readBatteryVoltage());
      Serial.println("V");
      Serial.print("Stored messages: ");
      Serial.println(receivedDataArray.size());
      Serial.println("-------------------");
      lastStatusLog = millis();
    }
  }
}

// Simple HTML page for root endpoint (/) to test connection
void handleRoot() {
  Serial.println("Serving root page to client");
  
  // Send CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  String html = "<!DOCTYPE html><html><head><title>ESP32 LoRa Gateway</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;line-height:1.6;} ";
  html += "h1{color:#0066cc;} button{background:#0066cc;color:white;border:none;padding:10px 15px;";
  html += "border-radius:4px;cursor:pointer;margin:5px 0;} button:hover{background:#0055aa;}";
  html += ".data{background:#f0f0f0;padding:10px;border-radius:4px;margin:10px 0;}</style></head>";
  html += "<body><h1>ESP32 LoRa Gateway</h1>";
  html += "<p>This is your ESP32 LoRa device running in Access Point mode.</p>";
  html += "<div><button onclick='checkStatus()'>Check Status</button></div>";
  html += "<div><button onclick='checkBattery()'>Check Battery</button></div>";
  html += "<div class='data' id='status'></div>";
  
  html += "<script>";
  html += "async function checkStatus() {";
  html += "  const response = await fetch('/status');";
  html += "  const data = await response.json();";
  html += "  document.getElementById('status').innerHTML = '<h3>Status:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';";
  html += "}";
  html += "async function checkBattery() {";
  html += "  const response = await fetch('/battery');";
  html += "  const data = await response.json();";
  html += "  document.getElementById('status').innerHTML = '<h3>Battery:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';";
  html += "}";
  html += "</script></body></html>";
  
  server.send(200, "text/html", html);
}

// Handle preflight CORS requests
void handleCORS() {
  Serial.println("Handling OPTIONS preflight request");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  server.sendHeader("Access-Control-Max-Age", "86400"); // 24 hours cache for preflight
  server.send(200);
}

// Handle 404 Not Found
void handleNotFound() {
  Serial.println("Handling 404 Not Found");
  // Always send CORS headers even for 404
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  server.send(404, "text/plain", "Not Found");
}

void setupLoRa() {
  Serial.println("Setting up LoRa...");
  
  // Set up SPI pins
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, NSS_PIN);
  Serial.println("SPI initialized with pins:");
  Serial.println("  SCK: " + String(SCK_PIN));
  Serial.println("  MISO: " + String(MISO_PIN));
  Serial.println("  MOSI: " + String(MOSI_PIN));
  Serial.println("  NSS: " + String(NSS_PIN));
  
  // Setup LoRa module
  LoRa.setPins(NSS_PIN, RST_PIN, DIO0_PIN);
  Serial.println("LoRa pins configured:");
  Serial.println("  NSS: " + String(NSS_PIN));
  Serial.println("  RST: " + String(RST_PIN));
  Serial.println("  DIO0: " + String(DIO0_PIN));
  
  // Initialize LoRa
  Serial.println("Initializing LoRa module...");
  if (!LoRa.begin(433E6)) { // Adjust frequency as needed for your region (915MHz for US, 868MHz for EU)
    Serial.println("LoRa initialization failed! Check your connections.");
    Serial.println("System halted.");
    while (1);
  }
  
  // Set parameters if needed
  // LoRa.setSpreadingFactor(8);
  // LoRa.setSignalBandwidth(125E3);
  // LoRa.setCodingRate4(5);
  
  Serial.println("LoRa initialized successfully at 433MHz!");
}

void setupAccessPoint() {
  Serial.println("Setting up ESP32 as Access Point...");
  
  // Start WiFi in AP mode
  WiFi.mode(WIFI_AP);
  
  // Configure AP with static IP
  if (!WiFi.softAPConfig(local_ip, gateway, subnet)) {
    Serial.println("AP configuration failed!");
  }
  
  // Start the AP
  if (!WiFi.softAP(ap_ssid, ap_password)) {
    Serial.println("AP setup failed!");
    Serial.println("Restarting...");
    delay(1000);
    ESP.restart();
  }
  
  Serial.println("Access Point started successfully!");
  Serial.print("SSID: ");
  Serial.println(ap_ssid);
  Serial.print("Password: ");
  Serial.println(ap_password);
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
  Serial.println("Device is now hosting its own WiFi network!");
}

// HTTP endpoint handlers
void handleSend() {
  Serial.println("Received HTTP POST request to /send");
  
  // Send CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  if (server.hasArg("plain")) {
    String message = server.arg("plain");
    Serial.println("Message received: " + message);
    
    // Validate JSON
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      server.send(400, "text/plain", "Invalid JSON format: " + String(error.c_str()));
      return;
    }
    
    // Send data over LoRa
    Serial.println("Sending message over LoRa...");
    LoRa.beginPacket();
    LoRa.print(message);
    LoRa.endPacket();
    
    // Confirm success
    Serial.println("Message sent via LoRa successfully");
    server.send(200, "text/plain", "Data sent via LoRa");
    
    // Blink LED to indicate data sent
    digitalWrite(STATUS_LED, LOW);
    delay(100);
    digitalWrite(STATUS_LED, HIGH);
  } else {
    Serial.println("Error: No data provided with POST request");
    server.send(400, "text/plain", "No data provided");
  }
}

void handleReceive() {
  Serial.println("Received HTTP GET request to /receive");
  
  // Send CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  String response;
  serializeJson(receivedDataArray, response);
  
  Serial.print("Sending ");
  Serial.print(receivedDataArray.size());
  Serial.println(" stored messages to client");
  Serial.println("Response data: " + response);
  
  server.send(200, "application/json", response);
  
  // Clear the stored data after sending
  receivedDataArray.clear();
  Serial.println("Cleared received data storage after /receive request");
}

void handleBattery() {
  Serial.println("Received HTTP GET request to /battery");
  
  // Send CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  float voltage = readBatteryVoltage();
  int percentage = batteryPercentage(voltage);
  
  Serial.print("Battery voltage: ");
  Serial.print(voltage);
  Serial.print("V (");
  Serial.print(percentage);
  Serial.println("%)");
  
  // Create JSON response
  DynamicJsonDocument doc(128);
  doc["voltage"] = voltage;
  doc["percentage"] = percentage;
  
  String response;
  serializeJson(doc, response);
  
  Serial.println("Sending battery info: " + response);
  server.send(200, "application/json", response);
}

void handleStatus() {
  Serial.println("Received HTTP GET request to /status");
  
  // Send CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
  // Create JSON response
  DynamicJsonDocument doc(256);
  doc["status"] = deviceStatus ? "online" : "offline";
  doc["uptime"] = millis() / 1000; // Uptime in seconds
  doc["ap_ssid"] = ap_ssid;
  doc["connected_clients"] = WiFi.softAPgetStationNum();
  doc["ip"] = WiFi.softAPIP().toString();
  doc["stored_messages"] = receivedDataArray.size();
  doc["battery_voltage"] = readBatteryVoltage();
  
  String response;
  serializeJson(doc, response);
  
  Serial.println("Sending status info: " + response);
  server.send(200, "application/json", response);
}

// LoRa receiver function
void receiveLoRaData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incoming = "";
    
    // Read packet
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }
    
    Serial.println("\n----- LoRa Packet Received -----");
    Serial.print("RSSI: ");
    Serial.print(LoRa.packetRssi());
    Serial.print(" dBm, SNR: ");
    Serial.print(LoRa.packetSnr());
    Serial.println(" dB");
    Serial.print("Packet size: ");
    Serial.print(packetSize);
    Serial.println(" bytes");
    Serial.println("Raw data: " + incoming);
    
    // Validate JSON
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, incoming);
    
    if (!error) {
      // Add the received data to our array
      JsonObject obj = receivedDataArray.createNestedObject();
      
      // Copy all fields from received JSON to our storage
      for (JsonPair p : doc.as<JsonObject>()) {
        obj[p.key()] = p.value();
      }
      
      // Add receive timestamp and signal strength
      obj["_timestamp"] = millis() / 1000;
      obj["_rssi"] = LoRa.packetRssi();
      
      Serial.println("JSON parsing successful");
      Serial.print("Current storage size: ");
      Serial.print(receivedDataArray.size());
      Serial.println(" messages");
      
      // Print document contents
      Serial.println("Message contents:");
      for (JsonPair p : doc.as<JsonObject>()) {
        Serial.print("  ");
        Serial.print(p.key().c_str());
        Serial.print(": ");
        
        if (p.value().is<const char*>()) {
          Serial.println(p.value().as<const char*>());
        } else if (p.value().is<int>()) {
          Serial.println(p.value().as<int>());
        } else if (p.value().is<float>()) {
          Serial.println(p.value().as<float>());
        } else {
          Serial.println("[complex value]");
        }
      }
      
      // Blink LED to indicate data received
      digitalWrite(STATUS_LED, LOW);
      delay(100);
      digitalWrite(STATUS_LED, HIGH);
    } else {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
    }
    
    Serial.println("--------------------------------");
  }
}

// Read battery voltage
float readBatteryVoltage() {
  uint16_t adcValue = analogRead(BATTERY_PIN);
  float voltage = (adcValue / ADC_RESOLUTION) * ADC_REFERENCE_VOLTAGE * BATTERY_DIVIDER_RATIO;
  
  Serial.print("Battery ADC value: ");
  Serial.print(adcValue);
  Serial.print(" (");
  Serial.print((adcValue / ADC_RESOLUTION) * 100);
  Serial.print("%), Calculated voltage: ");
  Serial.print(voltage);
  Serial.println("V");
  
  return voltage;
}

// Convert voltage to approximate battery percentage
int batteryPercentage(float voltage) {
  // This is an approximation for Li-ion batteries (adjust as needed)
  if (voltage >= 4.2) return 100;
  if (voltage <= 3.0) return 0;
  
  // Linear interpolation between 3.0V (0%) and 4.2V (100%)
  int percentage = (voltage - 3.0) * 100 / 1.2;
  
  Serial.print("Battery percentage calculation: ");
  Serial.print(voltage);
  Serial.print("V = ");
  Serial.print(percentage);
  Serial.println("%");
  
  return percentage;
}

// Power button interrupt handler
void IRAM_ATTR handlePowerButton() {
  powerButtonPressed = true;
  lastDebounceTime = millis();
  // Note: Cannot use Serial.print in ISR as it's not safe
}

// Deep sleep function
void goToDeepSleep() {
  Serial.println("\n----- Entering Deep Sleep Mode -----");
  Serial.println("Power button pressed. Preparing for deep sleep...");
  
  // Turn off status LED
  digitalWrite(STATUS_LED, LOW);
  Serial.println("Status LED turned OFF");
  
  // Print current state before sleeping
  Serial.print("Stored messages: ");
  Serial.println(receivedDataArray.size());
  Serial.print("Device uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  
  // Wait a moment for messages to be sent
  Serial.println("Waiting for serial output to complete...");
  Serial.flush();
  delay(100);
  
  // Configure wake-up source (power button)
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_12, LOW); // Wake when POWER_BUTTON goes LOW
  Serial.println("Wake-up source configured: Power button (GPIO 12, active LOW)");
  
  // Go to deep sleep
  Serial.println("Entering deep sleep NOW! Press power button to wake up.");
  Serial.flush();
  delay(100);
  esp_deep_sleep_start();
}