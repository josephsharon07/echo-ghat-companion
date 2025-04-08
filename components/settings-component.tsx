"use client"
import { Map } from 'lucide-react';
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';

const SettingsScreen = () => {
  const [vehicleId, setVehicleId] = useState(localStorage.getItem('vehicleId') || '');
  const [vehicleType, setVehicleType] = useState(localStorage.getItem('vehicleType') || '');
  const [serviceId, setServiceId] = useState(localStorage.getItem('serviceId') || '');
  const [readId, setReadId] = useState(localStorage.getItem('readId') || '');
  const [writeId, setWriteId] = useState(localStorage.getItem('writeId') || '');
  const [bleDeviceId, setBleDeviceId] = useState(localStorage.getItem('bleDeviceId') || '');

  const handleVehicleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVehicleId(value);
    localStorage.setItem('vehicleId', value);
  };

  const handleVehicleTypeChange = (value: string) => {
    setVehicleType(value);
    localStorage.setItem('vehicleType', value);
  };

  const handleServiceIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setServiceId(value);
    localStorage.setItem('serviceId', value);
  };

  const handleReadIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setReadId(value);
    localStorage.setItem('readId', value);
  };

  const handleWriteIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWriteId(value);
    localStorage.setItem('writeId', value);
  };

  const handleSearchAndConnect = async () => {
    try {
      await BleClient.initialize();
      const device: BleDevice = await BleClient.requestDevice({
        services: [], // Specify required BLE services here
      });
      BleClient.connect(device.deviceId);
      setBleDeviceId(device.deviceId);
      localStorage.setItem('bleDeviceId', device.deviceId);
      alert(`Connected to BLE device: ${device.name || 'Unknown Device'}`);
    } catch (error) {
      console.error('Error connecting to BLE device:', error);
      alert('Failed to connect to BLE device.');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto text-center bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
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
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="bike">Bike</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-left">BLE Settings</h3>
          <div className="mb-6">
            <Label htmlFor="serviceId" className="block text-left font-medium mb-2">Service ID</Label>
            <Input
              id="serviceId"
              type="text"
              value={serviceId}
              onChange={handleServiceIdChange}
              className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-6">
            <Label htmlFor="readId" className="block text-left font-medium mb-2">Read ID</Label>
            <Input
              id="readId"
              type="text"
              value={readId}
              onChange={handleReadIdChange}
              className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-6">
            <Label htmlFor="writeId" className="block text-left font-medium mb-2">Write ID</Label>
            <Input
              id="writeId"
              type="text"
              value={writeId}
              onChange={handleWriteIdChange}
              className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-left">BLE Device Connection</h3>
          <div className="mb-6">
            <button
              onClick={handleSearchAndConnect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Search and Connect to BLE Device
            </button>
          </div>
          {bleDeviceId && (
            <div className="text-left">
              <p className="text-sm text-gray-600">Connected Device ID: {bleDeviceId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SettingsScreen };