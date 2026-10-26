abstract class ApiHandler < Marten::Handler
  private def respond(result : GreetingRequest::Result) : Marten::HTTP::Response
    json(result.body, status: result.status)
  end
end

class HealthHandler < ApiHandler
  http_method_names :get

  def get
    json({status: "ok"})
  end
end

class HelloHandler < ApiHandler
  http_method_names :get

  def get
    respond GreetingRequest.query(request.query_params["name"]?)
  end
end

class EchoHandler < ApiHandler
  http_method_names :post
  protect_from_forgery false

  def post
    respond GreetingRequest.json(request.body)
  end
end
