import subprocess
import os

arch_dot = """digraph MeerupArchitecture {
    graph [
        label="MEERUP -- SYSTEM ARCHITECTURE & CODEBASE BLUEPRINT\\nReact Native / Expo 52 Client | FastAPI Gateway | Grounded AI | Vision Engine | Supabase PostGIS",
        labelloc="t",
        labeljust="c",
        fontsize=22,
        fontname="Helvetica-Bold",
        fontcolor="#F8FAFC",
        bgcolor="#0B0F19",
        rankdir="TB",
        compound=true,
        splines=spline,
        nodesep=0.5,
        ranksep=0.7,
        dpi=300
    ];

    node [
        fontname="Helvetica",
        fontsize=10,
        shape=box,
        style="filled,rounded",
        margin="0.2,0.12",
        penwidth=1.5
    ];

    edge [
        fontname="Helvetica",
        fontsize=9,
        fontcolor="#94A3B8",
        color="#475569",
        penwidth=1.4,
        arrowsize=0.8
    ];

    /* FRONTEND CLIENT */
    subgraph cluster_client {
        label="FRONTEND CLIENT LAYER (React Native / Expo SDK 52 / Web & Native)";
        style="filled,rounded";
        fillcolor="#0F172A";
        color="#38BDF8";
        fontname="Helvetica-Bold";
        fontsize=13;
        fontcolor="#38BDF8";

        subgraph cluster_screens {
            label="Expo Router Screens (src/app)";
            style="filled,rounded";
            fillcolor="#1E293B";
            color="#0284C7";
            fontcolor="#7DD3FC";
            fontsize=11;

            SCR_INDEX [label="index.tsx\\nSplash & Animated Overlay", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_EXPLORE [label="explore.tsx\\nDiscovery & Filter Chips", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_DEST [label="destination/[id].tsx\\nDeep Dive, Audio & Actions", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_MAP [label="map.tsx\\nSwiggy-Style Navigation & ETAs", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_MEERUP [label="meerup.tsx\\nAI Cultural Companion Chat", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_CONV [label="conversation.tsx\\nMeeteilon Voice Translator", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
            SCR_PROF [label="profile.tsx\\nTrips & Saved Bookmarks", fillcolor="#334155", fontcolor="#F8FAFC", color="#38BDF8"];
        }

        subgraph cluster_components {
            label="Specialized UI Modules (src/components)";
            style="filled,rounded";
            fillcolor="#1E293B";
            color="#0284C7";
            fontcolor="#7DD3FC";
            fontsize=11;

            MAP_SPLIT [label="NativeMapView (.web / .native)\\nPlatform-Split Map (SVG Web vs Maps Native)", fillcolor="#1E293B", fontcolor="#E2E8F0", color="#60A5FA"];
            CAM_MODAL [label="LandmarkCameraModal.tsx\\nExpo Camera Viewfinder & AR Overlay", fillcolor="#1E293B", fontcolor="#E2E8F0", color="#60A5FA"];
            CARD_ITEM [label="RecommendationCardItem.tsx\\nInsta Spots, YouTube Vlogs & Tips", fillcolor="#1E293B", fontcolor="#E2E8F0", color="#60A5FA"];
            AUTH_MODAL [label="AuthModal.tsx\\nLogin / Register / Forgot Password", fillcolor="#1E293B", fontcolor="#E2E8F0", color="#60A5FA"];
            AUDIO_PLAYER [label="AudioGuidePlayer.tsx\\nCultural Voice Narration Stream", fillcolor="#1E293B", fontcolor="#E2E8F0", color="#60A5FA"];
        }

        subgraph cluster_client_services {
            label="Client State & Network Adapters";
            style="filled,rounded";
            fillcolor="#1E293B";
            color="#0284C7";
            fontcolor="#7DD3FC";
            fontsize=11;

            AUTH_CTX [label="AuthContext.tsx\\nSupabase Session & Persistence", fillcolor="#0F172A", fontcolor="#E2E8F0", color="#38BDF8"];
            MEERUP_API [label="utils/meerupApi.ts\\nBackend Bridge & Multi-URL Failover", fillcolor="#0F172A", fontcolor="#E2E8F0", color="#38BDF8"];
            SUPA_CLIENT [label="utils/supabase.ts\\nClient + Web/Native Storage Adapter", fillcolor="#0F172A", fontcolor="#E2E8F0", color="#38BDF8"];
            SAVE_PLACE [label="utils/savePlace.ts\\nSaved Places Toggle & Sync", fillcolor="#0F172A", fontcolor="#E2E8F0", color="#38BDF8"];
        }
    }

    /* BACKEND GATEWAY */
    subgraph cluster_backend {
        label="UNIFIED BACKEND GATEWAY (FastAPI / Python 3.13 / Port 8000)";
        style="filled,rounded";
        fillcolor="#0A192F";
        color="#818CF8";
        fontname="Helvetica-Bold";
        fontsize=13;
        fontcolor="#818CF8";

        APP_MAIN [label="app/main.py\\nFastAPI Lifespan, CORS & Route Hub", fillcolor="#1E1B4B", fontcolor="#FFFFFF", color="#A5B4FC", shape=box, style="filled,bold"];

        subgraph cluster_routers {
            label="API Routers (HTTP REST Endpoints)";
            style="filled,rounded";
            fillcolor="#111827";
            color="#6366F1";
            fontcolor="#A5B4FC";
            fontsize=11;

            R_VISION [label="app/vision/router.py\\nPOST /api/vision/recognize\\nPOST /api/vision/recognize-base64\\nGET /api/vision/places", fillcolor="#1F2937", fontcolor="#F9FAFB", color="#818CF8"];
            R_AI [label="app/ai/router.py\\nPOST /api/chat/grounded\\nPOST /v1/chat/completions", fillcolor="#1F2937", fontcolor="#F9FAFB", color="#818CF8"];
            R_REC [label="app/tourism/router.py\\nGET /api/recommendations/nearby\\nGET /api/recommendations/search\\nGET /api/recommendations/card", fillcolor="#1F2937", fontcolor="#F9FAFB", color="#818CF8"];
            R_TRANS [label="app/translation_proxy.py\\nPOST /api/translate-text, /api/tts\\nPOST /api/transcribe, /api/sts", fillcolor="#1F2937", fontcolor="#F9FAFB", color="#818CF8"];
        }

        subgraph cluster_vision_sub {
            label="Computer Vision & AR";
            style="filled,rounded";
            fillcolor="#2E1065";
            color="#C084FC";
            fontcolor="#E9D5FF";
            fontsize=10;

            DETECTOR [label="landmark_detector.py\\nMobileNetV2 Embeddings\\nCosine Similarity Index", fillcolor="#3B0764", fontcolor="#F3E8FF", color="#C084FC"];
            V_SERVICE [label="landmark_service.py\\nBilingual Story Service", fillcolor="#3B0764", fontcolor="#F3E8FF", color="#C084FC"];
            V_CONTENT [label="place_content.py\\nKangla & Ima Keithel History", fillcolor="#3B0764", fontcolor="#F3E8FF", color="#C084FC"];
        }

        subgraph cluster_ai_sub {
            label="Grounded AI & Anti-Hallucination";
            style="filled,rounded";
            fillcolor="#4C0519";
            color="#FB7185";
            fontcolor="#FFE4E6";
            fontsize=10;

            GROUNDED_SRV [label="grounded_service.py\\nTerrain Travel Physics\\nRealistic Duration Engine", fillcolor="#881337", fontcolor="#FFF1F2", color="#FB7185"];
            LOCAL_LLM [label="llm.py\\nLocalLLM Client (HTTP :8080)", fillcolor="#881337", fontcolor="#FFF1F2", color="#FB7185"];
            INTENT_CLF [label="intent.py & ranking.py\\nIntent Classifier & Context", fillcolor="#881337", fontcolor="#FFF1F2", color="#FB7185"];
        }

        subgraph cluster_tour_sub {
            label="Tourism & Web Scraper";
            style="filled,rounded";
            fillcolor="#064E3B";
            color="#34D399";
            fontcolor="#D1FAE5";
            fontsize=10;

            SCRAPER [label="web_scraper.py\\nLive Google/DDG Search\\nInstagram Spots & YouTube Scraper", fillcolor="#065F46", fontcolor="#ECFDF5", color="#34D399"];
            CARD_SRV [label="card_service.py\\nDestinationCard Synthesizer", fillcolor="#065F46", fontcolor="#ECFDF5", color="#34D399"];
            DB_SRV [label="service.py (TourismService)\\nSupabase PostGIS RPC Integration", fillcolor="#065F46", fontcolor="#ECFDF5", color="#34D399"];
        }

        GRPC_SRV [label="app/grpc/server.py\\nHigh-Performance gRPC Server (Port 50051)\\nGetNearbyDestinations, RecognizeLandmark", fillcolor="#1E1B4B", fontcolor="#C7D2FE", color="#818CF8"];
    }

    /* LOCAL INFERENCE */
    subgraph cluster_inference {
        label="LOCAL INFERENCE ENGINES";
        style="filled,rounded";
        fillcolor="#172554";
        color="#60A5FA";
        fontname="Helvetica-Bold";
        fontsize=12;
        fontcolor="#93C5FD";

        LLAMA_SRV [label="llama-server (Port 8080)\\nQuantized LLM Engine (Llama-3/Qwen)", fillcolor="#1E3A8A", fontcolor="#EFF6FF", color="#93C5FD", shape=component];
        TRANS_SRV [label="Translation Engine (Port 8001 / Local)\\nIndicTrans2 (Meeteilon) / Whisper STT / TTS", fillcolor="#1E3A8A", fontcolor="#EFF6FF", color="#93C5FD", shape=component];
    }

    /* SUPABASE CLOUD */
    subgraph cluster_supabase {
        label="SUPABASE CLOUD (havukdklsowjoghhtepj.supabase.co)";
        style="filled,rounded";
        fillcolor="#022C22";
        color="#10B981";
        fontname="Helvetica-Bold";
        fontsize=13;
        fontcolor="#34D399";

        SUPA_AUTH [label="Supabase Auth Engine\\nJWT Sessions / Email & Password / OTP", fillcolor="#064E3B", fontcolor="#ECFDF5", color="#34D399", shape=cylinder];
        SUPA_DB [label="PostgreSQL 15 (PostGIS Enabled)\\nTables: destinations, profiles, trips, saved_places, food", fillcolor="#064E3B", fontcolor="#ECFDF5", color="#34D399", shape=cylinder];
        SUPA_RPC [label="PostGIS Stored Procedure\\nRPC: nearby_destinations(user_lat, user_lon, radius_km)", fillcolor="#064E3B", fontcolor="#ECFDF5", color="#34D399"];
    }

    /* EXTERNAL */
    subgraph cluster_external {
        label="LIVE WEB & EXTERNAL SERVICES";
        style="filled,rounded";
        fillcolor="#18181B";
        color="#71717A";
        fontname="Helvetica-Bold";
        fontsize=12;
        fontcolor="#A1A1AA";

        EXT_SEARCH [label="Google / DuckDuckGo Search\\nReal-time Snippets & Ratings", fillcolor="#27272A", fontcolor="#F4F4F5", color="#A1A1AA"];
        EXT_OSRM [label="OSRM Routing Engine\\nRoad Network Polylines & Driving ETAs", fillcolor="#27272A", fontcolor="#F4F4F5", color="#A1A1AA"];
    }

    /* EDGES */
    SCR_MAP -> MAP_SPLIT;
    SCR_MAP -> EXT_OSRM [label="route coords", color="#38BDF8"];
    SCR_DEST -> AUDIO_PLAYER;
    SCR_EXPLORE -> CARD_ITEM;
    SCR_EXPLORE -> CAM_MODAL;
    SCR_PROF -> AUTH_MODAL;

    SCR_MEERUP -> MEERUP_API [color="#38BDF8"];
    SCR_EXPLORE -> MEERUP_API [color="#38BDF8"];
    SCR_DEST -> MEERUP_API [color="#38BDF8"];
    CAM_MODAL -> MEERUP_API [label="frame capture", color="#38BDF8"];
    SCR_CONV -> MEERUP_API [label="voice audio", color="#38BDF8"];

    AUTH_CTX -> SUPA_CLIENT;
    SAVE_PLACE -> SUPA_CLIENT;
    SCR_PROF -> SUPA_CLIENT;

    MEERUP_API -> APP_MAIN [label="HTTP REST (Port 8000)", color="#38BDF8", penwidth=2.0];
    SUPA_CLIENT -> SUPA_AUTH [label="Auth & JWT", color="#10B981", penwidth=1.8];
    SUPA_CLIENT -> SUPA_DB [label="Direct PostgREST\\n(profiles, trips, saved_places)", color="#10B981", penwidth=1.8];

    APP_MAIN -> R_VISION [color="#818CF8"];
    APP_MAIN -> R_AI [color="#818CF8"];
    APP_MAIN -> R_REC [color="#818CF8"];
    APP_MAIN -> R_TRANS [color="#818CF8"];

    R_VISION -> V_SERVICE;
    V_SERVICE -> DETECTOR;
    V_SERVICE -> V_CONTENT;

    R_AI -> GROUNDED_SRV [color="#FB7185"];
    GROUNDED_SRV -> INTENT_CLF [color="#FB7185"];
    GROUNDED_SRV -> LOCAL_LLM [color="#FB7185"];
    GROUNDED_SRV -> SCRAPER [label="verify facts", color="#FB7185"];
    LOCAL_LLM -> LLAMA_SRV [label="HTTP :8080\\n/v1/chat/completions", color="#F43F5E", penwidth=2.0];

    R_REC -> CARD_SRV [color="#34D399"];
    CARD_SRV -> SCRAPER [color="#34D399"];
    R_REC -> DB_SRV [color="#34D399"];
    DB_SRV -> SUPA_RPC [label="supabase.rpc('nearby_destinations')", color="#10B981", penwidth=2.0];
    SUPA_RPC -> SUPA_DB;
    SCRAPER -> EXT_SEARCH [label="httpx live scraping", color="#10B981"];

    R_TRANS -> TRANS_SRV [label="forward :8001", color="#FBBF24"];

    GRPC_SRV -> V_SERVICE [color="#818CF8"];
    GRPC_SRV -> DB_SRV [color="#818CF8"];
}
"""

with open("/home/gunin/Desktop/meerup/architecture_diagram.dot", "w") as f:
    f.write(arch_dot.strip())

res = subprocess.run([
    "dot", "-Tpng", "-Gdpi=300",
    "/home/gunin/Desktop/meerup/architecture_diagram.dot",
    "-o", "/home/gunin/Desktop/meerup/architecture_diagram.png"
], capture_output=True, text=True)
if res.returncode != 0:
    print("Error generating arch diagram:", res.stderr)
else:
    print("architecture_diagram.png generated successfully!")
