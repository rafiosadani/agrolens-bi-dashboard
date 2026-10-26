"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { useTheme } from "@/context/ThemeContext";

interface EChartProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
  onChartReady?: (chart: echarts.ECharts) => void;
  onEvents?: Record<string, (params: any) => void>;
}

export function EChart({
  option,
  style = { height: "100%", width: "100%" },
  className = "",
  loading = false,
  onChartReady,
  onEvents,
}: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  // Initialize or recreate chart when theme changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Dispose old instance if theme changes
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    // Initialize with dark or default theme
    const chart = echarts.init(chartRef.current, theme === "dark" ? "dark" : undefined, {
      renderer: "canvas",
    });
    chartInstance.current = chart;

    if (onChartReady) {
      onChartReady(chart);
    }

    // Register event listeners
    if (onEvents) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        chart.on(eventName, handler);
      });
    }

    // Resize observer for responsive layout
    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, [theme, onChartReady]);

  // Update option when option or loading state changes
  useEffect(() => {
    if (!chartInstance.current) return;

    if (loading) {
      chartInstance.current.showLoading({
        text: "Memuat Data...",
        color: "#1E3A8A",
        textColor: theme === "dark" ? "#94A3B8" : "#64748B",
        maskColor: theme === "dark" ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.6)",
      });
    } else {
      chartInstance.current.hideLoading();
      try {
        chartInstance.current.setOption(option, { notMerge: true });
      } catch (err) {
        console.error("[EChart] Error setting chart option:", err);
      }
    }
  }, [option, loading, theme]);

  return <div ref={chartRef} style={style} className={className} />;
}
