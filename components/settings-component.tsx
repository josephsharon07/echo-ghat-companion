"use client"
import { Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapacitorHttp } from '@capacitor/core';

// Vehicle type mapping
export const VehicleTypeMap = {
  car: 0,
  bike: 1,
  truck: 2,
  bus: 3,
} as const;

export type VehicleTypeNumber = typeof VehicleTypeMap[keyof typeof VehicleTypeMap];

interface StatusData {
  loraInitialized: boolean;
  wifiConnected: boolean;
  wifiStrength: number;
  ipAddress: string;
  battery: number;
}

const SettingsScreen = () => {
  const [vehicleId, setVehicleId] = useState(localStorage.getItem('vehicleId') || '');
  const [vehicleType, setVehicleType] = useState(localStorage.getItem('vehicleType') || '');
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || 'http://192.168.1.4');
  const [status, setStatus] = useState<StatusData | null>(null);

  const handleVehicleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVehicleId(value);
    localStorage.setItem('vehicleId', value);
  };

  const handleVehicleTypeChange = (value: string) => {
    setVehicleType(value);
    localStorage.setItem('vehicleType', value);
    localStorage.setItem('vehicleTypeNumber', VehicleTypeMap[value as keyof typeof VehicleTypeMap].toString());
  };

  const handleServerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setServerUrl(value);
    localStorage.setItem('serverUrl', value);
  };

  // Function to get WiFi signal strength label
  const getWifiStrengthLabel = (strength: number) => {
    if (strength >= -50) return 'Excellent';
    if (strength >= -60) return 'Good';
    if (strength >= -70) return 'Fair';
    return 'Poor';
  };

  // Function to calculate battery percentage for Li-ion battery
  const calculateBatteryPercentage = (voltage: number): number => {
    const maxVoltage = 4.2;  // Li-ion fully charged
    const minVoltage = 3.0;  // Li-ion fully discharged
    const percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.min(Math.max(0, Math.round(percentage)), 100); // Clamp between 0-100%
  };

  // Function to get battery status color
  const getBatteryStatusColor = (percentage: number): string => {
    if (percentage > 60) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Fetch status info
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const options = {
          url: `${serverUrl}/status`,
        };

        const response = await CapacitorHttp.get(options);

        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data;
        const formattedData: StatusData = {
          loraInitialized: data.status === 'online',
          wifiConnected: data.wifi_strength > -70,
          wifiStrength: data.wifi_strength,
          ipAddress: data.ip,
          battery: data.battery_voltage,
        };
        setStatus(formattedData);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up interval to fetch every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [serverUrl]);

  return (
    <div className="p-6 max-w-lg mx-auto text-center bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-left">Connection Settings</h3>
        <div className="mb-6">
          <Label htmlFor="serverUrl" className="block text-left font-medium mb-2">Server URL</Label>
          <Input
            id="serverUrl"
            type="text"
            value={serverUrl}
            onChange={handleServerUrlChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            placeholder="http://192.168.1.4"
          />
        </div>

        <h3 className="text-lg font-semibold mb-4 text-left">Vehicle Settings</h3>
        <div className="mb-6">
          <Label htmlFor="vehicleId" className="block text-left font-medium mb-2">Vehicle ID</Label>
          <Input
            id="vehicleId"
            type="text"
            value={vehicleId}
            onChange={handleVehicleIdChange}
            className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="mb-6">
          <Label htmlFor="vehicleType" className="block text-left font-medium mb-2">Vehicle Type</Label>
          <Select
            value={vehicleType}
            onValueChange={handleVehicleTypeChange}
          >
            <SelectTrigger className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Select a vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="car">Car (0)</SelectItem>
              <SelectItem value="bike">Bike (1)</SelectItem>
              <SelectItem value="truck">Truck (2)</SelectItem>
              <SelectItem value="bus">Bus (3)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-left">System Status</h3>
          <div className="grid grid-cols-2 gap-4">
            {status ? (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm text-gray-600">LoRa Status</Label>
                  <div className={`text-lg font-semibold mt-1 ${status.loraInitialized ? 'text-green-600' : 'text-red-600'}`}>
                    {status.loraInitialized ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm text-gray-600">WiFi Status</Label>
                  <div className={`text-lg font-semibold mt-1 ${status.wifiConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {status.wifiConnected ? `Connected (${getWifiStrengthLabel(status.wifiStrength)})` : 'Disconnected'}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm text-gray-600">IP Address</Label>
                  <div className="text-lg font-semibold mt-1">{status.ipAddress}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm text-gray-600">Battery</Label>
                  <div className={`text-lg font-semibold mt-1 ${getBatteryStatusColor(calculateBatteryPercentage(status.battery))}`}>
                    {status.battery.toFixed(2)}V ({calculateBatteryPercentage(status.battery)}%)
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-gray-500">Loading status...</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-left">Server Information</h3>
          <div className="text-left text-sm text-gray-600">
            <p>Server URL: {serverUrl}</p>
            <p className="mt-2">Endpoints:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>Send Data: /send</li>
              <li>Receive Data: /receive</li>
              <li>Status: /status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SettingsScreen };