const commonConfig = {
  port: process.env.PORT || 7690,
  mongoUri: process.env.MONGO_URI,
  nodeEnv: process.env.NODE_ENV,
  paintFrontendBaseUrl: process.env.PAINT_FRONTEND_BASE_URL,
};

export default commonConfig;
