from app.db.supabase import supabase
from app.tourism.service import TourismService


print("=== 1. DIRECT TABLE TEST ===")

table_response = (
    supabase
    .table("destinations")
    .select("id,name,latitude,longitude,verified")
    .execute()
)

print("Rows:", len(table_response.data or []))
print(table_response.data)


print("\n=== 2. DIRECT RPC TEST ===")

rpc_response = supabase.rpc(
    "nearby_destinations",
    {
        "user_lat": 24.8170,
        "user_lon": 93.9368,
        "radius_km": 20.0,
    },
).execute()

print("RPC rows:", len(rpc_response.data or []))
print(rpc_response.data)


print("\n=== 3. TOURISM SERVICE TEST ===")

service = TourismService()

results = service.nearby_destinations(
    latitude=24.8170,
    longitude=93.9368,
    radius_km=20.0,
)

print("Service rows:", len(results))
print(results)