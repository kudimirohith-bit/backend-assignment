require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

let supabaseUrl = process.env.SUPABASE_URL || "";
if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.replace("/rest/v1/", "");
} else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.replace("/rest/v1", "");
}

const supabaseKey = process.env.SUPABASE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
