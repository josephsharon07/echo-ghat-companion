"use client"
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const AccountScreen = () => {
  const router = useRouter();

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">Account</h2>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-300 mb-3 flex items-center justify-center">
            <User size={32} className="text-gray-500" />
          </div>
          <div className="h-5 bg-gray-400 rounded w-1/3 mb-2"></div>
          <Button onClick={() => router.push("/login")}>Login</Button>
          <div className="h-4 bg-gray-300 rounded w-2/3 mb-4"></div>
        </div>
        <div className="bg-gray-100 rounded-lg p-3 mb-3">
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="bg-gray-100 rounded-lg p-3">
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
};

export { AccountScreen };
