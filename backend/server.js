import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabaseCliente = createClient(
  'https://ntgscmhtcrpkayrxseec.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Z3NjbWh0Y3Jwa2F5cnhzZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDg3OTYsImV4cCI6MjA4NzYyNDc5Nn0.xk6yE12CUh9UoZGKMy9iZmVnCE_vI1eudrSRXClXKkw'
);
