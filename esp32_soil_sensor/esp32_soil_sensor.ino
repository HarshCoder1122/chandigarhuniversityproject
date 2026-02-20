/*
 * ESP32 SoilProbe IoT Sensor - Hardini Cloud Connected
 * WITH BLE PROVISIONING - RS485 MODBUS RTU - DIRECT FIREBASE
 */

#include <WiFi.h>
#include "time.h"

// NTP Server Settings
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // IST is UTC+5:30 (5.5 * 3600 = 19800)
const int   daylightOffset_sec = 0;
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>

// Provide the token generation process info.
#include <addons/TokenHelper.h>
// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>

// ==========================================
// 🔧 CONSTANTS & PIN DEFS
// ==========================================
#define DHT_PIN 14 // Updated to D14 as per user wiring
#define DHT_TYPE DHT11

// RS485 Pins
#define RX_PIN 16
#define TX_PIN 17
#define RE_DE_PIN 4 // Updated to D4 as per user wiring

#define EEPROM_SIZE 512

// Firebase Config
#define API_KEY "REMOVED_SECRET"
#define DATABASE_URL "https://hardini-3e576-default-rtdb.asia-southeast1.firebasedatabase.app"

// Firebase Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool signupOK = false;

// ==========================================
// 🧪 SENSOR VARIABLES
// ==========================================
struct SoilData {
  float moisture;
  float temp;
  float ec;
  float ph;
  int nitrogen;
  int phosphorus;
  int potassium;
  bool valid;
};

SoilData lastReading;
const byte soilSensorRequest[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x04, 0x08};

// BLE UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_SSID_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_PASS_UUID      "823d06dc-255a-4720-953e-51c367ee2733"
#define CHAR_UID_UUID       "c730e61d-847e-4009-9768-45b73679469e"
#define CHAR_STATUS_UUID    "91107567-2777-4581-9b5b-209074092453"

DHT dht(DHT_PIN, DHT_TYPE);

// Runtime Variables
String wifi_ssid = "";
String wifi_pass = "";
String user_uid = "";

String device_id = "esp32_" + String((uint32_t)ESP.getEfuseMac(), HEX);

bool deviceConnected = false;
bool wifiConfigured = false;

// ==========================================
// 💾 EEPROM HELPERS
// ==========================================

void writeString(int addr, String data) {
  for (int i = 0; i < data.length(); i++) {
    EEPROM.write(addr + i, data[i]);
  }
  EEPROM.write(addr + data.length(), '\0');
}

String readString(int addr) {
  char data[100];
  int len = 0;
  unsigned char k = EEPROM.read(addr);

  while (k != '\0' && len < 99) {
    data[len++] = k;
    k = EEPROM.read(addr + len);
  }

  data[len] = '\0';
  return String(data);
}

void loadCredentials() {
  wifi_ssid = readString(0);
  wifi_pass = readString(100);
  user_uid = readString(200);

  Serial.println("Loaded Credentials:");
  Serial.println("SSID: " + wifi_ssid);
  Serial.println("UID: " + user_uid);

  if (wifi_ssid.length() > 0 && user_uid.length() > 0) {
    wifiConfigured = true;
  }
}

void saveCredentials() {
  Serial.println("Saving Credentials...");
  for (int i = 0; i < EEPROM_SIZE; i++) EEPROM.write(i, 0);
  writeString(0, wifi_ssid);
  writeString(100, wifi_pass);
  writeString(200, user_uid);
  EEPROM.commit();
}

// ==========================================
// 📡 BLE CALLBACKS
// ==========================================
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("BLE Client Connected");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("BLE Client Disconnected");
    pServer->getAdvertising()->start();
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue();
    if (value.length() == 0) return;
    String uuid = pCharacteristic->getUUID().toString();

    if (uuid == CHAR_SSID_UUID) {
      wifi_ssid = value;
      Serial.println("RCV SSID: " + wifi_ssid);
    } else if (uuid == CHAR_PASS_UUID) {
      wifi_pass = value;
      Serial.println("RCV PASS: [Hidden]");
    } else if (uuid == CHAR_UID_UUID) {
      user_uid = value;
      Serial.println("RCV UID: " + user_uid);
      if (wifi_ssid.length() > 0) {
        saveCredentials();
        Serial.println("Restarting in 2s...");
        delay(2000);
        ESP.restart();
      }
    }
  }
};

