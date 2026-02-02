# Live Map Tracking Implementation

## Overview
The driver app now includes real-time GPS tracking that shows the driver's location on a live map during active trips.

## Features

### Mobile App (Driver Side)
- **Real-time Location Tracking**: Automatically tracks driver's GPS location every 10 seconds or when they move 50+ meters
- **Interactive Map**: Shows pickup location, delivery location, and driver's current position
- **Route Visualization**: Displays a dashed line from driver to delivery destination
- **Auto-centering**: Map automatically adjusts to show all relevant points
- **Permission Handling**: Requests and manages location permissions gracefully
- **Background Updates**: Sends location to backend for tracking by shippers/admins

### Backend API

#### Update Driver Location
```
PATCH /api/drivers/location
```
**Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "bookingId": "booking-uuid"
}
```

**Features:**
- Updates driver's current location in real-time
- Stores location history for trip replay
- Only accessible by authenticated drivers

#### Get Driver Location
```
GET /api/drivers/:driverId/location
```

**Response:**
```json
{
  "success": true,
  "data": {
    "driver": {
      "id": "driver-uuid",
      "name": "John Doe",
      "status": "on-job"
    },
    "currentLocation": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "updatedAt": "2024-01-28T19:20:00Z"
    },
    "locationHistory": [
      {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "recorded_at": "2024-01-28T19:20:00Z"
      }
    ]
  }
}
```

## Database Schema

### Drivers Table (Updated)
```sql
- current_latitude: DECIMAL(10, 8) - Current latitude
- current_longitude: DECIMAL(11, 8) - Current longitude  
- location_updated_at: TIMESTAMP - Last update time
```

### Bookings Table (Updated)
```sql
- pickup_latitude: DECIMAL(10, 8)
- pickup_longitude: DECIMAL(11, 8)
- delivery_latitude: DECIMAL(10, 8)
- delivery_longitude: DECIMAL(11, 8)
```

### New Table: driver_location_history
```sql
CREATE TABLE driver_location_history (
    id VARCHAR(36) PRIMARY KEY,
    driver_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

## Setup Instructions

### 1. Run Database Migration
```bash
cd backend
mysql -u root -p highnheavy < migrations/add_location_tracking.sql
```

### 2. Install Mobile Dependencies
Already installed:
- `react-native-maps` - For map display
- `expo-location` - For GPS tracking

### 3. Configure Permissions

**For iOS (ios/Info.plist):**
Add location permission descriptions:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track your delivery route</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to track your delivery route even when the app is in background</string>
```

**For Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 4. Google Maps API Key (Optional)
For production, add Google Maps API key to `app.json`:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_IOS_API_KEY"
      }
    }
  }
}
```

## How It Works

1. **Driver Opens Active Trip Screen**
   - App requests location permissions
   - Gets initial GPS position
   - Displays map with pickup/delivery markers

2. **Location Updates**
   - Every 10 seconds OR when driver moves 50+ meters
   - Updated location sent to backend via PATCH /api/drivers/location
   - Map updates to show new position
   - Backend stores in both `drivers` table and `driver_location_history`

3. **Shipper/Admin Tracking** (Future)
   - Can fetch driver location via GET /api/drivers/:driverId/location
   - Shows real-time position and movement history
   - Can display route replay from history data

## Performance Considerations

- **Update Frequency**: 10 seconds minimum to balance accuracy and battery life
- **Distance Threshold**: 50 meters to avoid excessive updates when stationary
- **History Limit**: Last 50 location points stored per query
- **Cleanup**: Location subscription properly cleaned up when screen unmounts

## Privacy & Security

- Location only tracked during active trips
- Only drivers can update their own location
- Shippers/admins can only view location of their assigned drivers
- Location history helps with dispute resolution
- All location data transmitted over HTTPS

## Future Enhancements

- [ ] Geofencing for pickup/delivery zones
- [ ] ETA calculation based on real-time traffic
- [ ] Push notifications when driver is nearby
- [ ] Route optimization suggestions
- [ ] Offline mode with location queue
- [ ] Background location tracking
- [ ] Battery optimization modes
