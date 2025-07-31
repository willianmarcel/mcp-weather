# Configuração MCP HTTP Streaming - Weather Server

## Instalação dos Pacotes Necessários

Primeiro, instale o pacote global necessário:

```bash
npm install -g mcp-remote
```

## Claude Desktop

### 1. Localização do Arquivo de Configuração

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Configuração

Abra o arquivo `claude_desktop_config.json` e adicione a seguinte configuração:

```json
{
  "mcpServers": {
    "weather-mcp-production": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://weather-dev.cockpit.avanade.ai/mcp"
      ]
    },
    "weather-mcp-local": {
      "command": "npx",
      "args": [
        "-y", 
        "mcp-remote",
        "http://localhost:8000/mcp"
      ]
    }
  }
}
```

### 3. Reiniciar o Claude Desktop

Após salvar o arquivo, feche completamente o Claude Desktop e abra novamente.

### 4. Verificar Funcionamento

No Claude Desktop, você deve ver um ícone de ferramenta no canto inferior direito. Você pode testar com comandos como:
- "Liste as ferramentas disponíveis"
- "Qual o clima em São Paulo?"

## Cursor IDE

### 1. Abrir Configurações MCP

No Cursor:
1. Pressione `Ctrl/Cmd + Shift + P`
2. Digite "MCP: Configure"
3. Selecione "MCP: Configure Model Context Protocol"

### 2. Adicionar Servidor

Adicione a seguinte configuração:

```json
{
  "weather-mcp": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote", 
      "https://weather-dev.cockpit.avanade.ai/mcp"
    ]
  }
}
```

### 3. Reiniciar Cursor

Reinicie o Cursor após salvar a configuração.

## Ferramentas Disponíveis

O servidor oferece as seguintes ferramentas:

### 1. `get_current_weather`
- **Descrição**: Obtém dados climáticos atuais para uma cidade
- **Parâmetros**:
  - `city` (obrigatório): Nome da cidade
  - `country` (opcional): Código do país (ex: BR)
  - `units` (opcional): metric, imperial, standard

### 2. `get_weather_forecast`
- **Descrição**: Obtém previsão do tempo para 5 dias
- **Parâmetros**: Mesmos de `get_current_weather`

### 3. `get_weather_by_coordinates`
- **Descrição**: Obtém dados climáticos usando coordenadas geográficas
- **Parâmetros**:
  - `lat` (obrigatório): Latitude
  - `lon` (obrigatório): Longitude
  - `units` (opcional): metric, imperial, standard

## Endpoints HTTP Diretos

Além do MCP, o servidor também oferece endpoints HTTP diretos:

- **GET** `/weather/current?city=SaoPaulo&country=BR&units=metric`
- **GET** `/weather/forecast?city=SaoPaulo&country=BR&units=metric`
- **GET** `/weather/coordinates?lat=-23.5505&lon=-46.6333&units=metric`

## Testes

Para testar se está funcionando, você pode usar:

```bash
# Teste direto do endpoint MCP
curl -X POST https://weather-dev.cockpit.avanade.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'

# Teste do endpoint HTTP direto
curl "https://weather-dev.cockpit.avanade.ai/weather/current?city=SaoPaulo&country=BR&units=metric"
```

## Solução de Problemas

### 1. Claude Desktop não mostra ferramentas
- Verifique se o arquivo de configuração tem JSON válido
- Certifique-se de que o Claude Desktop foi completamente reiniciado
- Verifique se o pacote `mcp-remote` está instalado globalmente

### 2. Cursor não conecta
- Verifique se a configuração MCP está salva corretamente
- Reinicie o Cursor completamente
- Verifique a aba de saída (Output) para logs de erro

### 3. Erro de conectividade
- Teste o endpoint diretamente com curl
- Verifique se não há bloqueios de firewall
- Para desenvolvimento local, certifique-se de que o servidor está rodando na porta 8000

### 4. Verificar instalação do mcp-remote
```bash
npm list -g mcp-remote
```

Se não estiver instalado:
```bash
npm install -g mcp-remote
```

## Comandos de Exemplo

Uma vez configurado, você pode usar comandos como:

- "Qual o clima atual em São Paulo?"
- "Me dê a previsão do tempo para Londres nos próximos 5 dias"
- "Como está o tempo nas coordenadas -23.5505, -46.6333?"
- "Liste todas as ferramentas de clima disponíveis" 