interface ParsedAWRData {
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

export class AWRParser {
  static async parseFile(file: File): Promise<ParsedAWRData> {
    const content = await this.readFileContent(file);
    
    if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
      return this.parseHTMLContent(content);
    } else {
      return this.parseTextContent(content);
    }
  }

  private static readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    });
  }

  private static parseHTMLContent(content: string): ParsedAWRData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Extrair SQL texts primeiro
    const sqlTexts = this.extractSQLTexts(doc);
    
    return {
      topSQL: this.extractTopSQL(doc, sqlTexts),
      summary: this.extractSummary(doc)
    };
  }

  private static parseTextContent(content: string): ParsedAWRData {
    const lines = content.split('\n');
    
    // Extrair SQL texts primeiro
    const sqlTexts = this.extractSQLTextsFromText(lines);
    
    return {
      topSQL: this.extractTopSQLFromText(lines, sqlTexts),
      summary: this.extractSummaryFromText(lines)
    };
  }

  private static extractSQLTexts(doc: Document): Map<string, string> {
    const sqlTexts = new Map<string, string>();
    
    // Procurar por seções que contêm o texto SQL completo
    const text = doc.body.textContent || '';
    const lines = text.split('\n');
    
    let currentSqlId = '';
    let isInSqlSection = false;
    let sqlBuffer: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Identificar SQL ID
      const sqlIdMatch = trimmedLine.match(/^([a-z0-9]{13})\s/);
      if (sqlIdMatch) {
        // Salvar SQL anterior se existir
        if (currentSqlId && sqlBuffer.length > 0) {
          sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
        }
        
        currentSqlId = sqlIdMatch[1];
        sqlBuffer = [];
        isInSqlSection = false;
      }
      
      // Detectar início de SQL text
      if (trimmedLine.toLowerCase().includes('select') || 
          trimmedLine.toLowerCase().includes('insert') || 
          trimmedLine.toLowerCase().includes('update') || 
          trimmedLine.toLowerCase().includes('delete') ||
          trimmedLine.toLowerCase().includes('with')) {
        isInSqlSection = true;
        sqlBuffer = [trimmedLine];
      } else if (isInSqlSection && currentSqlId) {
        if (trimmedLine.length > 0 && 
            !trimmedLine.match(/^-+$/) && 
            !trimmedLine.match(/^\d+\.\d+/) &&
            !trimmedLine.toLowerCase().includes('plan hash')) {
          sqlBuffer.push(trimmedLine);
        } else if (trimmedLine.length === 0 || trimmedLine.match(/^-+$/)) {
          // Fim do SQL
          isInSqlSection = false;
          if (sqlBuffer.length > 0) {
            sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
          }
        }
      }
    }
    
    // Salvar último SQL se existir
    if (currentSqlId && sqlBuffer.length > 0) {
      sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
    }
    
    return sqlTexts;
  }

  private static extractSQLTextsFromText(lines: string[]): Map<string, string> {
    const sqlTexts = new Map<string, string>();
    
    let currentSqlId = '';
    let isInSqlSection = false;
    let sqlBuffer: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Identificar SQL ID
      const sqlIdMatch = trimmedLine.match(/^([a-z0-9]{13})\s/);
      if (sqlIdMatch) {
        // Salvar SQL anterior se existir
        if (currentSqlId && sqlBuffer.length > 0) {
          sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
        }
        
        currentSqlId = sqlIdMatch[1];
        sqlBuffer = [];
        isInSqlSection = false;
      }
      
      // Detectar início de SQL text
      if (trimmedLine.toLowerCase().includes('select') || 
          trimmedLine.toLowerCase().includes('insert') || 
          trimmedLine.toLowerCase().includes('update') || 
          trimmedLine.toLowerCase().includes('delete') ||
          trimmedLine.toLowerCase().includes('with')) {
        isInSqlSection = true;
        sqlBuffer = [trimmedLine];
      } else if (isInSqlSection && currentSqlId) {
        if (trimmedLine.length > 0 && 
            !trimmedLine.match(/^-+$/) && 
            !trimmedLine.match(/^\d+\.\d+/) &&
            !trimmedLine.toLowerCase().includes('plan hash')) {
          sqlBuffer.push(trimmedLine);
        } else if (trimmedLine.length === 0 || trimmedLine.match(/^-+$/)) {
          // Fim do SQL
          isInSqlSection = false;
          if (sqlBuffer.length > 0) {
            sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
          }
        }
      }
    }
    
    // Salvar último SQL se existir
    if (currentSqlId && sqlBuffer.length > 0) {
      sqlTexts.set(currentSqlId, sqlBuffer.join(' ').trim());
    }
    
    return sqlTexts;
  }

  private static extractTopSQL(doc: Document, sqlTexts?: Map<string, string>): ParsedAWRData['topSQL'] {
    const topSQL: ParsedAWRData['topSQL'] = [];
    
    // Procurar por tabelas de Top SQL
    const tables = doc.querySelectorAll('table');
    
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim().toLowerCase() || '');
      
      // Identificar tabela de Top SQL por cabeçalhos típicos
      if (headers.some(h => h.includes('sql id') || h.includes('sql_id')) ||
          headers.some(h => h.includes('activity') || h.includes('% activity'))) {
        
        const rows = table.querySelectorAll('tbody tr');
        
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          
          if (cells.length >= 4) {
            const sqlData = this.extractSQLDataFromRow(headers, cells, sqlTexts);
            if (sqlData) {
              topSQL.push(sqlData);
            }
          }
        }
      }
    }
    
    return topSQL.slice(0, 10); // Limitar a 10 SQLs principais
  }

  private static extractSQLDataFromRow(headers: string[], cells: string[], sqlTexts?: Map<string, string>): ParsedAWRData['topSQL'][0] | null {
    try {
      const findColumnValue = (patterns: string[]): string => {
        for (const pattern of patterns) {
          const index = headers.findIndex(h => h.includes(pattern));
          if (index !== -1 && cells[index]) {
            return cells[index];
          }
        }
        return '';
      };

      const sqlId = findColumnValue(['sql id', 'sql_id', 'sqlid']);
      const planHash = findColumnValue(['plan hash', 'plan_hash', 'planhash']) || '0';
      const executions = findColumnValue(['executions', 'exec', 'execs']);
      const activity = findColumnValue(['activity', '% activity', 'act%', '%act']);
      const event = findColumnValue(['top event', 'event', 'wait event', 'top wait event']);
      const rowSource = findColumnValue(['row source', 'rowsource', 'operation']);

      if (!sqlId) return null;

      const sqlText = sqlTexts?.get(sqlId) || `SQL ID: ${sqlId} - Text extracted from AWR`;

      return {
        sql_id: sqlId,
        plan_hash: planHash,
        executions: parseInt(executions.replace(/,/g, '')) || 0,
        activity_pct: parseFloat(activity.replace('%', '')) || 0,
        event: event || 'CPU + Wait for CPU',
        event_pct: parseFloat(activity.replace('%', '')) || 0,
        row_source: rowSource || 'Unknown',
        row_source_pct: parseFloat(activity.replace('%', '')) || 0,
        sql_text: sqlText
      };
    } catch (error) {
      console.error('Erro ao extrair dados da linha SQL:', error);
      return null;
    }
  }

  private static extractSummary(doc: Document): ParsedAWRData['summary'] {
    const summary = {
      total_sessions: 0,
      cpu_time: 0,
      db_time: 0,
      wait_events: 0
    };

    // Procurar na seção "Time Model Statistics" primeiro
    const tables = doc.querySelectorAll('table');
    
    for (const table of tables) {
      const tableText = table.textContent || '';
      
      // Verificar se é a tabela de Time Model Statistics
      if (tableText.includes('Time Model Statistics') || 
          tableText.includes('DB time') || 
          tableText.includes('DB Time')) {
        
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '');
          
          // Procurar por DB Time
          if (cells.some(cell => cell.toLowerCase().includes('db time'))) {
            // Procurar por valores numéricos nas células
            for (const cell of cells) {
              const timeMatch = cell.match(/([0-9,]+\.?[0-9]*)\s*s/i) || cell.match(/([0-9,]+\.?[0-9]*)/);
              if (timeMatch && parseFloat(timeMatch[1].replace(/,/g, '')) > 0) {
                summary.db_time = parseFloat(timeMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
          
          // Procurar por CPU Time
          if (cells.some(cell => cell.toLowerCase().includes('cpu time') || cell.toLowerCase().includes('cpu used'))) {
            for (const cell of cells) {
              const timeMatch = cell.match(/([0-9,]+\.?[0-9]*)\s*s/i) || cell.match(/([0-9,]+\.?[0-9]*)/);
              if (timeMatch && parseFloat(timeMatch[1].replace(/,/g, '')) > 0) {
                summary.cpu_time = parseFloat(timeMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
        }
      }
      
      // Procurar por informações de Sessions em outras tabelas
      if (tableText.includes('Instance Efficiency') || 
          tableText.includes('Load Profile')) {
        
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '');
          
          if (cells.some(cell => cell.toLowerCase().includes('sessions') || cell.toLowerCase().includes('user calls'))) {
            for (const cell of cells) {
              const sessionMatch = cell.match(/([0-9,]+)/);
              if (sessionMatch && parseInt(sessionMatch[1].replace(/,/g, '')) > 0) {
                summary.total_sessions = parseInt(sessionMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
        }
      }
    }

    // Fallback: procurar no texto geral se não encontrou nas tabelas
    if (summary.db_time === 0 || summary.cpu_time === 0) {
      const text = doc.body.textContent || '';
      
      // Padrões mais específicos para DB Time
      const dbTimePatterns = [
        /DB Time[:\s]+([0-9,.]+)\s*s/i,
        /DB time[:\s]+([0-9,.]+)\s*s/i,
        /Database Time[:\s]+([0-9,.]+)\s*s/i,
        /Total Database Time[:\s]+([0-9,.]+)\s*s/i
      ];
      
      for (const pattern of dbTimePatterns) {
        const match = text.match(pattern);
        if (match && summary.db_time === 0) {
          summary.db_time = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Padrões para CPU Time
      const cpuTimePatterns = [
        /CPU Time[:\s]+([0-9,.]+)\s*s/i,
        /CPU time[:\s]+([0-9,.]+)\s*s/i,
        /CPU used by this session[:\s]+([0-9,.]+)\s*s/i
      ];
      
      for (const pattern of cpuTimePatterns) {
        const match = text.match(pattern);
        if (match && summary.cpu_time === 0) {
          summary.cpu_time = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
    }

    // Contar eventos de espera únicos
    let waitEventCount = 0;
    
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim().toLowerCase() || '');
      
      if (headers.some(h => (h.includes('wait') && h.includes('event')) || h.includes('top 5 timed events'))) {
        const rows = table.querySelectorAll('tbody tr');
        waitEventCount = Math.max(waitEventCount, rows.length);
      }
    }
    
    summary.wait_events = waitEventCount || 0;

    return summary;
  }

  private static extractTopSQLFromText(lines: string[], sqlTexts?: Map<string, string>): ParsedAWRData['topSQL'] {
    const topSQL: ParsedAWRData['topSQL'] = [];
    let inTopSQLSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Identificar seção de Top SQL
      if (line.toLowerCase().includes('top sql') || 
          line.toLowerCase().includes('sql ordered by')) {
        inTopSQLSection = true;
        continue;
      }
      
      // Sair da seção se encontrar nova seção
      if (inTopSQLSection && line.match(/^[A-Z\s]+:/) && !line.toLowerCase().includes('sql')) {
        inTopSQLSection = false;
      }
      
      if (inTopSQLSection && line.match(/^\s*[a-z0-9]{13}\s+/)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const sqlId = parts[0];
          const sqlText = sqlTexts?.get(sqlId) || `SQL ID: ${sqlId} - Text extracted from AWR`;
          
          const sqlData = {
            sql_id: sqlId,
            plan_hash: parts[1] || '0',
            executions: parseInt(parts[2]) || 0,
            activity_pct: parseFloat(parts[3]) || 0,
            event: 'CPU + Wait for CPU',
            event_pct: parseFloat(parts[3]) || 0,
            row_source: 'Unknown',
            row_source_pct: parseFloat(parts[3]) || 0,
            sql_text: sqlText
          };
          
          topSQL.push(sqlData);
        }
      }
    }
    
    return topSQL.slice(0, 10);
  }

  private static extractSummaryFromText(lines: string[]): ParsedAWRData['summary'] {
    const summary = {
      total_sessions: 0,
      cpu_time: 0,
      db_time: 0,
      wait_events: 0
    };

    const text = lines.join(' ');
    
    // Padrões mais específicos para extrair métricas do texto
    const dbTimePatterns = [
      /DB Time[:\s]+([0-9,.]+)\s*s/i,
      /DB time[:\s]+([0-9,.]+)\s*s/i,
      /Database Time[:\s]+([0-9,.]+)\s*s/i,
      /Total Database Time[:\s]+([0-9,.]+)\s*s/i
    ];
    
    for (const pattern of dbTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        summary.db_time = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    const cpuTimePatterns = [
      /CPU Time[:\s]+([0-9,.]+)\s*s/i,
      /CPU time[:\s]+([0-9,.]+)\s*s/i,
      /CPU used by this session[:\s]+([0-9,.]+)\s*s/i
    ];
    
    for (const pattern of cpuTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        summary.cpu_time = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    const sessionsPatterns = [
      /Sessions[:\s]+([0-9,]+)/i,
      /User calls[:\s]+([0-9,]+)/i,
      /Logical reads[:\s]+([0-9,]+)/i
    ];
    
    for (const pattern of sessionsPatterns) {
      const match = text.match(pattern);
      if (match) {
        summary.total_sessions = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }

    // Procurar por contagem de wait events no texto
    const waitEventMatches = text.match(/wait event/gi);
    summary.wait_events = waitEventMatches ? Math.min(waitEventMatches.length, 50) : 0;

    return summary;
  }
}