import Svg, { Rect, Line, Path, G } from "react-native-svg";

type Props = { size?: number; color?: string };

export function FridgeIcon({ size = 40, color = "#1B3520" }: Props) {
  const w = size;
  const h = size * 1.3;
  const r = size * 0.12;
  const stroke = size * 0.065;
  const dividerY = h * 0.32;

  // Sparkle path (4-pointed star) centered in lower section
  const cx = w / 2;
  const cy = dividerY + (h - dividerY) / 2;
  const s = size * 0.14;
  const sparkle = `M${cx},${cy - s} L${cx + s * 0.3},${cy - s * 0.3} L${cx + s},${cy} L${cx + s * 0.3},${cy + s * 0.3} L${cx},${cy + s} L${cx - s * 0.3},${cy + s * 0.3} L${cx - s},${cy} L${cx - s * 0.3},${cy - s * 0.3} Z`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <G strokeLinecap="round" strokeLinejoin="round">
        {/* Body */}
        <Rect
          x={stroke / 2}
          y={stroke / 2}
          width={w - stroke}
          height={h - stroke}
          rx={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
        {/* Divider */}
        <Line
          x1={stroke}
          y1={dividerY}
          x2={w - stroke}
          y2={dividerY}
          stroke={color}
          strokeWidth={stroke * 0.8}
        />
        {/* Handle top section */}
        <Rect
          x={w * 0.72}
          y={dividerY * 0.28}
          width={stroke * 1.2}
          height={dividerY * 0.44}
          rx={stroke * 0.6}
          fill={color}
        />
        {/* Sparkle */}
        <Path d={sparkle} fill={color} />
      </G>
    </Svg>
  );
}
