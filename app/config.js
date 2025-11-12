// Configuration file - Automatically detects IP in Expo
// No manual configuration needed!

import Constants from 'expo-constants';

// Get the host IP from Expo's manifest (works in tunnel, LAN, and localhost modes)
const getHostIP = () => {
  // In Expo, Constants.expoConfig.hostUri contains the dev server address
  // Format: "192.168.0.123:8081" or similar
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    // Extract just the IP part (remove port)
    const host = hostUri.split(':')[0];
    console.log('🌐 Auto-detected host IP:', host);
    return host;
  }
  
  // Fallback for production or if detection fails
  console.warn('⚠️ Could not auto-detect IP, using localhost');
  return 'localhost';
};

const HOST_IP = getHostIP();

export const API_CONFIG = {
  // Automatically detected IP
  HOST_IP: HOST_IP,
  
  // PostgREST API (database)
  POSTGREST_URL: `http://${HOST_IP}:3000`,
  
  // Event Producer API (Kafka)
  EVENT_PRODUCER_URL: `http://${HOST_IP}:3001`,
};

console.log('📡 API Configuration:', API_CONFIG);

