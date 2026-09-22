"""Curated, fact-only content and fallback storytelling for landmarks supported by the vision model."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PlaceContent:
    place_id: str
    name: str
    description: str
    facts: tuple[str, ...]
    highlights: tuple[str, ...]
    fallback_story: str


PLACES: dict[str, PlaceContent] = {
    "ima_keithel": PlaceContent(
        place_id="ima_keithel",
        name="Ima Keithel",
        description=(
            "Ima Keithel (Mother's Market) is an iconic, 500-year-old market "
            "in the heart of Imphal, Manipur, operated exclusively by thousands of women vendors."
        ),
        facts=(
            "Established around the 16th century, it is recognized as Asia's largest all-women market.",
            "Operated exclusively by over 4,000 married women vendors ('Imas' or mothers).",
            "Played a pivotal historical role in the Nupi Lan (Women's War) movements against British colonial policies.",
            "Divided across three major buildings in Khwairamband Keithel: Purana Bazar, Laxmi Bazar, and Linthoingambi Bazar.",
            "Offers authentic Manipuri handloom textiles, Phaneks, Innaphis, fresh organic produce, and traditional handicrafts.",
        ),
        highlights=(
            "World's Largest All-Women Market",
            "500+ Year Living Heritage",
            "Nupi Lan Historic Site",
            "Manipuri Handloom & Craft Hub",
        ),
        fallback_story=(
            "Step into Ima Keithel, the world's most vibrant celebration of female empowerment. "
            "For over five centuries in central Imphal, thousands of spirited 'Imas' (mothers) "
            "have run this bustling marketplace. Beyond rows of shimmering handwoven Phaneks, "
            "indigenous spices, and artisan craftwork, this market has been the heartbeat of Manipur's "
            "history—a citadel of unity that once sparked the historic Nupi Lan resistance."
        ),
    ),
    "kangla": PlaceContent(
        place_id="kangla",
        name="Kangla",
        description=(
            "Kangla is the ancient, sacred palace and fortified capital of the Kingdom of Manipur, "
            "standing on the banks of the Imphal River."
        ),
        facts=(
            "Served as the traditional seat of power for the Meitei monarchs for centuries until 1891.",
            "Houses the sacred Kangla Sha (dragon-lion mythical beasts), the proud state emblem of Manipur.",
            "Contains significant spiritual sanctuaries including Nungjeng Pukhri, the sacred pond of the serpentine deity Pakhangba.",
            "Features the historic Sri Govindaji Temple ruins, ancient coronation sites (Kangla Uttra), and citadel ramparts.",
            "Handed back to the people of Manipur in 2004, it is preserved today as a premier archaeological and cultural heritage park.",
        ),
        highlights=(
            "Ancient Royal Palace Fort",
            "Sacred Kangla Sha Emblems",
            "Nungjeng Pukhri Holy Pond",
            "Imphal River Archaeological Park",
        ),
        fallback_story=(
            "Kangla whispers legends of centuries past as the ancient seat of the Meitei kings. "
            "Enclosed within historic ramparts beside the Imphal River, this sacred land holds the grand "
            "white Kangla Sha dragon-lions standing sentinel over Manipur's royal legacy. From the mystical "
            "waters of Nungjeng Pukhri to the solemn coronation grounds of Kangla Uttra, every corner echoes "
            "the sovereign dignity and spiritual heritage of Manipur."
        ),
    ),
}


def content_for_label(label: str) -> PlaceContent | None:
    normalized = "_".join(label.lower().replace("-", " ").split())
    return PLACES.get(normalized)
