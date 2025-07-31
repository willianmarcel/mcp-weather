#!/usr/bin/env node

/**
 * MCP Weather Server - TypeScript Implementation
 * Um servidor MCP para busca de dados climáticos com suporte a streaming HTTP
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  TextContent,
  CallToolResult,
  ListResourcesResult,
  ListToolsResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
// import helmet from 'helmet';
import compression from 'compression';

interface WeatherData {
  location: {
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  current: {
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    wind_speed: number;
    wind_direction: number;
    visibility: number;
    uv_index: string | number;
  };
  units: string;
  timestamp: string;
}

interface ForecastData {
  location: {
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  forecast: Array<{
    datetime: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    wind_speed: number;
    wind_direction: number;
    precipitation_probability: number;
  }>;
  units: string;
  timestamp: string;
}

class WeatherMCPServer {
  private server: Server;
  private apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private httpServer?: express.Application;

  constructor(apiKey: string = process.env.OPENWEATHERMAP_API_KEY || 'your_openweathermap_api_key_here') {
    this.apiKey = apiKey;
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
    this.setupHttpServer();
  }

  private setupHttpServer(): void {
    this.httpServer = express();

    // Middlewares de segurança e performance
    this.httpServer.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.httpServer.use(compression());
    this.httpServer.use(express.json({ limit: '10mb' }));

    // Para debug - remover helmet temporariamente
    // this.httpServer.use(helmet());

    // Health check endpoints
    this.httpServer.get('/health', (_, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'weather-mcp-server'
      });
    });

    this.httpServer.get('/ready', (_, res) => {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    });

    // Metrics endpoint (básico)
    this.httpServer.get('/metrics', (_, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP weather_mcp_requests_total Total number of requests
# TYPE weather_mcp_requests_total counter
weather_mcp_requests_total 0

# HELP weather_mcp_up Server up status
# TYPE weather_mcp_up gauge
weather_mcp_up 1
`);
    });

    // Status endpoint
    this.httpServer.get('/status', (_, res) => {
      res.json({
        server: 'weather-mcp-server',
        version: '1.0.0',
        status: 'running',
        capabilities: ['resources', 'tools'],
        endpoints: {
          health: '/health',
          ready: '/ready',
          metrics: '/metrics',
          status: '/status',
          mcp: '/mcp'
        },
        mcp: {
          tools: ['get_current_weather', 'get_weather_forecast', 'get_weather_by_coordinates'],
          resources: ['weather://current', 'weather://forecast']
        }
      });
    });

    // Debug middleware
    this.httpServer.use('/mcp', (req, _res, next) => {
      console.log('📡 MCP Request received:', req.method, req.url, req.headers);
      console.log('📡 MCP Body:', req.body);
      next();
    });

    // MCP HTTP Streaming endpoint
    this.httpServer.post('/mcp', async (req, res) => {
      console.log('🔥 MCP Handler reached!');
      try {
        // Set headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const request = req.body;
        let response: any;

        switch (request.method) {
          case 'initialize':
            response = await this.handleInitialize(request.params);
            break;
          case 'tools/list':
            response = await this.handleListTools();
            break;
          case 'resources/list':
            response = await this.handleListResources();
            break;
          case 'tools/call':
            response = await this.handleCallTool(request.params);
            break;
          case 'resources/read':
            response = await this.handleReadResource(request.params);
            break;
          case 'notifications/initialized':
            // Just acknowledge the notification
            res.status(200).end();
            return;
          default:
            response = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Method not found: ${request.method}`
              }
            };
        }

        response.jsonrpc = '2.0';
        response.id = request.id;

        res.json(response);
      } catch (error) {
        console.error('Erro no endpoint MCP:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error)
          }
        });
      }
    });

    // Direct tool endpoints for easier HTTP access
    this.httpServer.post('/weather/current', async (req, res) => {
      try {
        const { city, country, units = 'metric' } = req.body;
        const result = await this.getCurrentWeather(city, country, units);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.httpServer.post('/weather/forecast', async (req, res) => {
      try {
        const { city, country, units = 'metric' } = req.body;
        const result = await this.getWeatherForecast(city, country, units);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.httpServer.post('/weather/coordinates', async (req, res) => {
      try {
        const { lat, lon, units = 'metric' } = req.body;
        const result = await this.getWeatherByCoordinates(lat, lon, units);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  private async handleInitialize(_params: any): Promise<any> {
    return {
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: "weather-mcp-server",
          version: "1.0.0"
        }
      }
    };
  }

  private async handleListTools(): Promise<any> {
    const tools: Tool[] = [
      {
        name: 'get_current_weather',
        description: 'Obtém dados climáticos atuais para uma cidade',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'Nome da cidade',
            },
            country: {
              type: 'string',
              description: 'Código do país (opcional, ex: BR)',
            },
            units: {
              type: 'string',
              enum: ['metric', 'imperial', 'standard'],
              default: 'metric',
              description: 'Unidade de medida',
            },
          },
          required: ['city'],
        },
      },
      {
        name: 'get_weather_forecast',
        description: 'Obtém previsão do tempo para 5 dias',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'Nome da cidade',
            },
            country: {
              type: 'string',
              description: 'Código do país (opcional, ex: BR)',
            },
            units: {
              type: 'string',
              enum: ['metric', 'imperial', 'standard'],
              default: 'metric',
              description: 'Unidade de medida',
            },
          },
          required: ['city'],
        },
      },
      {
        name: 'get_weather_by_coordinates',
        description: 'Obtém dados climáticos usando coordenadas geográficas',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude',
            },
            lon: {
              type: 'number',
              description: 'Longitude',
            },
            units: {
              type: 'string',
              enum: ['metric', 'imperial', 'standard'],
              default: 'metric',
              description: 'Unidade de medida',
            },
          },
          required: ['lat', 'lon'],
        },
      },
    ];

    return { result: { tools } };
  }

  private async handleListResources(): Promise<any> {
    const resources: Resource[] = [
      {
        uri: 'weather://current',
        name: 'Current Weather',
        description: 'Dados climáticos atuais',
        mimeType: 'application/json',
      },
      {
        uri: 'weather://forecast',
        name: 'Weather Forecast',
        description: 'Previsão do tempo',
        mimeType: 'application/json',
      },
    ];

    return { result: { resources } };
  }

  private async handleCallTool(params: any): Promise<any> {
    const { name, arguments: args } = params;

    if (!args) {
      throw new Error('Argumentos são obrigatórios');
    }

    let result: any;

    switch (name) {
      case 'get_current_weather':
        result = await this.getCurrentWeather(
          args.city as string,
          args.country as string,
          (args.units as string) || 'metric'
        );
        break;
      case 'get_weather_forecast':
        result = await this.getWeatherForecast(
          args.city as string,
          args.country as string,
          (args.units as string) || 'metric'
        );
        break;
      case 'get_weather_by_coordinates':
        result = await this.getWeatherByCoordinates(
          args.lat as number,
          args.lon as number,
          (args.units as string) || 'metric'
        );
        break;
      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }

    return {
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    };
  }

  private async handleReadResource(params: any): Promise<any> {
    const { uri } = params;
    let content: TextContent[];

    switch (uri) {
      case 'weather://current':
        content = [
          {
            type: 'text',
            text: 'Recurso para obter dados climáticos atuais. Use a ferramenta get_current_weather.',
          },
        ];
        break;
      case 'weather://forecast':
        content = [
          {
            type: 'text',
            text: 'Recurso para obter previsão do tempo. Use a ferramenta get_weather_forecast.',
          },
        ];
        break;
      default:
        throw new Error(`Recurso não encontrado: ${uri}`);
    }

    return { result: { contents: content } };
  }

  private setupHandlers(): void {
    // Handler para listar recursos
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: Resource[] = [
        {
          uri: 'weather://current',
          name: 'Current Weather',
          description: 'Dados climáticos atuais',
          mimeType: 'application/json',
        },
        {
          uri: 'weather://forecast',
          name: 'Weather Forecast',
          description: 'Previsão do tempo',
          mimeType: 'application/json',
        },
      ];

      return { resources } as ListResourcesResult;
    });

    // Handler para ler recursos
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      let content: TextContent[];

      switch (uri) {
        case 'weather://current':
          content = [
            {
              type: 'text',
              text: 'Recurso para obter dados climáticos atuais. Use a ferramenta get_current_weather.',
            },
          ];
          break;
        case 'weather://forecast':
          content = [
            {
              type: 'text',
              text: 'Recurso para obter previsão do tempo. Use a ferramenta get_weather_forecast.',
            },
          ];
          break;
        default:
          throw new Error(`Recurso não encontrado: ${uri}`);
      }

      return { contents: content } as unknown as ReadResourceResult;
    });

    // Handler para listar ferramentas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'get_current_weather',
          description: 'Obtém dados climáticos atuais para uma cidade',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'Nome da cidade',
              },
              country: {
                type: 'string',
                description: 'Código do país (opcional, ex: BR)',
              },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'standard'],
                default: 'metric',
                description: 'Unidade de medida',
              },
            },
            required: ['city'],
          },
        },
        {
          name: 'get_weather_forecast',
          description: 'Obtém previsão do tempo para 5 dias',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'Nome da cidade',
              },
              country: {
                type: 'string',
                description: 'Código do país (opcional, ex: BR)',
              },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'standard'],
                default: 'metric',
                description: 'Unidade de medida',
              },
            },
            required: ['city'],
          },
        },
        {
          name: 'get_weather_by_coordinates',
          description: 'Obtém dados climáticos usando coordenadas geográficas',
          inputSchema: {
            type: 'object',
            properties: {
              lat: {
                type: 'number',
                description: 'Latitude',
              },
              lon: {
                type: 'number',
                description: 'Longitude',
              },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'standard'],
                default: 'metric',
                description: 'Unidade de medida',
              },
            },
            required: ['lat', 'lon'],
          },
        },
      ];

      return { tools } as ListToolsResult;
    });

    // Handler para executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Argumentos são obrigatórios');
      }

      try {
        let result: any;

        switch (name) {
          case 'get_current_weather':
            result = await this.getCurrentWeather(
              args.city as string,
              args.country as string,
              (args.units as string) || 'metric'
            );
            break;
          case 'get_weather_forecast':
            result = await this.getWeatherForecast(
              args.city as string,
              args.country as string,
              (args.units as string) || 'metric'
            );
            break;
          case 'get_weather_by_coordinates':
            result = await this.getWeatherByCoordinates(
              args.lat as number,
              args.lon as number,
              (args.units as string) || 'metric'
            );
            break;
          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        } as CallToolResult;
      } catch (error) {
        console.error(`Erro ao executar ferramenta ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Erro: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        } as CallToolResult;
      }
    });
  }

  private async makeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    const urlParams = new URLSearchParams({
      ...params,
      appid: this.apiKey,
    });

    const url = `${this.baseUrl}/${endpoint}?${urlParams}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      // Streaming da resposta
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Erro de conexão: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getCurrentWeather(
    city: string,
    country?: string,
    units: string = 'metric'
  ): Promise<WeatherData> {
    const query = country ? `${city},${country}` : city;

    const params = {
      q: query,
      units,
      lang: 'pt_br',
    };

    const data = await this.makeRequest('weather', params);

    return {
      location: {
        city: data.name,
        country: data.sys.country,
        coordinates: {
          lat: data.coord.lat,
          lon: data.coord.lon,
        },
      },
      current: {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        wind_speed: data.wind.speed,
        wind_direction: data.wind.deg || 0,
        visibility: (data.visibility || 0) / 1000, // Convert to km
        uv_index: data.uvi || 'N/A',
      },
      units,
      timestamp: new Date().toISOString(),
    };
  }

  private async getWeatherForecast(
    city: string,
    country?: string,
    units: string = 'metric'
  ): Promise<ForecastData> {
    const query = country ? `${city},${country}` : city;

    const params = {
      q: query,
      units,
      lang: 'pt_br',
    };

    const data = await this.makeRequest('forecast', params);

    const forecast = data.list.map((item: any) => ({
      datetime: item.dt_txt,
      temperature: item.main.temp,
      feels_like: item.main.feels_like,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      wind_speed: item.wind.speed,
      wind_direction: item.wind.deg || 0,
      precipitation_probability: (item.pop || 0) * 100,
    }));

    return {
      location: {
        city: data.city.name,
        country: data.city.country,
        coordinates: {
          lat: data.city.coord.lat,
          lon: data.city.coord.lon,
        },
      },
      forecast,
      units,
      timestamp: new Date().toISOString(),
    };
  }

  private async getWeatherByCoordinates(
    lat: number,
    lon: number,
    units: string = 'metric'
  ): Promise<WeatherData> {
    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      units,
      lang: 'pt_br',
    };

    const data = await this.makeRequest('weather', params);

    return {
      location: {
        city: data.name,
        country: data.sys.country,
        coordinates: {
          lat: data.coord.lat,
          lon: data.coord.lon,
        },
      },
      current: {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        wind_speed: data.wind.speed,
        wind_direction: data.wind.deg || 0,
        visibility: (data.visibility || 0) / 1000,
        uv_index: data.uvi || 'N/A',
      },
      units,
      timestamp: new Date().toISOString(),
    };
  }

  public async run(): Promise<void> {
    const mode = process.env.MCP_MODE || 'stdio';

    // Iniciar servidor HTTP
    const httpPort = process.env.HEALTH_CHECK_PORT || 8080;
    this.httpServer?.listen(httpPort, () => {
      console.error(`🌐 HTTP server running on port ${httpPort}`);
      console.error(`📡 MCP HTTP endpoint: http://localhost:${httpPort}/mcp`);
    });

    if (mode === 'http') {
      console.error('🔗 Weather MCP Server running in HTTP mode');
    } else {
      // Iniciar servidor MCP via stdio
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('📡 Weather MCP Server running on stdio');
    }
  }
}

// Função principal
async function main(): Promise<void> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENWEATHERMAP_API_KEY não encontrada. Configure a variável de ambiente.');
    process.exit(1);
  }

  const server = new WeatherMCPServer(apiKey);
  await server.run();
}

// Executar se for o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

export { WeatherMCPServer };
