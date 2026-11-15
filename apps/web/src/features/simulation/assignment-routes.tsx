"use client";

import { useEffect, useRef } from "react";
import { corridorFloors, roomFloor, walkingPath } from "./dispatch";
import { activeIncident, incidentProgress } from "./incident";
import { crewColors, crewIds, roomAt, roomCenter, roomIds, type SimulationState } from "./simulation";
import styles from "./simulation.module.css";

export function AssignmentRoutes({ state }: { state: SimulationState }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const decision = activeIncident(state.decision);
    if (!element || !decision || incidentProgress(state)?.sleepOnly) return;
    const context = element.getContext("2d");
    if (!context) return;
    const affected = state.crew.find(({ id }) => id === decision.affectedCrewId);
    const routes = decision.instructions.flatMap((instruction) => {
      const origin = state.crew.find(({ id }) => id === instruction.crewId);
      const room = instruction.destination;
      if (!origin || !room || (affected && roomAt(affected.position) !== room)) return [];
      const pickup = instruction.equipmentCollected !== true && instruction.via;
      if (roomAt(origin.position) === room && instruction.equipmentCollected !== false) return [];
      const destination = affected?.position ?? roomCenter(room);
      const waypoint = pickup && roomCenter(pickup);
      const path = waypoint
        ? [...walkingPath(origin.position, waypoint), ...walkingPath(waypoint, destination).slice(1)]
        : walkingPath(origin.position, destination);
      return [{ path, color: crewColors[crewIds.indexOf(instruction.crewId)], via: instruction.via }];
    });

    const draw = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      const x = width / 100;
      const y = height / 100;
      const ctx = context;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      for (const room of roomIds) {
        const floor = roomFloor(room);
        const center = roomCenter(room);
        const radiusX = floor.width / 2 * x;
        ctx.moveTo(center.x * x + radiusX, center.y * y);
        ctx.ellipse(center.x * x, center.y * y, radiusX, floor.height / 2 * y, 0, 0, Math.PI * 2);
        ctx.closePath();
      }
      for (const floor of corridorFloors) {
        ctx.rect(floor.left * x, floor.top * y, floor.width * x, floor.height * y);
      }
      ctx.clip();
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.85;
      for (const route of routes) {
        ctx.beginPath();
        ctx.strokeStyle = route.color;
        ctx.setLineDash(route.via ? [6, 5] : []);
        route.path.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x * x, point.y * y);
          else ctx.lineTo(point.x * x, point.y * y);
        });
        ctx.stroke();
      }
    };

    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, element.width, element.height);
    };
  }, [state]);

  return <canvas ref={canvas} className={styles.routes} aria-hidden="true" />;
}
