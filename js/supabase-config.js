// Remplacer ces valeurs par celles de votre projet Supabase
// (Project Settings > API)
const SUPABASE_URL = 'https://jabdiekkjdayrfsinwct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphYmRpZWtramRheXJmc2lud2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTYzMjQsImV4cCI6MjA5Mjk3MjMyNH0.FTeIHabu9gIoAMQ4JzKjmjJR1s1t1QIPOz2X8BdPTuM';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
