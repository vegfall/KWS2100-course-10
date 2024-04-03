import { useEffect, useState } from "react";
import { FeedMessage, VehiclePosition } from "../../../generated/gtfs-realtime";

interface LiveVehiclePosition {
  coordinate: number[];
  timestamp: number;
}

interface LiveVehicle {
  routeId: string;
  position: LiveVehiclePosition;
  history: LiveVehiclePosition[];
}

function convertFromProtobuf(
  vehicle: VehiclePosition | undefined,
): LiveVehicle | undefined {
  if (!vehicle) return;
  const { position, trip } = vehicle;
  if (!position || !trip) return;
  const { longitude, latitude } = position;
  const { routeId } = trip;
  if (!routeId) return;

  return {
    routeId,
    position: {
      coordinate: [longitude, latitude],
      timestamp: 0,
    },
    history: [],
  };
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);

  async function fetchVehiclePosition() {
    const res = await fetch(
      "https://api.entur.io/realtime/v1/gtfs-rt/vehicle-positions",
    );

    if (!res.ok) {
      throw `Error fetching ${res.url}: ${res.statusText}`;
    }

    const resMessage = FeedMessage.decode(
      new Uint8Array(await res.arrayBuffer()),
    );

    const vehicles: LiveVehicle[] = [];

    for (const { vehicle } of resMessage.entity) {
      const v = convertFromProtobuf(vehicle);

      if (v) vehicles.push(v);
    }

    setVehicles(vehicles);
  }

  useEffect(() => {
    fetchVehiclePosition();
    const intervalId = setInterval(() => fetchVehiclePosition(), 15000);
    return () => clearInterval(intervalId);
  }, []);

  return vehicles;
}
