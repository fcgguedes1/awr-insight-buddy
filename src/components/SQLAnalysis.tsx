import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Database, Clock, AlertCircle } from "lucide-react";

interface SQLData {
  sql_id: string;
  plan_hash: string;
  executions: number;
  activity_pct: number;
  event: string;
  event_pct: number;
  row_source: string;
  row_source_pct: number;
  sql_text: string;
}

interface SQLAnalysisProps {
  sqlData: SQLData[];
}

export const SQLAnalysis = ({ sqlData }: SQLAnalysisProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSQL, setSelectedSQL] = useState<SQLData | null>(null);

  const filteredData = sqlData.filter(sql =>
    sql.sql_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sql.sql_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sql.event.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (activityPct: number) => {
    if (activityPct >= 3) return "destructive";
    if (activityPct >= 2) return "default";
    if (activityPct >= 1) return "secondary";
    return "outline";
  };

  const getRecommendation = (sql: SQLData) => {
    const recommendations = [];
    
    if (sql.row_source.includes("TABLE ACCESS - FULL")) {
      recommendations.push({
        type: "Índice",
        description: "Considere criar índices para evitar full table scans",
        priority: "Alta"
      });
    }
    
    if (sql.event.includes("CPU")) {
      recommendations.push({
        type: "CPU",
        description: "SQL consumindo muito CPU - verifique joins e filtros",
        priority: "Alta"
      });
    }
    
    if (sql.row_source.includes("HASH JOIN")) {
      recommendations.push({
        type: "Join",
        description: "Hash join pode ser otimizado com índices apropriados",
        priority: "Média"
      });
    }

    if (sql.executions > 10) {
      recommendations.push({
        type: "Frequência",
        description: "SQL executado frequentemente - considere cache ou otimização",
        priority: "Média"
      });
    }

    return recommendations;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar SQLs
          </CardTitle>
          <CardDescription>
            Pesquise por SQL ID, texto do SQL ou tipo de evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite SQL ID, texto ou evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* SQL Table */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada dos SQLs</CardTitle>
          <CardDescription>
            {filteredData.length} SQL{filteredData.length !== 1 ? 's' : ''} encontrado{filteredData.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SQL ID</TableHead>
                <TableHead>Atividade %</TableHead>
                <TableHead>Execuções</TableHead>
                <TableHead>Evento Principal</TableHead>
                <TableHead>Row Source</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((sql) => (
                <TableRow key={sql.sql_id}>
                  <TableCell>
                    <div className="font-mono text-sm">
                      <div>{sql.sql_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {sql.plan_hash}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(sql.activity_pct) as any}>
                      {sql.activity_pct}%
                    </Badge>
                  </TableCell>
                  <TableCell>{sql.executions}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{sql.event}</div>
                      <div className="text-xs text-muted-foreground">
                        {sql.event_pct}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{sql.row_source}</div>
                      <div className="text-xs text-muted-foreground">
                        {sql.row_source_pct}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSQL(sql)}
                    >
                      Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Analysis Modal/Card */}
      {selectedSQL && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Análise Detalhada - {selectedSQL.sql_id}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSQL(null)}
              >
                Fechar
              </Button>
            </CardTitle>
            <CardDescription>
              Análise completa e recomendações de otimização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Informações Básicas</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">SQL ID:</span> {selectedSQL.sql_id}</div>
                      <div><span className="text-muted-foreground">Plan Hash:</span> {selectedSQL.plan_hash}</div>
                      <div><span className="text-muted-foreground">Execuções:</span> {selectedSQL.executions}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Métricas de Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">% Atividade:</span> {selectedSQL.activity_pct}%</div>
                      <div><span className="text-muted-foreground">% Evento:</span> {selectedSQL.event_pct}%</div>
                      <div><span className="text-muted-foreground">% Row Source:</span> {selectedSQL.row_source_pct}%</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Impacto no Sistema
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {selectedSQL.activity_pct}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        do total de atividade do banco
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Evento Principal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {selectedSQL.event}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedSQL.event_pct}% do tempo de espera
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Operação Principal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {selectedSQL.row_source}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedSQL.row_source_pct}% do tempo de execução
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Texto do SQL</h4>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm">
                    {selectedSQL.sql_text}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-3">
                  {getRecommendation(selectedSQL).map((rec, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`h-5 w-5 mt-0.5 ${
                            rec.priority === 'Alta' ? 'text-destructive' : 
                            rec.priority === 'Média' ? 'text-warning' : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm">{rec.type}</h4>
                              <Badge variant={
                                rec.priority === 'Alta' ? 'destructive' : 
                                rec.priority === 'Média' ? 'default' : 'secondary'
                              }>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {getRecommendation(selectedSQL).length === 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center text-muted-foreground">
                          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma recomendação específica identificada para este SQL.</p>
                          <p className="text-sm mt-1">Performance parece estar dentro dos parâmetros normais.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};