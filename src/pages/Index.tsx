import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { AWRUpload } from "@/components/AWRUpload";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { SQLAnalysis } from "@/components/SQLAnalysis";
import { useToast } from "@/hooks/use-toast";
import awrLogo from "@/assets/awr-logo.png";

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

const Index = () => {
  const [awrData, setAWRData] = useState<AWRData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    
    try {
      // Simular processamento do AWR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock data baseado no exemplo fornecido
      const mockData: AWRData = {
        topSQL: [
          {
            sql_id: "fh1c4w9qda6jr",
            plan_hash: "3666371265",
            executions: 4,
            activity_pct: 3.10,
            event: "CPU + Wait for CPU",
            event_pct: 3.10,
            row_source: "TABLE ACCESS - FULL",
            row_source_pct: 2.33,
            sql_text: "SELECT TC.s_Name AS ISSUERCOUN..."
          },
          {
            sql_id: "gg1uzdcuth7yt", 
            plan_hash: "3385703921",
            executions: 4,
            activity_pct: 3.10,
            event: "PGA memory operation",
            event_pct: 3.13,
            row_source: "HASH JOIN",
            row_source_pct: 1.55,
            sql_text: "select a.id_msg_type as ID_MSG..."
          },
          {
            sql_id: "3zf7vbnbdgyz",
            plan_hash: "2709980812", 
            executions: 3,
            activity_pct: 2.33,
            event: "CPU + Wait for CPU",
            event_pct: 2.33,
            row_source: "TABLE ACCESS - FULL",
            row_source_pct: 1.55,
            sql_text: "SELECT * from (SELECT A ACCOUN..."
          }
        ],
        summary: {
          total_sessions: 152,
          cpu_time: 1250000,
          db_time: 2100000,
          wait_events: 48
        }
      };

      setAWRData(mockData);
      
      toast({
        title: "AWR Processado com Sucesso!",
        description: "Análise de performance concluída. Verifique os resultados abaixo."
      });
    } catch (error) {
      toast({
        title: "Erro no Processamento",
        description: "Falha ao processar arquivo AWR. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <img 
              src={awrLogo} 
              alt="Oracle AWR Analyzer Logo" 
              className="h-16 w-16 object-contain"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-oracle-blue bg-clip-text text-transparent">
              Oracle AWR Analyzer
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ferramenta interna para análise rápida de relatórios AWR, identificando gargalos de performance sem precisar aguardar um DBA
          </p>
        </div>

        {/* Upload Section */}
        {!awrData && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload do Relatório AWR
              </CardTitle>
              <CardDescription>
                Faça upload do seu arquivo AWR (.html, .txt) para iniciar a análise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AWRUpload onFileSelect={handleFileUpload} isAnalyzing={isAnalyzing} />
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {awrData && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{awrData.summary.total_sessions}</div>
                  <p className="text-xs text-muted-foreground">Sessions ativas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">DB Time</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(awrData.summary.db_time / 1000000).toFixed(2)}s</div>
                  <p className="text-xs text-muted-foreground">Tempo total do banco</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(awrData.summary.cpu_time / 1000000).toFixed(2)}s</div>
                  <p className="text-xs text-muted-foreground">Tempo de CPU</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wait Events</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{awrData.summary.wait_events}</div>
                  <p className="text-xs text-muted-foreground">Eventos de espera</p>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Tabs */}
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="sql-analysis">Análise SQL</TabsTrigger>
                <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard" className="space-y-4">
                <PerformanceDashboard data={awrData} />
              </TabsContent>
              
              <TabsContent value="sql-analysis" className="space-y-4">
                <SQLAnalysis sqlData={awrData.topSQL} />
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recomendações de Otimização</CardTitle>
                    <CardDescription>Sugestões baseadas na análise do AWR</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="destructive">Crítico</Badge>
                        <div>
                          <p className="font-medium">Table Full Scan Detectado</p>
                          <p className="text-sm text-muted-foreground">
                            SQLs com TABLE ACCESS - FULL estão consumindo 2.33% do DB Time. Considere criar índices apropriados.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="bg-warning text-warning-foreground">Alta</Badge>
                        <div>
                          <p className="font-medium">CPU + Wait for CPU</p>
                          <p className="text-sm text-muted-foreground">
                            Alto uso de CPU detectado. Verifique se há consultas que podem ser otimizadas ou se é necessário mais recursos de CPU.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="bg-performance-medium text-black">Média</Badge>
                        <div>
                          <p className="font-medium">PGA Memory Operation</p>
                          <p className="text-sm text-muted-foreground">
                            Operações de memória PGA podem ser otimizadas ajustando parâmetros de memória.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* New Analysis Button */}
            <div className="text-center">
              <Button 
                onClick={() => setAWRData(null)}
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Analisar Novo AWR
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Index;