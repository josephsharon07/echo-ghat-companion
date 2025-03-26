"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Map, User, Settings } from 'lucide-react';
import { AccountScreen } from '@/components/profile-component';
import { SettingsScreen } from '@/components/settings-component';
import dynamic from 'next/dynamic';

const VehicleTrackingMap = dynamic(() => import('@/components/map-component'), {
  ssr: false,
});

const TabNav = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Ensure code only runs in the browser
    if (typeof window !== "undefined") {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login'); // Redirect if not authenticated
        } else {
          setIsAuthenticated(true);
        }
        setLoading(false);
      };

      checkAuth();
    }
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Prevents UI flickering before redirect
  }

  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'account', label: 'Account', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Render the appropriate component based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return <VehicleTrackingMap />;
      case 'account':
        return <AccountScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <VehicleTrackingMap />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Content area */}
      <div className="flex-1 bg-gray-50 overflow-auto pb-16">
        {renderContent()}
      </div>
      
      {/* Bottom navigation */}
      <div className="bg-white border-t border-gray-200 fixed bottom-0 inset-x-0 z-10">
        <div className="flex justify-between">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                className={`flex flex-col items-center justify-center flex-1 py-3 px-2 focus:outline-none ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={22} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : 'font-normal'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabNav;
