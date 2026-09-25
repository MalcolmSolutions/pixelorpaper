"use client";

import { useEffect } from "react";
import { trackEvent } from "./analytics";

export function WebVitalsReporter() {
  useEffect(() => {
    // Import web-vitals dynamically - only use available metrics
    void import("web-vitals").then((vitals) => {
      // Track all available Web Vitals metrics
      const metricsToTrack = ["onCLS", "onFCP", "onLCP", "onTTFB", "onINP"];

      for (const metricName of metricsToTrack) {
        if (metricName in vitals) {
          const trackFn = vitals[metricName as keyof typeof vitals] as (
            callback: (metric: {
              name: string;
              value: number;
              id: string;
            }) => void,
          ) => void;

          trackFn((metric) => {
            trackEvent("web_vitals", {
              metric_name: metricName.replace("on", ""),
              metric_value: metric.value,
              metric_id: metric.id,
            });
          });
        }
      }
    });
  }, []);

  return null;
}
