import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Database, Clock, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
  const topSQLChart = data.topSQL.map(sql => ({
    sql_id: sql.sql_id.substring(0, 8) + "...",
    activity_pct: sql.activity_pct,
    event_pct: sql.event_pct
  }));

  const eventData = data.topSQL.reduce((acc, sql) => {
    const existing = acc.find(item => item.event === sql.event);
    if (existing) {
      existing.value += sql.event_pct;
    } else {
      acc.push({
        event: sql.event,
        value: sql.event_pct
      });
    }
    return acc;
  }, [] as Array<{ event: string; value: number }>);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--oracle-red))', 'hsl(var(--warning))', 'hsl(var(--success))'];

  const getPerformanceLevel = (percentage: number) => {
    if (percentage > 3) return { level: "Crítico", color: "destructive" };
    if (percentage > 2) return { level: "Alto", color: "warning" };
    if (percentage > 1) return { level: "Médio", color: "secondary" };
    return { level: "Baixo", color: "success" };
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Top SQL por Atividade
            </CardTitle>
            <CardDescription>SQLs que mais consomem recursos do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSQLChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                <XAxis 
                  dataKey="sql_id" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="activity_pct" fill="hsl(var(--primary))" />
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
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({event, value}) => `${event}: ${value.toFixed(1)}%`}
                >
                  {eventData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
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