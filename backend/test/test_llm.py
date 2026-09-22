from app.ai.llm import LocalLLM


llm = LocalLLM()

messages = [
    {
        "role": "system",
        "content": """
You are Meerup, a tourism assistant for Manipur.

You MUST answer using ONLY the verified destination
information provided by the user.

Never use your own knowledge to add tourism facts.

Never invent:
- destinations
- attractions
- distances
- travel times
- activities
- historical facts

If the supplied information does not contain enough
information to answer, say that the available data
does not contain that information.
""",
    },
    {
        "role": "user",
        "content": """
Tell me about Andro.

VERIFIED DESTINATION DATA:

Name: Andro

Description:
An ancient village famous for its traditional coil
pottery, the Mutua Museum, and the preservation of
ancient Meitei cultural practices and traditional
brewing.

Categories:
village, culture, museum

Interests:
culture, history, art, local experience

District:
Imphal East

Distance:
13.516 km

Estimated duration:
120 minutes
""",
    },
]


response = llm.chat(
    messages=messages,
    temperature=0.2,
    max_tokens=150,
)

print("\n=== MEERUP LLM RESPONSE ===\n")
print(response)