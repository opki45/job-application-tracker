import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

// Hand-rolled SVG line chart for "Applications over time" -- thin 2px line,
// >=8px-equivalent markers at data points, recessive gridlines, and a
// direct label on every point rather than a dense axis (dataviz skill
// guidance: selective direct labels beat a number on every point, but at
// 6-8 points here, "every point" and "selective" are the same thing).
export default function LineChart({ buckets, width = 300, height = 160 }) {
  const padding = { top: 16, right: 12, bottom: 28, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(4, ...buckets.map((b) => b.count));
  const stepX = buckets.length > 1 ? chartW / (buckets.length - 1) : 0;

  const points = buckets.map((b, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (b.count / max) * chartH;
    return { x, y, ...b };
  });

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <View>
      <Svg width={width} height={height}>
        {gridLines.map((v, i) => {
          const y = padding.top + chartH - (v / max) * chartH;
          return (
            <Line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}
        {gridLines.map((v, i) => {
          const y = padding.top + chartH - (v / max) * chartH;
          return (
            <SvgText key={i} x={4} y={y + 3} fontSize={9} fill={colors.faint}>
              {v}
            </SvgText>
          );
        })}

        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} stroke="#fff" strokeWidth={1.5} />
        ))}
        {points.map((p, i) => (
          <SvgText key={i} x={p.x} y={height - 6} fontSize={9} fill={colors.faint} textAnchor="middle">
            {p.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
