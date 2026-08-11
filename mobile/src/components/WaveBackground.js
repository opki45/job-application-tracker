import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Purely decorative -- the soft lavender wave sitting behind the login/
// register form in the design. Absolute-positioned, sits behind its
// siblings (render it first), doesn't intercept touches.
const { width } = Dimensions.get('window');

export default function WaveBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={width} height={320} viewBox={`0 0 ${width} 320`}>
        <Defs>
          <LinearGradient id="wave" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ece8fd" stopOpacity="1" />
            <Stop offset="1" stopColor="#dcd5fb" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0,120 C${width * 0.25},60 ${width * 0.75},180 ${width},110 L${width},320 L0,320 Z`}
          fill="url(#wave)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
