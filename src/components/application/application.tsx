import React, { MutableRefObject, useEffect, useRef } from "react";
import { Feature, Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import { OSM } from "ol/source";
import { useGeographic } from "ol/proj";
import "ol/ol.css";
import { FeedMessage } from "../../../generated/gtfs-realtime";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

useGeographic();

const vehicleSource = new VectorSource();
const vehicleLayer = new VectorLayer({ source: vehicleSource });

const map = new Map({
  view: new View({ center: [10, 63], zoom: 8 }),
  layers: [new TileLayer({ source: new OSM() }), vehicleLayer],
});

export function Application() {
  const mapRef = useRef() as MutableRefObject<HTMLDivElement>;

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

    for (const { vehicle } of resMessage.entity) {
      if (!vehicle) continue;
      const { position } = vehicle;
      if (!position) continue;
      const { longitude, latitude } = position;
      const point = new Point([longitude, latitude]);
      vehicleSource.addFeature(new Feature(point));
    }
  }

  useEffect(() => {
    fetchVehiclePosition();
  }, []);

  useEffect(() => {
    map.setTarget(mapRef.current);
  }, []);

  return <div ref={mapRef}></div>;
}
