# 🌱 ESP32 SoilProbe IoT Setup Guide

This guide will walk you through connecting an ESP32 microcontroller to your Hardini SoilProbe IoT system.

## 📋 Prerequisites

### Hardware Required:
- **ESP32 Development Board** (ESP32-WROOM-32 recommended)
- **DHT11 Temperature & Humidity Sensor**
- **Soil Moisture Sensor** (capacitive type recommended)
- **Jumper wires** and **breadboard**
- **USB cable** for programming

### Software Required:
- **Arduino IDE** (version 1.8.19 or later)
- **Backend Server** running (from this project)

## 🗄️ Step 1: Database Setup

### Create Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create soil_readings table
CREATE TABLE IF NOT EXISTS soil_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    soil_temp_c DECIMAL(5,2),
    soil_moist_pct DECIMAL(5,2),
    ambient_temp_c DECIMAL(5,2),
    ambient_humidity_pct DECIMAL(5,2),
    rssi INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_soil_readings_device_id ON soil_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_soil_readings_created_at ON soil_readings(created_at DESC);

-- Enable Row Level Security (optional, for production)
ALTER TABLE soil_readings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on soil_readings" ON soil_readings
    FOR ALL USING (true);
```

## 🖥️ Step 2: Backend Server Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create/update `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

### 3. Start Backend Server
```bash
cd backend
npm start
```

Server will run on `http://localhost:3001` (or your configured port).

### 4. Test API Endpoint
```bash
curl -X GET http://localhost:3001/api/health
```

## 🔧 Step 3: ESP32 Hardware Setup

### Sensor Connections:

#### DHT11 Temperature & Humidity Sensor:
```
DHT11    →    ESP32
VCC      →    3.3V or 5V
GND      →    GND
DATA     →    GPIO 4
```

#### Soil Moisture Sensor:
```
Soil Sensor    →    ESP32
VCC            →    3.3V or 5V
GND            →    GND
AOUT           →    GPIO 34 (Analog)
```

## 💻 Step 4: ESP32 Software Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support
1. Open Arduino IDE
2. Go to **File > Preferences**
3. Add this URL to "Additional Boards Manager URLs":
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to **Tools > Board > Boards Manager**
5. Search for "ESP32" and install "esp32" by Espressif Systems

### 3. Install Required Libraries
1. Go to **Tools > Manage Libraries**
2. Install these libraries:
   - **"DHT sensor library"** by Adafruit
   - **"ArduinoJson"** by Benoit Blanchon

### 4. Configure ESP32 Code
1. Open `esp32_soil_sensor.ino` in Arduino IDE
2. Update the configuration section:

```cpp
// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* API_BASE_URL = "http://YOUR_BACKEND_IP:3001";

// Device Configuration
const char* DEVICE_ID = "soilprobe1"; // Change for multiple sensors
```

### 5. Upload Code to ESP32
1. Select your ESP32 board: **Tools > Board > ESP32 Dev Module**
2. Select the correct port: **Tools > Port**
3. Click **Upload** button (→)
4. Wait for upload to complete

### 6. Monitor Serial Output
1. Open **Tools > Serial Monitor**
2. Set baud rate to **115200**
3. Watch for connection logs and sensor readings

## 🧪 Step 5: Testing & Verification

### 1. Check ESP32 Serial Output
You should see:
```
🌱 ESP32 SoilProbe IoT Sensor Starting...
🔗 Connecting to WiFi: YOUR_WIFI_NAME
✅ WiFi connected!
📡 IP Address: 192.168.1.100
📶 Signal Strength (RSSI): -45 dBm

🌱 Taking sensor readings...
📊 Sensor Readings:
  🌡️  Soil Temperature: 23.5°C
  💧  Soil Moisture: 41.2%
  🌤️  Ambient Temperature: 25.5°C
  💨  Ambient Humidity: 58.3%
  📶  WiFi RSSI: -45 dBm
📤 Sending data to: http://192.168.1.200:3001/api/soil-readings
✅ API Response Code: 201
🎉 Data sent successfully!
```

### 2. Check Backend Server Logs
You should see:
```
Received soil sensor data: {
  "device_id": "soilprobe1",
  "soil_temp_c": 23.5,
  "soil_moist_pct": 41.2,
  "ambient_temp_c": 25.5,
  "ambient_humidity_pct": 58.3,
  "rssi": -45
}
Soil reading saved successfully: [UUID]
```

### 3. Verify Database Data
Check your Supabase dashboard:
- Go to **Table Editor > soil_readings**
- You should see new records appearing every 30 seconds

### 4. Test SoilProbe Dashboard
1. Open `soil-probe.html` in your browser
2. Select "field1" from the dropdown
3. You should see real-time data updating
4. Charts should populate with historical data

## 🔧 Troubleshooting

### ESP32 Not Connecting to WiFi:
- Check WiFi credentials
- Ensure ESP32 is within WiFi range
- Try different WiFi channel/frequency

### Sensors Not Reading:
- Verify sensor connections
- Check sensor power supply (3.3V vs 5V)
- Test sensors individually

### API Connection Failed:
- Verify backend server is running
- Check API_BASE_URL configuration
- Ensure ESP32 and server are on same network
- Check firewall settings

### Data Not Appearing in Dashboard:
- Verify device_id matches between ESP32 and dashboard
- Check browser console for errors
- Ensure Supabase connection is working

## 📊 Understanding the Data Flow

```
ESP32 Sensor → WiFi → Backend API → Supabase Database → Dashboard
     ↓             ↓         ↓             ↓              ↓
  Read Sensors → HTTP POST → /api/soil-readings → soil_readings → Real-time Updates
```

## 🚀 Advanced Configuration

### Multiple Sensors
For multiple ESP32 devices:
1. Change `DEVICE_ID` in each ESP32 code
2. Update dashboard field selector with new device IDs
3. Each sensor will have its own data stream

### Custom Sensor Pins
Modify these lines in the ESP32 code:
```cpp
#define DHT_PIN 4          // DHT11 data pin
#define SOIL_MOISTURE_PIN 34 // Soil moisture analog pin
```

### Reading Frequency
Change the interval between readings:
```cpp
const unsigned long READING_INTERVAL = 30000; // 30 seconds
```

### Adding More Sensors
To add more sensor types:
1. Include additional sensor libraries
2. Add sensor reading code in `takeSensorReading()`
3. Update JSON payload in `sendDataToAPI()`
4. Update database schema and API endpoints

## 🔒 Security Considerations

For production deployment:
- Use HTTPS instead of HTTP
- Implement API authentication
- Use environment variables for sensitive data
- Consider using Supabase service role key for server-side operations
- Implement rate limiting and input validation

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all hardware connections
3. Check Arduino IDE and library versions
4. Review serial monitor output for error messages
5. Check backend server logs for API errors

Happy farming! 🌾🚜
