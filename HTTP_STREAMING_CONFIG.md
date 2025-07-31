# Configuração Claude Desktop para HTTP Streaming

## 📡 **Opções de Configuração HTTP Streaming**

### **1. Via HTTP Transport (Recomendado)** ⭐

```json
{
  "mcpServers": {
    "weather-http": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-http", "https://weather-dev.cockpit.avanade.ai/mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### **2. Via cURL Wrapper (Alternativa)**

```json
{
  "mcpServers": {
    "weather-curl": {
      "command": "bash",
      "args": ["-c", "while read line; do curl -X POST -H 'Content-Type: application/json' -d \"$line\" https://weather-dev.cockpit.avanade.ai/mcp; done"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### **3. Para Desenvolvimento Local**

```json
{
  "mcpServers": {
    "weather-local-http": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-http", "http://localhost:8080/mcp"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### **4. Via Node.js HTTP Client (Custom)**

Crie um arquivo `http-client.js`:

```javascript
#!/usr/bin/env node
const http = require('http');
const https = require('https');

const baseUrl = 'https://weather-dev.cockpit.avanade.ai/mcp';

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(baseUrl, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(responseData);
      });
    });

    req.write(JSON.stringify(request));
    req.end();
  } catch (error) {
    console.error(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    }));
  }
});
```

Configuração no Claude Desktop:

```json
{
  "mcpServers": {
    "weather-custom": {
      "command": "node",
      "args": ["/path/to/http-client.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🔧 **Pré-requisitos**

### **Instalar Transport HTTP**

```bash
npm install -g @modelcontextprotocol/server-http
```

### **Verificar Conectividade**

```bash
# Testar endpoint MCP
curl -X POST https://weather-dev.cockpit.avanade.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'

# Testar health check
curl https://weather-dev.cockpit.avanade.ai/health
```

## 🚀 **Deployment e Teste**

### **1. Build e Push da Nova Versão**

```bash
# Build da nova imagem com HTTP support
docker build -t wborges/mcp-weather:0.2 .
docker push wborges/mcp-weather:0.2
```

### **2. Atualizar Deployment Kubernetes**

```bash
# Atualizar imagem no deployment
kubectl set image deployment/weather-mcp weather-mcp=wborges/mcp-weather:0.2 -n pocs

# Verificar status
kubectl get pods -n pocs
kubectl logs -f deployment/weather-mcp -n pocs
```

### **3. Testar Endpoints**

```bash
# Testar MCP endpoint
curl -X POST https://weather-dev.cockpit.avanade.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_current_weather",
      "arguments": {
        "city": "São Paulo",
        "country": "BR",
        "units": "metric"
      }
    }
  }'

# Testar endpoint direto
curl -X POST https://weather-dev.cockpit.avanade.ai/weather/current \
  -H "Content-Type: application/json" \
  -d '{"city": "São Paulo", "country": "BR", "units": "metric"}'
```

## 📍 **Localização do Arquivo Claude Desktop**

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

## ✅ **Verificação**

Após configurar, teste no Claude Desktop:

```
Olá! Pode me dar a previsão do tempo para São Paulo?
```

## 🐛 **Troubleshooting**

### **Erro de CORS**
Adicione headers CORS no servidor:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### **Erro de SSL/TLS**
Para desenvolvimento, adicione:
```json
{
  "env": {
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  }
}
```

### **Timeout**
Aumente timeout:
```json
{
  "env": {
    "HTTP_TIMEOUT": "30000"
  }
}
```

## 🌐 **Endpoints Disponíveis**

- **MCP Principal:** `https://weather-dev.cockpit.avanade.ai/mcp`
- **Health Check:** `https://weather-dev.cockpit.avanade.ai/health`
- **Status:** `https://weather-dev.cockpit.avanade.ai/status`
- **Clima Atual:** `https://weather-dev.cockpit.avanade.ai/weather/current`
- **Previsão:** `https://weather-dev.cockpit.avanade.ai/weather/forecast`
- **Por Coordenadas:** `https://weather-dev.cockpit.avanade.ai/weather/coordinates`

## 📊 **Exemplo de Resposta MCP**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"location\":{\"city\":\"São Paulo\",\"country\":\"BR\"},\"current\":{\"temperature\":25.3,\"description\":\"céu limpo\"}}"
      }
    ]
  }
}
``` 