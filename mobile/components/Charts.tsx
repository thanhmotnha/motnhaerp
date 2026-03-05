import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { COLORS } from '@/lib/constants';

interface SparkLineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    filled?: boolean;
}

export function SparkLine({
    data,
    width = 120,
    height = 40,
    color = COLORS.primary,
    filled = true,
}: SparkLineProps) {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((v - min) / range) * (height - 4) - 2,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

    return (
        <Svg width={width} height={height}>
            {filled && (
                <Path d={fillPath} fill={color} fillOpacity={0.15} />
            )}
            <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* End dot */}
            <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
        </Svg>
    );
}

interface MiniBarChartProps {
    data: { label: string; value: number; color?: string }[];
    width?: number;
    height?: number;
}

export function MiniBarChart({
    data,
    width = Dimensions.get('window').width - 64,
    height = 120,
}: MiniBarChartProps) {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.value)) || 1;
    const barWidth = Math.min(32, (width - 20) / data.length - 8);
    const chartPadding = 10;

    return (
        <View>
            <Svg width={width} height={height + 24}>
                {data.map((item, i) => {
                    const barHeight = (item.value / max) * (height - 10);
                    const x = chartPadding + i * ((width - chartPadding * 2) / data.length) + (((width - chartPadding * 2) / data.length - barWidth) / 2);
                    const y = height - barHeight;

                    return (
                        <React.Fragment key={i}>
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx={4}
                                fill={item.color || COLORS.primary}
                                fillOpacity={0.85}
                            />
                        </React.Fragment>
                    );
                })}
                {/* Baseline */}
                <Line x1={chartPadding} y1={height} x2={width - chartPadding} y2={height} stroke={COLORS.borderLight} strokeWidth={1} />
            </Svg>
            <View style={[chartStyles.labels, { width }]}>
                {data.map((item, i) => (
                    <Text key={i} style={chartStyles.label} numberOfLines={1}>
                        {item.label}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const chartStyles = StyleSheet.create({
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: -4,
    },
    label: { fontSize: 10, color: COLORS.textLight, textAlign: 'center' },
});
