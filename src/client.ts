#!/usr/bin/env node

/**
 * Exemplo de cliente MCP para testar o Weather Server
 * Este arquivo demonstra como conectar e usar o servidor MCP de clima
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class WeatherMCPClient {
  private client: Client;
  private transport?: StdioClientTransport;

  constructor() {
    // Configurar o cliente MCP
    this.client = new Client(
      {
        name: 'weather-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );
  }

  async connect(serverPath: string = './dist/index.js'): Promise<void> {
    console.log('🔌 Conectando ao Weather MCP Server...');
    
    // Spawnar o processo do servidor
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
      },
    });

    // Criar transporte stdio
    this.transport = new StdioClientTransport({
      readable: serverProcess.stdout!,
      writable: serverProcess.stdin!,
    });

    // Conectar cliente
    await this.client.connect(this.transport);
    console.log('✅ Conectado com sucesso!');
  }

  async listResources(): Promise<void> {
    console.log('\n📋 Listando recursos disponíveis...');
    
    try {
      const response = await this.client.request(
        { method: 'resources/list' },
        { method: 'resources/list', params: {} }
      );
      
      console.log('Recursos encontrados:');
      response.resources?.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.name} (${resource.uri})`);
        console.log(`     ${resource.description}`);
      });
    } catch (error) {
      console.error('❌ Erro ao listar recursos:', error);
    }
  }

  async listTools(): Promise<void> {
    console.log('\n🔧 Listando ferramentas disponíveis...');
    
    try {
      const response = await this.client.request(
        { method: 'tools/list' },
        { method: 'tools/list', params: {} }
      );
      
      console.log('Ferramentas encontradas:');
      response.tools?.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name}`);
        console.log(`     ${tool.description}`);
      });
    } catch (error) {
      console.error('❌ Erro ao listar ferramentas:', error);
    }
  }

  async getCurrentWeather(city: string, country?: string): Promise<void> {
    console.log(`\n🌤️ Obtendo clima atual para ${city}${country ? `, ${country}` : ''}...`);
    
    try {
      const response = await this.client.request(
        { method: 'tools/call' },
        {
          method: 'tools/call',
          params: {
            name: 'get_current_weather',
            arguments: {
              city,
              country,
              units: 'metric',
            },
          },
        }
      );

      if (response.content?.[0]?.text) {
        const weatherData = JSON.parse(response.content[0].text);
        console.log('🌡️ Dados climáticos:');
        console.log(`   📍 Local: ${weatherData.location.city}, ${weatherData.location.country}`);
        console.log(`   🌡️ Temperatura: ${weatherData.current.temperature}°C`);
        console.log(`   🌡️ Sensação térmica: ${weatherData.current.feels_like}°C`);
        console.log(`   💧 Umidade: ${weatherData.current.humidity}%`);
        console.log(`   🌪️ Vento: ${weatherData.current.wind_speed} m/s`);
        console.log(`   📝 Descrição: ${weatherData.current.description}`);
      }
    } catch (error) {
      console.error('❌ Erro ao obter clima atual:', error);
    }
  }

  async getWeatherForecast(city: string, country?: string): Promise<void> {
    console.log(`\n🔮 Obtendo previsão do tempo para ${city}${country ? `, ${country}` : ''}...`);
    
    try {
      const response = await this.client.request(
        { method: 'tools/call' },
        {
          method: 'tools/call',
          params: {
            name: 'get_weather_forecast',
            arguments: {
              city,
              country,
              units: 'metric',
            },
          },
        }
      );

      if (response.content?.[0]?.text) {
        const forecastData = JSON.parse(response.content[0].text);
        console.log('📊 Previsão do tempo:');
        console.log(`   📍 Local: ${forecastData.location.city}, ${forecastData.location.country}`);
        
        // Mostrar próximas 24 horas (primeiros 8 registros de 3h cada)
        const next24h = forecastData.forecast.slice(0, 8);
        console.log('\n   ⏰ Próximas 24 horas:');
        next24h.forEach((forecast: any, index: number) => {
          const time = new Date(forecast.datetime).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          console.log(`     ${time}: ${forecast.temperature}°C - ${forecast.description}`);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao obter previsão:', error);
    }
  }

  async getWeatherByCoordinates(lat: number, lon: number): Promise<void> {
    console.log(`\n🗺️ Obtendo clima para coordenadas ${lat}, ${lon}...`);
    
    try {
      const response = await this.client.request(
        { method: 'tools/call' },
        {
          method: 'tools/call',
          params: {
            name: 'get_weather_by_coordinates',
            arguments: {
              lat,
              lon,
              units: 'metric',
            },
          },
        }
      );

      if (response.content?.[0]?.text) {
        const weatherData = JSON.parse(response.content[0].text);
        console.log('🌡️ Dados climáticos por coordenadas:');
        console.log(`   📍 Local: ${weatherData.location.city}, ${weatherData.location.country}`);
        console.log(`   🗺️ Coordenadas: ${weatherData.location.coordinates.lat}, ${weatherData.location.coordinates.lon}`);
        console.log(`   🌡️ Temperatura: ${weatherData.current.temperature}°C`);
        console.log(`   📝 Descrição: ${weatherData.current.description}`);
      }
    } catch (error) {
      console.error('❌ Erro ao obter clima por coordenadas:', error);
    }
  }

  async disconnect(): Promise<void> {
    console.log('\n🔌 Desconectando...');
    await this.client.close();
    console.log('✅ Desconectado com sucesso!');
  }
}

// Função para executar exemplos
async function runExamples(): Promise<void> {
  const client = new WeatherMCPClient();

  try {
    // Conectar ao servidor
    await client.connect();

    // Listar recursos e ferramentas
    await client.listResources();
    await client.listTools();

    // Exemplos de uso das ferramentas
    await client.getCurrentWeather('São Paulo', 'BR');
    await client.getCurrentWeather('Rio de Janeiro', 'BR');
    await client.getWeatherForecast('Brasília', 'BR');
    
    // Exemplo com coordenadas (São Paulo)
    await client.getWeatherByCoordinates(-23.5505, -46.6333);

    // Exemplo internacional
    await client.getCurrentWeather('London', 'GB');
    await client.getCurrentWeather('New York', 'US');

  } catch (error) {
    console.error('💥 Erro durante execução:', error);
  } finally {
    await client.disconnect();
  }
}

// Função principal para execução interativa
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🌤️ Weather MCP Client - Exemplos de Uso\n');
    await runExamples();
    return;
  }

  const client = new WeatherMCPClient();
  
  try {
    await client.connect();

    const command = args[0];
    
    switch (command) {
      case 'current':
        if (args[1]) {
          await client.getCurrentWeather(args[1], args[2]);
        } else {
          console.log('❌ Uso: npm run client current <cidade> [país]');
        }
        break;
        
      case 'forecast':
        if (args[1]) {
          await client.getWeatherForecast(args[1], args[2]);
        } else {
          console.log('❌ Uso: npm run client forecast <cidade> [país]');
        }
        break;
        
      case 'coords':
        if (args[1] && args[2]) {
          await client.getWeatherByCoordinates(parseFloat(args[1]), parseFloat(args[2]));
        } else {
          console.log('❌ Uso: npm run client coords <latitude> <longitude>');
        }
        break;
        
      case 'list':
        await client.listResources();
        await client.listTools();
        break;
        
      default:
        console.log('❌ Comando desconhecido. Comandos disponíveis:');
        console.log('  current <cidade> [país] - Clima atual');
        console.log('  forecast <cidade> [país] - Previsão do tempo');
        console.log('  coords <lat> <lon> - Clima por coordenadas');
        console.log('  list - Listar recursos e ferramentas');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  } finally {
    await client.disconnect();
  }
}

// Verificar se API key está configurada
if (!process.env.OPENWEATHERMAP_API_KEY) {
  console.error('❌ OPENWEATHERMAP_API_KEY não configurada!');
  console.log('Configure com: export OPENWEATHERMAP_API_KEY="sua_chave_aqui"');
  process.exit(1);
}

// Executar se for módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

export { WeatherMCPClient };
