#!/bin/bash

echo "🧪 Teste Manual do MCP Weather Server"
echo "======================================"
echo ""

# Função para testar uma chamada
test_call() {
    local test_file="$1"
    local description="$2"
    
    echo "📋 $description"
    echo "📨 Enviando: $(cat $test_file)"
    echo "📬 Resposta:"
    cat $test_file | npx tsx src/index.ts
    echo ""
    echo "---"
    echo ""
}

echo "🟢 Iniciando testes do MCP Weather Server..."
echo ""

test_call "test-requests/list-tools.json" "1. Listando ferramentas disponíveis"

test_call "test-requests/list-resources.json" "2. Listando recursos disponíveis"

test_call "test-requests/weather-sao-paulo.json" "3. Obtendo clima de São Paulo"

echo "✅ Testes concluídos!" 