import { useEffect, useState } from "react";
import { FeedMessage, VehiclePosition } from "../../../generated/gtfs-realtime";

interface LiveVehiclePosition {
  coordinate: number[];
  timestamp: number;
}

interface LiveVehicle {
  id: string;
  routeId: string;
  position: LiveVehiclePosition;
  history: LiveVehiclePosition[];
}

function convertFromProtobuf(
  vehicle: VehiclePosition | undefined,
): LiveVehicle | undefined {
  if (!vehicle) return;
  const { position, trip, vehicle: protoVehicle } = vehicle;
  if (!position || !trip || !protoVehicle) return;
  const { id } = protoVehicle;
  const { longitude, latitude } = position;
  const { routeId } = trip;
  if (!routeId || !id) return;

  const p = {
    coordinate: [longitude, latitude],
    timestamp: 0,
  };

  return {
    id,
    routeId,
    position: p,
    history: [p],
  };
}

export function useVehicles() {
  const [vehicleTable, setVehicleTable] = useState<Record<string, LiveVehicle>>(
    {},
  );

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

    setVehicleTable((old) => {
      const updated = { ...old };

      for (const v of vehicles) {
        const oldVehicle = updated[v.id];
        if (oldVehicle) {
          updated[v.id] = {
            ...oldVehicle,
            position: v.position,
            history: [...oldVehicle.history, v.position],
          };
        } else {
          updated[v.id] = v;
        }
      }

      return updated;
    });
  }

  useEffect(() => {
    fetchVehiclePosition();
    const intervalId = setInterval(() => fetchVehiclePosition(), 15000);
    return () => clearInterval(intervalId);
  }, []);

  return Object.values(vehicleTable);
}
