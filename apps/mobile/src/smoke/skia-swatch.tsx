import { Canvas, Circle, SweepGradient, vec } from '@shopify/react-native-skia';

const SIZE = 56;
const CENTRE = SIZE / 2;

// Loaded lazily (lazy-skia-swatch): Skia is for confetti and share cards only,
// so it must never be on the start-up path (roadmap §3.1, §7).
export default function SkiaSwatch() {
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Circle cx={CENTRE} cy={CENTRE} r={CENTRE - 2}>
        <SweepGradient
          c={vec(CENTRE, CENTRE)}
          colors={['#3355D0', '#6BD79A', '#FFB84D', '#3355D0']}
        />
      </Circle>
    </Canvas>
  );
}
