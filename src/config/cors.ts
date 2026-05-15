import cors, { CorsOptions } from "cors";

const defaultAllowedOrigins = [
  "https://frontend-production-fc41.up.railway.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006"
];

const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Origin",
    "baggage",
    "sentry-trace"
  ],
  optionsSuccessStatus: 204
};

export const createCorsMiddleware = () => cors(corsOptions);

export const createPublicDocumentosCorsMiddleware = () =>
  cors({
    ...corsOptions,
    origin: (_origin, callback) => callback(null, true),
    credentials: false
  });
