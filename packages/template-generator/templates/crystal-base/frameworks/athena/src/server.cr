require "athena"
require "./app_config"
require "./greeting_request"
require "./http_guard"

class GreetingController < ATH::Controller
  @[ARTA::Get("/health")]
  def health : AHTTP::Response
    json_response GreetingRequest::Result.new(200, {status: "ok"}.to_json)
  end

  @[ARTA::Get("/api/hello")]
  def hello(request : AHTTP::Request) : AHTTP::Response
    json_response GreetingRequest.query(request.query_params["name"]?)
  end

  @[ARTA::Post("/api/echo")]
  def echo(request : AHTTP::Request) : AHTTP::Response
    json_response GreetingRequest.json(request.body.try(&.gets_to_end) || "")
  end

  private def json_response(result : GreetingRequest::Result) : AHTTP::Response
    AHTTP::Response.new(result.body, result.status, HTTP::Headers{"Content-Type" => "application/json"})
  end
end

ATH.run(port: AppConfig.port, host: AppConfig.host, prepend_handlers: [HttpGuard.new] of HTTP::Handler)
