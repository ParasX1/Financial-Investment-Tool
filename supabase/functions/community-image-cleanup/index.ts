import { createClient } from '@supabase/supabase-js';
import { handleCleanup } from './cleanup.mjs';

// The service-only RPC validates the custom Bearer token; deploy with verify_jwt=false.
Deno.serve((request: Request) => handleCleanup(request, {
  env: {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  },
  createClient,
}));
