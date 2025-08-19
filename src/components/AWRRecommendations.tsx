import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Database, Clock } from "lucide-react";

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

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sqlIds?: string[];
}

interface AWRRecommendationsProps {
  data: AWRData;
}

export const AWRRecommendations = ({ data }: AWRRecommendationsProps) => {
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    
    // Verificar se há dados válidos para análise
    if (!data.topSQL || data.topSQL.length === 0) {
      return recommendations;
    }
    
    // Analisar Table Full Scans - só adiciona se há SQLs com problema
    const fullScanSQLs = data.topSQL.filter(sql => 
      sql.sql_id && 
      sql.row_source && 
      sql.row_source.toLowerCase().includes('table access') && 
      sql.row_source.toLowerCase().includes('full') &&
      sql.activity_pct > 1 // Só considera se tem impacto significativo
    );
    
    if (fullScanSQLs.length > 0) {
      const totalFullScanActivity = fullScanSQLs.reduce((sum, sql) => sum + sql.activity_pct, 0);
      recommendations.push({
        priority: totalFullScanActivity > 5 ? 'critical' : 'high',
        title: 'Table Full Scan Detectado',
        description: `${fullScanSQLs.length} SQLs com TABLE ACCESS - FULL consumindo ${totalFullScanActivity.toFixed(2)}% do DB Time. Considere criar índices apropriados.`,
        icon: Database,
        sqlIds: fullScanSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    // Analisar CPU Usage - só adiciona se há SQLs com problema
    const cpuSQLs = data.topSQL.filter(sql => 
      sql.sql_id &&
      sql.event && 
      sql.event.toLowerCase().includes('cpu') &&
      sql.activity_pct > 2 // Só considera se tem impacto significativo
    );
    
    if (cpuSQLs.length > 0) {
      const totalCPUActivity = cpuSQLs.reduce((sum, sql) => sum + sql.activity_pct, 0);
      recommendations.push({
        priority: totalCPUActivity > 10 ? 'critical' : 'high',
        title: 'Alto Uso de CPU',
        description: `${cpuSQLs.length} SQLs consumindo CPU (${totalCPUActivity.toFixed(2)}% do DB Time). Verifique se há consultas que podem ser otimizadas.`,
        icon: TrendingUp,
        sqlIds: cpuSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    // Analisar PGA Memory Operations - só adiciona se há SQLs com problema
    const pgaSQLs = data.topSQL.filter(sql => 
      sql.sql_id &&
      sql.event &&
      (sql.event.toLowerCase().includes('pga') || 
       sql.event.toLowerCase().includes('memory')) &&
      sql.activity_pct > 1
    );
    
    if (pgaSQLs.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Operações de Memória PGA',
        description: `${pgaSQLs.length} SQLs com operações de memória PGA detectadas. Considere ajustar parâmetros de memória ou otimizar consultas.`,
        icon: AlertTriangle,
        sqlIds: pgaSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    // Analisar Hash Joins - só adiciona se há SQLs com problema
    const hashJoinSQLs = data.topSQL.filter(sql => 
      sql.sql_id &&
      sql.row_source &&
      sql.row_source.toLowerCase().includes('hash join') &&
      sql.activity_pct > 1
    );
    
    if (hashJoinSQLs.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Hash Joins Frequentes',
        description: `${hashJoinSQLs.length} SQLs usando HASH JOIN. Verifique se índices podem melhorar o desempenho destes joins.`,
        icon: Database,
        sqlIds: hashJoinSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    // Analisar execuções altas - só adiciona se há SQLs com problema
    const highExecSQLs = data.topSQL.filter(sql => 
      sql.sql_id && 
      sql.executions > 1000 &&
      sql.activity_pct > 1 // Só considera se tem impacto significativo
    );
    
    if (highExecSQLs.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'SQLs com Muitas Execuções',
        description: `${highExecSQLs.length} SQLs executados muito frequentemente. Considere cache de resultados ou otimização das consultas.`,
        icon: Clock,
        sqlIds: highExecSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    // Analisar Wait Events específicos - só adiciona se há SQLs com problema
    const waitEventSQLs = data.topSQL.filter(sql => 
      sql.sql_id &&
      sql.event &&
      sql.event.toLowerCase().includes('wait') &&
      sql.activity_pct > 2
    );
    
    if (waitEventSQLs.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Eventos de Espera Detectados',
        description: `${waitEventSQLs.length} SQLs com eventos de espera significativos. Investigue gargalos de I/O ou contenção de recursos.`,
        icon: Clock,
        sqlIds: waitEventSQLs.map(sql => sql.sql_id).filter(id => id)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const recommendations = generateRecommendations();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge className="bg-warning text-warning-foreground">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-performance-medium text-black">Média</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendações de Otimização</CardTitle>
        <CardDescription>
          Sugestões baseadas na análise do seu AWR específico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhuma recomendação crítica encontrada!</p>
              <p className="text-sm">Seu banco parece estar com boa performance.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <rec.icon className="h-5 w-5 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getPriorityBadge(rec.priority)}
                    <p className="font-medium">{rec.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {rec.description}
                  </p>
                  {rec.sqlIds && rec.sqlIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground">SQL IDs:</span>
                      {rec.sqlIds.slice(0, 3).map(sqlId => (
                        <Badge key={sqlId} variant="outline" className="text-xs">
                          {sqlId}
                        </Badge>
                      ))}
                      {rec.sqlIds.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{rec.sqlIds.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};