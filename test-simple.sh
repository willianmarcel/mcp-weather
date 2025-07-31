#!/bin/bash

echo "🧪 Teste Simples do MCP Weather Server"
echo "========================================"

echo ""
echo "📋 1. Testando listagem de ferramentas:"
cat test-requests/list-tools.json | npx tsx src/index.ts 2>/dev/null | jq . 2>/dev/null || echo "Resposta recebida (sem formatação JSON)"

echo ""
echo "📋 2. Testando listagem de recursos:"
cat test-requests/list-resources.json | npx tsx src/index.ts 2>/dev/null | jq . 2>/dev/null || echo "Resposta recebida (sem formatação JSON)"

echo ""
echo "📋 3. Testando clima atual - São Paulo:"
cat test-requests/weather-sao-paulo.json | npx tsx src/index.ts 2>/dev/null | jq . 2>/dev/null || echo "Resposta recebida (sem formatação JSON)"

echo ""
echo "✅ Teste concluído!" 