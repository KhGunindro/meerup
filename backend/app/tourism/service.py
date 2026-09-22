from typing import Any

from app.db.supabase import supabase


class TourismService:

    def nearby_destinations(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 20.0,
    ) -> list[dict[str, Any]]:

        params = {
            "user_lat": latitude,
            "user_lon": longitude,
            "radius_km": radius_km,
        }

        print("RPC parameters:", params)

        response = supabase.rpc(
            "nearby_destinations",
            params,
        ).execute()

        print("RPC response:", response.data)

        return response.data or []