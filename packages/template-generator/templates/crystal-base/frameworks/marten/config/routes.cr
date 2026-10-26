Marten.routes.draw do
  path "/health", HealthHandler, name: "health"
  path "/api/hello", HelloHandler, name: "hello"
  path "/api/echo", EchoHandler, name: "echo"
end
