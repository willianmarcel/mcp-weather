# MCP Weather Server

Um servidor MCP (Model Context Protocol) para busca de dados climáticos com suporte a streaming HTTP, desenvolvido em TypeScript.

## 🚀 Características

- 🌤️ **Dados climáticos em tempo real** - Temperatura, umidade, pressão, vento e mais
- 📡 **Streaming HTTP** - Requisições assíncronas e eficientes
- 🗺️ **Múltiplas formas de busca** - Por cidade, país ou coordenadas geográficas
- 🔮 **Previsão do tempo** - Previsão para 5 dias com dados detalhados
- 🌍 **Suporte internacional** - Cidades em qualquer país
- 📊 **Dados estruturados** - Resposta em JSON bem formatado
- 🐳 **Docker ready** - Containerizado para fácil deploy
- ☸️ **Kubernetes ready** - Configurado para deploy no AKS
- 🔧 **Health checks** - Endpoints para monitoramento
- 📈 **Métricas** - Endpoint básico de métricas

## 📋 Pré-requisitos

- Node.js 18+
- Docker (para containerização)
- Azure CLI (para deploy no AKS)
- kubectl (para gerenciamento do Kubernetes)
- Chave da API OpenWeatherMap

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd mcp-weather
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure a API key
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com sua chave da API
nano .env
```

### 4. Obtenha uma chave da API OpenWeatherMap
1. Visite [OpenWeatherMap](https://openweathermap.org/api)
2. Crie uma conta gratuita
3. Gere uma API key
4. Configure no arquivo `.env`

## 🚀 Execução

### Desenvolvimento
```bash
# Executar em modo desenvolvimento
npm run dev

# Executar em modo watch
npm run watch
```

### Produção
```bash
# Build da aplicação
npm run build

# Executar em produção
npm start
```

### Docker
```bash
# Build da imagem
npm run docker:build

# Executar container
npm run docker:run

# Ou usar docker-compose
npm run docker:compose
```

## 🔧 Ferramentas MCP Disponíveis

### 1. get_current_weather
Obtém dados climáticos atuais para uma cidade.

**Parâmetros:**
- `city` (obrigatório): Nome da cidade
- `country` (opcional): Código do país (ex: "BR", "US")
- `units` (opcional): Unidade de medida ("metric", "imperial", "standard")

### 2. get_weather_forecast
Obtém previsão do tempo para 5 dias.

**Parâmetros:**
- `city` (obrigatório): Nome da cidade
- `country` (opcional): Código do país
- `units` (opcional): Unidade de medida

### 3. get_weather_by_coordinates
Obtém dados climáticos usando coordenadas geográficas.

**Parâmetros:**
- `lat` (obrigatório): Latitude
- `lon` (obrigatório): Longitude
- `units` (opcional): Unidade de medida

## 🧪 Teste

### Cliente de exemplo
```bash
# Executar todos os exemplos
npm run client

# Clima atual
npm run client current "São Paulo" "BR"

# Previsão do tempo
npm run client forecast "Rio de Janeiro" "BR"

# Por coordenadas
npm run client coords -23.5505 -46.6333

# Listar recursos e ferramentas
npm run client list
```

### Endpoints HTTP
```bash
# Health check
curl http://localhost:8080/health

# Status da aplicação
curl http://localhost:8080/status

# Métricas básicas
curl http://localhost:8080/metrics
```

## 📊 Recursos MCP

### weather://current
Recurso para acessar dados climáticos atuais.

### weather://forecast
Recurso para acessar previsões do tempo.

## 🐳 Deploy no Azure Kubernetes Service (AKS)

### Pré-requisitos
- Azure CLI instalado e configurado
- kubectl instalado
- Docker instalado
- Variáveis de ambiente configuradas

### Deploy automatizado
```bash
# Tornar script executável
chmod +x scripts/deploy-aks.sh

# Executar deploy
./scripts/deploy-aks.sh
```

### Deploy manual
```bash
# 1. Criar Resource Group
az group create --name rg-mcp-weather-poc --location brazilsouth

