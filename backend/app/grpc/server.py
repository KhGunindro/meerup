from concurrent import futures

import grpc

from app.grpc.generated import meerup_pb2
from app.grpc.generated import meerup_pb2_grpc

from app.tourism.service import TourismService


class MeerupAIServicer(meerup_pb2_grpc.MeerupAIServicer):

    def __init__(self):
        self.tourism_service = TourismService()

    def GetNearbyDestinations(self, request, context):

        print(
            "gRPC GetNearbyDestinations:",
            request.location.latitude,
            request.location.longitude,
            request.radius_km,
        )

        try:
            results = self.tourism_service.nearby_destinations(
                latitude=request.location.latitude,
                longitude=request.location.longitude,
                radius_km=request.radius_km or 20.0,
            )

            destinations = []

            for destination in results:

                destinations.append(
                    meerup_pb2.NearbyDestination(
                        id=str(destination.get("id", "")),
                        name=destination.get("name", ""),
                        description=destination.get("description", ""),
                        categories=destination.get("category", []),
                        interests=destination.get("interests", []),
                        district=destination.get("district", ""),
                        latitude=float(destination.get("latitude") or 0),
                        longitude=float(destination.get("longitude") or 0),
                        estimated_duration_minutes=int(
                            destination.get(
                                "estimated_duration_minutes",
                                0,
                            )
                            or 0
                        ),
                        distance_km=float(
                            destination.get("distance_km", 0) or 0
                        ),
                        image_url=destination.get("image_url") or "",
                    )
                )

            return meerup_pb2.NearbyResponse(
                destinations=destinations
            )

        except Exception as e:

            print("gRPC error:", repr(e))

            context.set_code(
                grpc.StatusCode.INTERNAL
            )

            context.set_details(
                "Failed to retrieve nearby destinations"
            )

            return meerup_pb2.NearbyResponse()

    def Chat(self, request, context):

        context.set_code(
            grpc.StatusCode.UNIMPLEMENTED
        )

        context.set_details(
            "AI Chat is not implemented yet"
        )

        return
    
def serve():

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10)
    )

    meerup_pb2_grpc.add_MeerupAIServicer_to_server(
        MeerupAIServicer(),
        server,
    )

    server.add_insecure_port(
        "[::]:50051"
    )

    server.start()

    print("===================================")
    print("       MEERUP gRPC SERVER")
    print("===================================")
    print("Listening on 0.0.0.0:50051")
    print("===================================")

    server.wait_for_termination()


if __name__ == "__main__":
    serve()