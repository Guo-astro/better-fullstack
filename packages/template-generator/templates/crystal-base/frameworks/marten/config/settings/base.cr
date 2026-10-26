Marten.configure do |config|
  config.secret_key = ENV.fetch("MARTEN_SECRET_KEY") { Random::Secure.hex(32) }
  config.host = AppConfig.host
  config.port = AppConfig.port
  config.allowed_hosts = ENV.fetch("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",").map(&.strip).reject(&.empty?)
  config.request_max_body_size = AppConfig::MAX_BODY_BYTES
  config.installed_apps = [] of Marten::Apps::Config.class
  config.middleware = [CorsMiddleware] of Marten::Middleware.class
end
