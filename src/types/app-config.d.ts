declare interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl?: string;
  jwtSecret: string;
  jwtExpiresIn: string | number;
  redisUrl?: string;
}