# 2. Criar ACR
az acr create --resource-group rg-mcp-weather-poc --name acrmcpweather --sku Basic

# 3. Criar cluster AKS
az aks create --resource-group rg-mcp-weather-poc --name aks-mcp-weather --attach-acr acrmcpweather

# 4. Obter credenciais
az aks get-credentials --resource-group rg-mcp-weather-poc --name aks-mcp-weather

# 5. Build e push da imagem
docker build -f deploy/Dockerfile -t acrmcpweather.azurecr.io/weather-mcp:latest .
docker push acrmcpweather.azurecr.io/weather-mcp:latest

# 6. Deploy no Kubernetes
kubectl apply -f deploy/aks-deployment.yaml
```

### Limpeza de recursos
```bash
# Executar script de limpeza
./scripts/cleanup-aks.sh
```

## 📝 Exemplo de Resposta

### Clima Atual
```json
{
  "location": {
    "city": "São Paulo",
    "country": "BR",
    "coordinates": {
      "lat": -23.5505,
      "lon": -46.6333
    }
  },
  "current": {
    "temperature": 22.5,
    "feels_like": 24.1,
    "humidity": 65,
    "pressure": 1013,
    "description": "céu limpo",
    "icon": "01d",
    "wind_speed": 3.2,
    "wind_direction": 180,
    "visibility": 10,
    "uv_index": 5
  },
  "units": "metric",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🔧 Configuração para Claude Desktop

Adicione ao arquivo de configuração do Claude:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/mcp-weather/dist/index.js"],
      "env": {
        "OPENWEATHERMAP_API_KEY": "sua_api_key"
      }
    }
  }
}
```

## 📁 Estrutura do Projeto

```
mcp-weather/
├── src/
│   ├── index.ts              # Servidor MCP principal
│   └── client.ts             # Cliente de exemplo
├── deploy/
│   ├── Dockerfile            # Dockerfile otimizado
│   ├── docker-compose.yml    # Docker Compose
│   └── aks-deployment.yaml   # Manifests Kubernetes
├── scripts/
│   ├── deploy-aks.sh         # Script de deploy AKS
│   └── cleanup-aks.sh        # Script de limpeza
├── tests/
│   └── (testes futuros)
├── package.json
├── tsconfig.json
└── README.md
```

## 🚨 Limitações da API

- **Plano Gratuito**: 1000 chamadas/mês, 60 chamadas/minuto
- **Dados históricos**: Limitados no plano gratuito
- **Resolução**: Dados atualizados a cada 10 minutos

## 🐛 Troubleshooting

### Problemas comuns

1. **Erro de API Key**
   ```bash
   # Verifique se a variável está configurada
   echo $OPENWEATHERMAP_API_KEY
   ```

2. **Erro de conectividade**
   ```bash
   # Teste a conectividade com a API
   curl "https://api.openweathermap.org/data/2.5/weather?q=London&appid=SUA_API_KEY"
   ```

3. **Problema com Docker**
   ```bash
   # Limpar containers e imagens
   docker system prune -a
   ```

4. **Problema com Kubernetes**
   ```bash
   # Verificar logs dos pods
   kubectl logs -f -n mcp-weather deployment/weather-mcp
   
   # Verificar eventos
   kubectl get events -n mcp-weather
   ```

## 📈 Monitoramento

### Métricas disponíveis
- Health check: `/health`
- Readiness: `/ready`
- Métricas: `/metrics`
- Status: `/status`

### Logs
```bash
# Logs do container
docker logs -f <container-id>

# Logs do Kubernetes
kubectl logs -f -n mcp-weather deployment/weather-mcp
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

## 🙏 Agradecimentos

- [OpenWeatherMap](https://openweathermap.org/) pela API de dados climáticos
- [Model Context Protocol](https://github.com/modelcontextprotocol) pela especificação
- [Azure Kubernetes Service](https://azure.microsoft.com/services/kubernetes-service/) pela plataforma

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!
