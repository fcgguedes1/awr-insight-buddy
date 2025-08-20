import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, Clock, TrendingDown, ExternalLink } from "lucide-react";

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
  onSQLClick: (sqlId: string) => void;
}

export const PerformanceDashboard = ({ data, onSQLClick }: PerformanceDashboardProps) => {
  // Preparar dados para análise de eventos
  const eventSummary = data.topSQL.reduce((acc, sql) => {
    const existing = acc.find(item => item.event === sql.event);
    if (existing) {
      existing.total_pct += sql.event_pct;
      existing.count += 1;
      existing.avg_pct = existing.total_pct / existing.count;
    } else {
      acc.push({
        event: sql.event,
        total_pct: sql.event_pct,
        count: 1,
        avg_pct: sql.event_pct
      });
    }
    return acc;
  }, [] as Array<{ event: string; total_pct: number; count: number; avg_pct: number }>)
  .sort((a, b) => b.total_pct - a.total_pct);

  const getPerformanceLevel = (percentage: number) => {
    if (percentage > 3) return { level: "Crítico", color: "destructive" };
    if (percentage > 2) return { level: "Alto", color: "warning" };
    if (percentage > 1) return { level: "Médio", color: "secondary" };
    return { level: "Baixo", color: "success" };
  };

  return (
    <div className="space-y-6">
      {/* Eventos Mais Impactantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Eventos Mais Impactantes
          </CardTitle>
          <CardDescription>
            Eventos que mais impactam a performance do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eventSummary.slice(0, 8).map((event, index) => (
              <div key={event.event} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.count} SQL{event.count !== 1 ? 's' : ''} afetado{event.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{event.total_pct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-medium">{sql.sql_id}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSQLClick(sql.sql_id)}
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                              title="Ver detalhes na Análise SQL"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
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