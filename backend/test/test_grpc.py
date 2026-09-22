import grpc

from app.grpc.generated import meerup_pb2
from app.grpc.generated import meerup_pb2_grpc


def main():

    print("Connecting to MEERUP gRPC server...")

    channel = grpc.insecure_channel(
        "localhost:50051"
    )

    client = meerup_pb2_grpc.MeerupAIStub(
        channel
    )

    request = meerup_pb2.NearbyRequest(
        location=meerup_pb2.Location(
            latitude=24.8170,
            longitude=93.9368,
        ),
        radius_km=20.0,
    )

    print("Requesting nearby destinations...")

    response = client.GetNearbyDestinations(
        request
    )

    print()
    print(
        f"Found {len(response.destinations)} destinations"
    )

    print("-----------------------------------")

    for destination in response.destinations:

        print(
            f"{destination.name} "
            f"→ {destination.distance_km:.2f} km"
        )

        print(
            f"  {destination.description}"
        )

        print(
            f"  Coordinates: "
            f"{destination.latitude}, "
            f"{destination.longitude}"
        )

        print()


if __name__ == "__main__":
    main()