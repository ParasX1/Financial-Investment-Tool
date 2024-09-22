"use client";

import {createClient} from "@supabase/supabase-js";

// @ts-ignore
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_ANON);
export default supabase;