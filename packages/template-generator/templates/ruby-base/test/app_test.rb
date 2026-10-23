ENV["RACK_ENV"] = "test"

require "minitest/autorun"
require "rack/test"
require_relative "../app"

class AppTest < Minitest::Test
  include Rack::Test::Methods

  def app
    BetterFullstack::App
  end

  def setup
    header "Host", "localhost"
  end

  def post_json(value)
    post "/api/greetings", JSON.generate(value), "CONTENT_TYPE" => "application/json"
  end

  def test_health
    get "/health"
    assert_equal 200, last_response.status
    assert_equal({ "status" => "ok", "service" => "sinatra" }, JSON.parse(last_response.body))
  end

  def test_greeting_trims_the_validated_name
    post_json("name" => "  Ruby  ")
    assert_equal 200, last_response.status
    assert_equal({ "greeting" => "Hello, Ruby!" }, JSON.parse(last_response.body))
  end

  def test_invalid_request_shapes
    [nil, [], {}, { "name" => 2 }, { "name" => " " }, { "name" => "a" * 81 }, { "name" => "Ruby", "admin" => true }].each do |value|
      post_json(value)
      assert_equal 422, last_response.status
      assert JSON.parse(last_response.body).key?("error")
    end
  end

  def test_malformed_json
    post "/api/greetings", "{", "CONTENT_TYPE" => "application/json"
    assert_equal 400, last_response.status
    assert_equal "invalid_json", JSON.parse(last_response.body).fetch("error")
  end

  def test_non_json_content_type
    post "/api/greetings", "name=Ruby"
    assert_equal 415, last_response.status
  end

  def test_body_size_limit
    post_json("name" => "a" * 16_384)
    assert_equal 413, last_response.status
  end

  def test_unknown_route
    get "/missing"
    assert_equal 404, last_response.status
    assert_equal "not_found", JSON.parse(last_response.body).fetch("error")
  end

  def test_cors_origin_is_pinned
    header "Origin", app.allowed_origin
    options "/api/greetings"
    assert_equal 204, last_response.status
    assert_equal app.allowed_origin, last_response.headers["access-control-allow-origin"]
    header "Origin", "https://untrusted.example"
    post_json("name" => "Ruby")
    assert_equal 403, last_response.status
  end

  def test_unrecognized_host_is_rejected
    header "Host", "untrusted.example"
    get "/health"
    assert_equal 403, last_response.status
  end
end
