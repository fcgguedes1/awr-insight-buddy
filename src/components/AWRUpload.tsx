import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AWRUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
}

export const AWRUpload = ({ onFileSelect, isAnalyzing }: AWRUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        handleFileSelection(file);
      }
    },
    [onFileSelect]
  );

  const handleFileSelection = (file: File) => {
    const validTypes = ['.html', '.txt', '.htm'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      alert('Tipo de arquivo não suportado. Use apenas arquivos .html ou .txt');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="border-dashed border-2 border-primary/50">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Analisando AWR...</h3>
            <p className="text-muted-foreground">
              Processando relatório: {selectedFile?.name}
            </p>
          </div>
          <Progress value={75} className="w-full max-w-xs" />
          <p className="text-sm text-muted-foreground">
            Identificando SQLs problemáticos e eventos de espera
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-dashed border-2 border-muted-foreground/25 transition-colors cursor-pointer hover:border-primary/50",
          dragActive && "border-primary bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Upload className={cn(
            "h-12 w-12 text-muted-foreground transition-colors",
            dragActive && "text-primary"
          )} />
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              Arraste o arquivo AWR aqui
            </h3>
            <p className="text-muted-foreground">
              ou clique para selecionar arquivo
            </p>
          </div>

          <input
            type="file"
            id="file-upload"
            accept=".html,.txt,.htm"
            onChange={handleChange}
            className="hidden"
          />
          
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              <File className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </label>
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            <p>Formatos suportados: .html, .txt</p>
            <p>Tamanho máximo: 50MB</p>
          </div>
        </CardContent>
      </Card>

      {selectedFile && !isAnalyzing && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setSelectedFile(null)}
              variant="ghost"
              size="sm"
            >
              Remover
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};