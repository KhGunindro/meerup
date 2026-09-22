from app.db.supabase import supabase

print("URL:", supabase.supabase_url)

key = supabase.supabase_key

print("Key prefix:", key[:15])
print("Key length:", len(key))