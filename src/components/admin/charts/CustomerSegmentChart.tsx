import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

interface CustomerSegmentChartProps {
  segments: {
    oneTime: { count: number; percentage: number };
    occasional: { count: number; percentage: number };
    regular: { count: number; percentage: number };
    vip: { count: number; percentage: number };
  };
}

export function CustomerSegmentChart({ segments }: CustomerSegmentChartProps) {
  const data = [
    { name: 'One-Time', value: segments.oneTime.count, fill: 'hsl(var(--chart-1))' },
    { name: 'Occasional', value: segments.occasional.count, fill: 'hsl(var(--chart-2))' },
    { name: 'Regular', value: segments.regular.count, fill: 'hsl(var(--chart-3))' },
    { name: 'VIP', value: segments.vip.count, fill: 'hsl(var(--chart-4))' },
  ];

  const chartConfig = {
    oneTime: { label: 'One-Time', color: 'hsl(var(--chart-1))' },
    occasional: { label: 'Occasional', color: 'hsl(var(--chart-2))' },
    regular: { label: 'Regular', color: 'hsl(var(--chart-3))' },
    vip: { label: 'VIP', color: 'hsl(var(--chart-4))' },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
