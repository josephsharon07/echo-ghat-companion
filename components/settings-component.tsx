"use client"
import { Map, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapacitorHttp } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

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

interface VehicleSettings {
  user_id: string;
  vehicle_id: string;
  vehicle_type: string;
  created_at?: string;
  updated_at?: string;
}

const SettingsScreen = () => {
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || '192.168.4.1');
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user settings from Supabase
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        setLoading(true);
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        if (!user) {
          setLoading(false);
          return; // Not logged in
        }
        
        setUserId(user.id);
        
        // Get the vehicle settings
        const { data, error: settingsError } = await supabase
          .from('vehicle_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw settingsError;
        }
        
        if (data) {
          setVehicleId(data.vehicle_id);
          setVehicleType(data.vehicle_type);
          
          // Also update localStorage for compatibility with existing code
          localStorage.setItem('vehicleId', data.vehicle_id);
          localStorage.setItem('vehicleType', data.vehicle_type);
          localStorage.setItem('vehicleTypeNumber', VehicleTypeMap[data.vehicle_type as keyof typeof VehicleTypeMap].toString());
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSettings();
  }, []);

  const saveSettings = async () => {
    if (!userId) {
      toast.error('You must be logged in to save settings');
      return;
    }
    
    try {
      setSaving(true);
      
      const settings: VehicleSettings = {
        user_id: userId,
        vehicle_id: vehicleId,
        vehicle_type: vehicleType,
      };
      
      // Upsert vehicle settings (insert if not exists, update if exists)
      const { error } = await supabase
        .from('vehicle_settings')
        .upsert(settings)
        .select();
        
      if (error) throw error;
      
      // Update localStorage for compatibility with existing code
      localStorage.setItem('vehicleId', vehicleId);
      localStorage.setItem('vehicleType', vehicleType);
      localStorage.setItem('vehicleTypeNumber', VehicleTypeMap[vehicleType as keyof typeof VehicleTypeMap]?.toString() || '0');
      
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVehicleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVehicleId(value);
  };

  const handleVehicleTypeChange = (value: string) => {
    setVehicleType(value);
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
          url: `http://${serverUrl}/status`,
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

  if (loading) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Settings</h2>
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Settings</h2>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Vehicle Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vehicleId" className="block text-left font-medium mb-2">Vehicle ID</Label>
            <Input
              id="vehicleId"
              type="text"
              value={vehicleId}
              onChange={handleVehicleIdChange}
              className="w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="vehicleType" className="block text-left font-medium mb-2">Vehicle Type</Label>
            <Select
              value={vehicleType}
              onValueChange={handleVehicleTypeChange}
            >
              <SelectTrigger className="w-full">
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
          
          <Button 
            className="w-full mt-4" 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced-settings">
          <AccordionTrigger className="px-4 py-2 bg-gray-50 rounded-t-lg font-medium">
            Advanced Settings
          </AccordionTrigger>
          <AccordionContent className="bg-gray-50 p-4 rounded-b-lg">
            <div className="mb-4">
              <Label htmlFor="serverUrl" className="block text-left font-medium mb-2">Device IP Address</Label>
              <Input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={handleServerUrlChange}
                className="w-full"
                placeholder="192.168.4.1"
              />
            </div>
            
            <div className="mt-4 text-left text-sm text-gray-600">
              <p>Server URL: {serverUrl}</p>
              <p className="mt-2">Endpoints:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Send Data: /send</li>
                <li>Receive Data: /receive</li>
                <li>Status: /status</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export { SettingsScreen };