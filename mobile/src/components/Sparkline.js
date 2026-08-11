import { View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

// A small trend line for a stat card. Takes plain numbers (already bucketed
// by the caller -- see index.js's weekly-bucket-by-status derivation) and
// draws them as a single polyline, flat if there's nothing to show yet
// rather than an empty/broken chart.
export default function Sparkline({ data, color, width = 72, height = 28 }) {
  const values = data && data.length > 0 ? data : [0, 0];
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = (values.length - 1) * stepX;
  const lastY = height - ((values[values.length - 1] - min) / range) * height;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={lastX} cy={lastY} r={2.5} fill={color} />
      </Svg>
    </View>
  );
}
