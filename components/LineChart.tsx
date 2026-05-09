import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS } from '@/styles/colors';

interface LineChartProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showGradient?: boolean;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return path;
}

export default function LineChart({
  data,
  color = COLORS.chart1,
  width = 300,
  height = 120,
  showGradient = true,
}: LineChartProps) {
  const paddingLeft = 32;
  const paddingRight = 12;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const displayData = data.length > 0 ? data : Array(12).fill(50);
  const minVal = 0;
  const maxVal = 100;

  const points = displayData.map((val, i) => ({
    x: paddingLeft + (i / (displayData.length - 1)) * chartWidth,
    y: paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight,
  }));

  const linePath = buildSmoothPath(points);

  const lastPoint = points[points.length - 1];

  const gradientId = `grad_${color.replace('#', '')}`;

  const areaPath = points.length > 0
    ? `${linePath} L ${lastPoint.x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  const yLabels = [100, 50, 0];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {yLabels.map((label) => {
          const yPos = paddingTop + chartHeight - ((label - minVal) / (maxVal - minVal)) * chartHeight;
          return (
            <React.Fragment key={label}>
              <Line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + chartWidth}
                y2={yPos}
                stroke={COLORS.border}
                strokeWidth={1}
              />
              <SvgText
                x={paddingLeft - 4}
                y={yPos + 4}
                fontSize={9}
                fill={COLORS.textTertiary}
                textAnchor="end"
              >
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {showGradient && areaPath ? (
          <Path d={areaPath} fill={`url(#${gradientId})`} />
        ) : null}

        <Path
          d={linePath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {lastPoint ? (
          <>
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} />
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={7} fill={color} fillOpacity={0.2} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
