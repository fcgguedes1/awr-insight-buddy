import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Database, Clock, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter } from "recharts";

interface AWRData {
  topSQL: Array<{
    sql_id: string;
    plan_hash: string;
    executions: number;
    activity_pct: number;
    event: string;
    event_pct: number;
    row_source: string;
    row_source_pct: number;
    sql_text: string;
  }>;
  summary: {
    total_sessions: number;
    cpu_time: number;
    db_time: number;
    wait_events: number;
  };
}

interface PerformanceDashboardProps {
  data: AWRData;
}

export const PerformanceDashboard = ({ data }: PerformanceDashboardProps) => {
  // Preparar dados para gráfico de barras
  const topSQLChart = data.topSQL
    .sort((a, b) => b.activity_pct - a.activity_pct)
    .slice(0, 10)
    .map(sql => ({
      sql_id: sql.sql_id.substring(0, 8) + "...",
      activity_pct: sql.activity_pct,
      event_pct: sql.event_pct,
      executions: sql.executions
    }));

  // Preparar dados para distribuição de eventos
  const eventData = data.topSQL.reduce((acc, sql) => {
    const existing = acc.find(item => item.event === sql.event);
    if (existing) {
      existing.value += sql.event_pct;
      existing.count += 1;
    } else {
      acc.push({
        event: sql.event,
        value: sql.event_pct,
        count: 1
      });
    }
    return acc;
  }, [] as Array<{ event: string; value: number; count: number }>)
  .sort((a, b) => b.value - a.value);

  // Preparar dados para gráfico de correlação atividade x execuções
  const correlationData = data.topSQL
    .filter(sql => sql.executions > 0 && sql.activity_pct > 0)
    .map(sql => ({
      sql_id: sql.sql_id.substring(0, 6),
      executions: sql.executions,
      activity_pct: sql.activity_pct,
      efficiency: sql.activity_pct / Math.max(sql.executions, 1) * 1000 // Atividade por mil execuções
    }));

  // Preparar dados para tendência de performance por SQL
  const performanceTrendData = data.topSQL
    .sort((a, b) => b.activity_pct - a.activity_pct)
    .slice(0, 5)
    .map((sql, index) => ({
      rank: index + 1,
      sql_id: sql.sql_id.substring(0, 8),
      activity_pct: sql.activity_pct,
      event_pct: sql.event_pct,
      executions_k: Math.round(sql.executions / 1000)
    }));

  // Paleta de cores usando tokens do design system
  const COLORS = [
    'hsl(var(--chart-1))', 
    'hsl(var(--chart-2))', 
    'hsl(var(--chart-3))', 
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
    'hsl(var(--chart-7))',
    'hsl(var(--chart-8))'
  ];

  const getPerformanceLevel = (percentage: number) => {
    if (percentage > 3) return { level: "Crítico", color: "destructive" };
    if (percentage > 2) return { level: "Alto", color: "warning" };
    if (percentage > 1) return { level: "Médio", color: "secondary" };
    return { level: "Baixo", color: "success" };
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview - Grid com 4 gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Top SQL por Atividade
            </CardTitle>
            <CardDescription>Top 10 SQLs que mais consomem recursos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSQLChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                <XAxis 
                  dataKey="sql_id" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))"
                  }}
                  formatter={(value, name) => [
                    `${value}%`, 
                    name === 'activity_pct' ? 'DB Activity' : 'Event %'
                  ]}
                />
                <Bar dataKey="activity_pct" fill="hsl(var(--primary))" name="DB Activity" />
                <Bar dataKey="event_pct" fill="hsl(var(--oracle-red))" name="Event %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Distribuição de Eventos
            </CardTitle>
            <CardDescription>Tipos de eventos que estão causando esperas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({event, value}) => value > 2 ? `${event.substring(0, 15)}: ${value.toFixed(1)}%` : ''}
                >
                  {eventData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${typeof value === 'number' ? value.toFixed(2) : value}%`, 'Tempo de Espera']}
                  labelFormatter={(label) => `Evento: ${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Correlação: Atividade x Execuções
            </CardTitle>
            <CardDescription>Relação entre execuções e impacto na performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={correlationData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                <XAxis 
                  type="number" 
                  dataKey="executions" 
                  name="Execuções"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  type="number" 
                  dataKey="activity_pct" 
                  name="DB Activity %"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">SQL: {data.sql_id}</p>
                          <p className="text-sm">Execuções: {data.executions.toLocaleString()}</p>
                          <p className="text-sm">DB Activity: {data.activity_pct}%</p>
                          <p className="text-sm">Eficiência: {data.efficiency.toFixed(2)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="activity_pct" fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Performance Ranking
            </CardTitle>
            <CardDescription>Top 5 SQLs ordenados por impacto</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                <XAxis 
                  dataKey="rank" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))"
                  }}
                  labelFormatter={(value) => `Ranking: #${value}`}
                  formatter={(value, name, props) => [
                    `${value}${typeof name === 'string' && name.includes('executions') ? 'k' : '%'}`, 
                    name === 'activity_pct' ? 'DB Activity' : 
                    name === 'event_pct' ? 'Event %' : 'Execuções (k)'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="activity_pct" 
                  stackId="1"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                  name="activity_pct"
                />
                <Area 
                  type="monotone" 
                  dataKey="event_pct" 
                  stackId="1"
                  stroke="hsl(var(--oracle-red))" 
                  fill="hsl(var(--oracle-red))" 
                  fillOpacity={0.6}
                  name="event_pct"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Offenders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            SQL IDs Mais Problemáticos
          </CardTitle>
          <CardDescription>
            Lista dos SQLs que mais impactam a performance, ordenados por % de atividade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topSQL
              .sort((a, b) => b.activity_pct - a.activity_pct)
              .slice(0, 5)
              .map((sql, index) => {
                const perfLevel = getPerformanceLevel(sql.activity_pct);
                
                return (
                  <div key={sql.sql_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium">{sql.sql_id}</p>
                          <p className="text-xs text-muted-foreground">Plan Hash: {sql.plan_hash}</p>
                        </div>
                      </div>
                      <Badge variant={perfLevel.color as any}>
                        {perfLevel.level}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Atividade</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(sql.activity_pct / 5) * 100} className="flex-1" />
                          <span className="text-sm font-medium">{sql.activity_pct}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Evento Principal</p>
                        <p className="text-sm">{sql.event}</p>
                        <p className="text-xs text-muted-foreground">{sql.event_pct}% do tempo</p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Row Source</p>
                        <p className="text-sm">{sql.row_source}</p>
                        <p className="text-xs text-muted-foreground">{sql.row_source_pct}% do tempo</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">SQL Text</p>
                      <p className="text-sm font-mono bg-muted p-2 rounded text-muted-foreground">
                        {sql.sql_text}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {sql.executions} execuções
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};