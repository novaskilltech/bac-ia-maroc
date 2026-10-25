// Configuration du client Supabase pour le projet BAC IA MAROC
const SUPABASE_URL = 'https://mdtjkjoiuuwktmxcuysn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdGpram9pdXV3a3RteGN1eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDI5NzQsImV4cCI6MjEwODM3ODk3NH0.Ib5Zfwik2FK7UarLVlRPjd_C9wrqL_6_xbSmF1rRzCI';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
