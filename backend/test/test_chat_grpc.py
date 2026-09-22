import grpc

from app.grpc.generated import meerup_pb2
from app.grpc.generated import meerup_pb2_grpc


def main():

    print("Connecting to MEERUP gRPC server...")

    channel = grpc.insecure_channel(
        "127.0.0.1:50051"
    )

    stub = meerup_pb2_grpc.MeerupAIStub(channel)

    request = meerup_pb2.ChatRequest(
        message="I have 3 hours and I love nature and photography.",
        location=meerup_pb2.Location(
            latitude=24.817,
            longitude=93.9368,
        ),
        interests=[
            "nature",
            "photography",
        ],
        available_minutes=180,
        language="en",
        session_id="test-session",
    )

    print()
    print("Sending Chat request...")
    print()

    responses = stub.Chat(request)

    print("=== MEERUP RESPONSE ===")
    print()

    for chunk in responses:

        print(chunk.text, end="", flush=True)

    print()
    print()
    print("=== DONE ===")


if __name__ == "__main__":
    main()