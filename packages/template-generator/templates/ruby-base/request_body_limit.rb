require "json"
require "stringio"

module BetterFullstack
  class RequestBodyLimit
    MAX_BYTES = 16_384

    def initialize(app)
      @app = app
    end

    def call(env)
      return oversized if env["CONTENT_LENGTH"].to_i > MAX_BYTES

      if input = env["rack.input"]
        raw = input.read(MAX_BYTES + 1) || ""
        return oversized if raw.bytesize > MAX_BYTES

        env["rack.input"] = StringIO.new(raw)
      end
      @app.call(env)
    end

    def oversized
      body = JSON.generate(error: "body_too_large")
      [413, { "content-type" => "application/json", "content-length" => body.bytesize.to_s }, [body]]
    end
  end
end
