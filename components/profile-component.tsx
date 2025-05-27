"use client"
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  phone_number: string;
  first_name: string;
  email?: string;
}

const AccountScreen = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        if (!user) {
          setLoading(false);
          return; // Not logged in
        }
        
        // Get the profile data
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        // Combine user email with profile data
        setProfile({
          ...data,
          email: user.email
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Account</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-center">
              <Skeleton className="w-20 h-20 rounded-full" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-10 w-1/2 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">Account</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={32} className="text-gray-500" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-500">You need to log in to view your profile</p>
            <Button onClick={() => router.push("/login")} className="mx-auto">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto text-center">
      <h2 className="text-2xl font-bold mb-6">Account</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-center">
            <Avatar className="w-20 h-20">
              <div className="bg-primary text-white w-full h-full rounded-full flex items-center justify-center text-2xl font-bold">
                {profile.first_name[0]?.toUpperCase()}
              </div>
            </Avatar>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="text-left">
              <Label className="text-sm text-gray-500">Name</Label>
              <p className="font-semibold">{profile.first_name}</p>
            </div>
            
            <div className="text-left">
              <Label className="text-sm text-gray-500">Email</Label>
              <p className="font-semibold">{profile.email}</p>
            </div>
            
            <div className="text-left">
              <Label className="text-sm text-gray-500">Phone Number</Label>
              <p className="font-semibold">{profile.phone_number}</p>
            </div>
          </div>
          
          <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
            Sign Out
          </Button>
          
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export { AccountScreen };
