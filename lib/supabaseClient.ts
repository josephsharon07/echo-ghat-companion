import { createClient } from '@supabase/supabase-js'

const anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcm5udnhwY3JyYm54aGl2dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0ODU0NDcsImV4cCI6MjA1NzA2MTQ0N30.AwWyTrYgBj7kN4yAj7yHY5QUUVeZuZJPkj1PuA4I4zc'
const supabase_url = 'https://dornnvxpcrrbnxhivusv.supabase.co'

export const supabase = createClient(supabase_url, anon_key)

