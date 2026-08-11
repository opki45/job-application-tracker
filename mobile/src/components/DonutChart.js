import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme';

// Hand-rolled SVG donut -- no charting library, matching the web app's own
// hand-rolled (not-a-library) approach. Each segment is a full <Circle>
// with a strokeDasharray cut to its share of the circumference, rotated
// into place; a plain ring (not filled slices) reads better at this size
// and leaves room for the total in the center.
export default function DonutChart({ segments, size = 140, strokeWidth = 22 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;

  let cumulative = 0;
  const arcs = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const fraction = s.count / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      // 2px surface gap between segments (dataviz skill guidance).
      const offset = circumference - cumulative;
      cumulative += dash;
      return { ...s, dash: Math.max(dash - 2, 0), gap, offset };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
          {arcs.map((arc) => (
            <Circle
              key={arc.status}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