// ==========================================
// 📡 BLE START
// ==========================================
void startBLE() {
  Serial.println("Starting BLE Provisioning Mode...");
  BLEDevice::init("Hardini-Probe");
  BLEDevice::setPower(ESP_PWR_LVL_P9);
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pCharSSID = pService->createCharacteristic(CHAR_SSID_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  BLECharacteristic *pCharPass = pService->createCharacteristic(CHAR_PASS_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  BLECharacteristic *pCharUID = pService->createCharacteristic(CHAR_UID_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  BLECharacteristic *pCharStatus = pService->createCharacteristic(CHAR_STATUS_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  MyCallbacks *callbacks = new MyCallbacks();
  pCharSSID->setCallbacks(callbacks);
  pCharPass->setCallbacks(callbacks);
  pCharUID->setCallbacks(callbacks);
  pCharStatus->setValue("Waiting for Config");

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("BLE Advertising started...");
}

// ==========================================
// 🔄 RS485 HELPER
// ==========================================
SoilData readSoilSensor() {
  SoilData data = {0, 0, 0, 0, 0, 0, 0, false};

  // Clear buffer
  while (Serial2.available()) Serial2.read();

  Serial.println(" -> Sending Modbus Request (4800 baud)...");
  digitalWrite(RE_DE_PIN, HIGH); // Enable TX
  delay(10);
  Serial2.write(soilSensorRequest, sizeof(soilSensorRequest));
  Serial2.flush();
  digitalWrite(RE_DE_PIN, LOW); // Enable RX

  // Wait for response
  unsigned long startTime = millis();
  while (Serial2.available() < 19 && millis() - startTime < 3000) {
    delay(10);
  }

  int available = Serial2.available();
  Serial.printf(" -> Bytes Available: %d\n", available);

  if (available > 0) {
    byte buf[32]; // Buffer slightly larger
    int len = Serial2.readBytes(buf, available < 32 ? available : 32);

    Serial.print(" -> HEX RCV: ");
    for (int i = 0; i < len; i++) {
        Serial.printf("%02X ", buf[i]);
    }
    Serial.println();

    if (len >= 19 && buf[0] == 0x01 && buf[1] == 0x03) {
      data.moisture = (buf[3] << 8 | buf[4]) * 0.1;
      data.temp = (buf[5] << 8 | buf[6]) * 0.1;
      data.ec = (buf[7] << 8 | buf[8]);
      data.ph = (buf[9] << 8 | buf[10]) * 0.1;
      data.nitrogen = (buf[11] << 8 | buf[12]);
      data.phosphorus = (buf[13] << 8 | buf[14]);
      data.potassium = (buf[15] << 8 | buf[16]);
      data.valid = true;
      Serial.println(" -> ✅ Modbus Frame Valid");
    } else {
      Serial.println("❌ Modbus Invalid Header/Length");
    }
  } else {
    Serial.println("❌ Modbus Timeout (No Data)");
  }
  return data;
}

// Helper to get ISO time string
String getISOTime() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    return "";
  }
  char buffer[30];
  // Format: 2026-02-19T13:00:00Z (Approx)
  strftime(buffer, 30, "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer);
}

// ==========================================
// 📊 SENSOR + API
// ==========================================
void sendSensorData() {
  Serial.println("\n--------------------------------");
  Serial.println("Reading Sensors...");

  // Read RS485 Sensor
  SoilData soil = readSoilSensor();
  
  // Read DHT (Ambient)
  float ambHum = dht.readHumidity();
  float ambTemp = dht.readTemperature();

  Serial.printf("Soil: moist=%.1f%% temp=%.1fC ph=%.1f N=%d P=%d K=%d\n", 
                soil.moisture, soil.temp, soil.ph, soil.nitrogen, soil.phosphorus, soil.potassium);
  Serial.printf("Amb: temp=%.1fC hum=%.1f%%\n", ambTemp, ambHum);

  if (!soil.valid) {
    Serial.println("⚠️ Warning: Using dummy soil values (read failed)");
  }
  
  // Firebase Data Object
  FirebaseJson json;
  
  // Note: Firebase paths cannot contain ".", "#", "$", "[", or "]"
  // We use timestamps as keys usually, but pushJSON handles distinct keys
  
  json.set("soil_temp_c", soil.valid ? soil.temp : 0);
  json.set("soil_moist_pct", soil.valid ? soil.moisture : 0);
  json.set("soil_ec_us_cm", soil.valid ? soil.ec : 0);
  json.set("soil_ph", soil.valid ? soil.ph : 0);
  json.set("soil_n_mg_kg", soil.valid ? soil.nitrogen : 0);
  json.set("soil_p_mg_kg", soil.valid ? soil.phosphorus : 0);
  json.set("soil_k_mg_kg", soil.valid ? soil.potassium : 0);
  json.set("ambient_temp_c", isnan(ambTemp) ? 0 : ambTemp);
  json.set("ambient_humidity_pct", isnan(ambHum) ? 0 : ambHum);
  json.set("rssi", WiFi.RSSI());
  
  // Use Real Time (NTP)
  String timestamp = getISOTime();
  if (timestamp == "") {
      json.set("created_at", millis()); // Fallback if NTP fails
  } else {
      json.set("created_at", timestamp);
  }

  if (WiFi.status() == WL_CONNECTED && signupOK) {
    String path = "users/" + user_uid + "/devices/" + device_id + "/data";
    
    Serial.print("Pushing to: "); Serial.println(path);
    
    if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("✅ Firebase: Data Sent");
    } else {
      Serial.printf("❌ Firebase Error: %s\n", fbdo.errorReason().c_str());
    }
  } else {
    Serial.println("⚠️ WiFi Disconnected or Firebase Not Ready");
  }
}

// ==========================================
// 🚀 SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  
  // RS485 Setup
  pinMode(RE_DE_PIN, OUTPUT);
  digitalWrite(RE_DE_PIN, LOW);
  Serial2.begin(4800, SERIAL_8N1, RX_PIN, TX_PIN); // 4800 Baud

  EEPROM.begin(EEPROM_SIZE);
  dht.begin();
  
  delay(1000);
  Serial.println("Booting Hardini Probe: " + device_id);
  
  startBLE();
  loadCredentials();

  if (wifiConfigured) {
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
    Serial.print("Connecting to WiFi");
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
      delay(500); Serial.print("."); retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi Connected!");
      
      // Init Time (NTP)
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("Waiting for NTP time sync...");
      struct tm timeinfo;
      if(!getLocalTime(&timeinfo)){
        Serial.println("Failed to obtain time");
      } else {
        Serial.println(&timeinfo, "Time Sync: %A, %B %d %Y %H:%M:%S");
      }
      
      // Initialize Firebase
      config.api_key = API_KEY;
      config.database_url = DATABASE_URL;
      
      // Anonymous Sign up
      if (Firebase.signUp(&config, &auth, "", "")) {
        Serial.println("✅ Firebase Signed Up (Anonymous)");
        signupOK = true;
      } else {
        Serial.printf("❌ Firebase Sign Up Failed: %s\n", config.signer.signupError.message.c_str());
      }
      
      config.token_status_callback = tokenStatusCallback; // Helper function from addons
      
      Firebase.begin(&config, &auth);
      Firebase.reconnectWiFi(true);

      sendSensorData();
    } else {
      Serial.println("\n⚠️ WiFi Failed");
    }
  }
}

// ==========================================
// 🔁 LOOP
// ==========================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(100); return;
  }

  static unsigned long lastTime = 0;
  if (millis() - lastTime > 30000) {
    sendSensorData();
    lastTime = millis();
  }
}