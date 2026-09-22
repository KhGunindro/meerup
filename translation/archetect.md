flowchart TB

    %% =========================================================
    %% USER
    %% =========================================================

    Tourist["Tourist"]

    %% =========================================================
    %% CLIENT / MOBILE APPLICATION
    %% =========================================================

    subgraph CLIENT["EIKHOI SATHI — MOBILE CLIENT"]
        direction TB

        Mobile["React Native + Expo Go"]

        Map["Map / POI Browsing"]
        Directions["GPS Directions"]
        Chat["AI Chat Assistant"]
        Voice["Voice Assistant"]
        TextFallback["Text-Fallback UI"]
        SOS["SOS / Emergency Panel"]
        Profile["Language / Preferences"]
        Offline["Offline Cache"]

        Mobile --> Map
        Mobile --> Directions
        Mobile --> Chat
        Mobile --> Voice
        Mobile --> TextFallback
        Mobile --> SOS
        Mobile --> Profile
        Mobile --> Offline
    end

    Tourist --> Mobile

    %% =========================================================
    %% OPTIONAL STRETCH
    %% =========================================================

    subgraph OPTIONAL["OPTIONAL STRETCH — NOT CORE MVP"]
        Camera["Camera POI Recognition"]
        Landmark["POI / Landmark Recognition"]
    end

    Mobile -. optional .-> Camera
    Camera -.-> Landmark
    Landmark -.-> Map

    %% =========================================================
    %% COMMUNICATION LAYER
    %% =========================================================

    subgraph COMM["COMMUNICATION LAYER"]
        direction TB

        Gateway["Connect-RPC API Gateway"]

        Auth["Authentication"]
        Routing["Request Routing"]
        Cache["API Cache"]
        Rate["Rate Limiting"]

        Gateway --> Auth
        Gateway --> Routing
        Gateway --> Cache
        Gateway --> Rate
    end

    Mobile --> Gateway

    %% =========================================================
    %% CORE APPLICATION SERVICES
    %% =========================================================

    subgraph SERVICES["CORE APPLICATION SERVICES"]
        direction TB

        POI["POI & Itinerary Service"]
        Translation["Translation & Speech Service"]
        Cultural["Cultural & Etiquette RAG"]
        Emergency["Emergency & Safety Service"]
        Maps["Maps / Directions Adapter"]

        POI --> Cultural
        Translation --> Cultural
    end

    Gateway --> POI
    Gateway --> Translation
    Gateway --> Cultural
    Gateway --> Emergency
    Gateway --> Maps

    %% =========================================================
    %% AI / INTELLIGENCE LAYER
    %% =========================================================

    subgraph AI["AI / INTELLIGENCE LAYER"]
        direction TB

        Intent["Intent & Context Understanding"]
        Retrieval["Context / Knowledge Retrieval"]
        Ranking["Context-Aware Ranking"]
        Response["Response Generation"]

        Intent --> Retrieval
        Retrieval --> Ranking
        Ranking --> Response
    end

    Chat --> Gateway
    Voice --> Gateway

    Gateway --> Intent
    Intent --> POI
    Intent --> Cultural
    Intent --> Emergency
    Intent --> Maps

    Cultural --> Retrieval
    Retrieval --> Ranking
    Ranking --> Response

    Response --> Chat
    Response --> Voice

    %% =========================================================
    %% TOURISM KNOWLEDGE / DATA LAYER
    %% =========================================================

    subgraph DATA["EIKHOI SATHI — KNOWLEDGE & DATA LAYER"]
        direction TB

        DB["PostgreSQL"]

        POITable["POI Database"]
        CulturalDB["Cultural Notes / Etiquette KB"]
        EmergencyDB["Emergency Contacts"]
        TranslationDB["Translation Cache"]
        Sessions["Device Sessions"]

        PGVector["pgvector"]

        DB --> POITable
        DB --> CulturalDB
        DB --> EmergencyDB
        DB --> TranslationDB
        DB --> Sessions

        CulturalDB --> PGVector
    end

    POI --> POITable
    Cultural --> CulturalDB
    Cultural --> PGVector
    Emergency --> EmergencyDB
    Translation --> TranslationDB
    Mobile --> Sessions

    %% =========================================================
    %% SPECIALIZED AI SERVICES
    %% =========================================================

    subgraph EXTERNAL["EXTERNAL & SPECIALIZED SERVICES"]
        direction TB

        Bhashini["Bhashini"]

        ASR["ASR / Speech-to-Text"]
        NMT["NMT / Translation"]
        TTS["TTS / Text-to-Speech"]

        MapsAPI["External Maps API"]

        LLM["LLM"]

        Bhashini --> ASR
        Bhashini --> NMT
        Bhashini --> TTS
    end

    Translation --> ASR
    Translation --> NMT
    Translation --> TTS

    ASR --> NMT
    NMT --> TTS

    TTS --> Voice

    Cultural --> LLM
    Response --> LLM
    LLM --> Response

    Maps --> MapsAPI
    MapsAPI --> Maps

    %% =========================================================
    %% OFFLINE-FIRST
    %% =========================================================

    subgraph OFFLINE["OFFLINE-FIRST CAPABILITIES"]
        direction TB

        CachedPOI["Cached POI Data"]
        Phrasebook["Cached Phrasebook"]
        CachedEmergency["Cached Emergency Contacts"]

        CachedPOI --> Offline
        Phrasebook --> Offline
        CachedEmergency --> Offline
    end

    POITable --> CachedPOI
    TranslationDB --> Phrasebook
    EmergencyDB --> CachedEmergency

    Offline --> SOS
    Offline --> Map
    Offline --> TextFallback

    %% =========================================================
    %% MVP DATA
    %% =========================================================

    subgraph MVP["MVP — 10–20 HAND-CURATED FLAGSHIP POIs"]
        direction LR

        Ima["Ima Keithel"]
        Loktak["Loktak Lake"]
        Kangla["Kangla Fort"]
        OtherPOI["Other Heritage / Nature / Market / Memorial / Food Sites"]
    end

    MVP --> POITable

    %% =========================================================
    %% STYLING
    %% =========================================================

    classDef client fill:#f8e8ff,stroke:#8e44ad,stroke-width:1px;
    classDef comm fill:#e5fbfb,stroke:#16a6a6,stroke-width:1px;
    classDef service fill:#fff0df,stroke:#e67e22,stroke-width:1px;
    classDef ai fill:#fff4df,stroke:#d68910,stroke-width:1px;
    classDef data fill:#e5f8f8,stroke:#16a6a6,stroke-width:1px;
    classDef external fill:#ffe8e8,stroke:#e74c3c,stroke-width:1px;
    classDef optional fill:#f1efff,stroke:#7d5fff,stroke-width:1px;
    classDef mvp fill:#eef9ee,stroke:#27ae60,stroke-width:1px;

    class Mobile,Map,Directions,Chat,Voice,TextFallback,SOS,Profile,Offline client;
    class Gateway,Auth,Routing,Cache,Rate comm;
    class POI,Translation,Cultural,Emergency,Maps service;
    class Intent,Retrieval,Ranking,Response ai;
    class DB,POITable,CulturalDB,EmergencyDB,TranslationDB,Sessions,PGVector,CachedPOI,Phrasebook,CachedEmergency data;
    class Bhashini,ASR,NMT,TTS,MapsAPI,LLM external;
    class Camera,Landmark optional;
    class Ima,Loktak,Kangla,OtherPOI mvp;