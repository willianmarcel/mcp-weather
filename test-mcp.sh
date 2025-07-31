#!/bin/bash

echo "🧪 Testando MCP Weather Server..."

# Função para testar uma chamada MCP
test_mcp_call() {
    local request="$1"
    local description="$2"
    
    echo "📋 $description"
    echo "$request" | npm run dev 2>/dev/null | head -20
    echo "---"
}

# Teste 1: Listar ferramentas
echo "📋 1. Listando ferramentas disponíveis:"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | npm run dev 2>/dev/null | head -10

echo ""
echo "📋 2. Listando recursos disponíveis:"
echo '{"jsonrpc": "2.0", "id": 2, "method": "resources/list", "params": {}}' | npm run dev 2>/dev/null | head -10

echo ""
echo "📋 3. Testando clima atual para São Paulo:"
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_current_weather", "arguments": {"city": "São Paulo", "country": "BR", "units": "metric"}}}' | npm run dev 2>/dev/null | head -20

echo ""
echo "✅ Testes concluídos!" 