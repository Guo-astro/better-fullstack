ENV["MARTEN_ENV"] = "test"

require "spec"
require "../src/project"
require "marten/spec"
require "../src/apps/greetings/migrations/**"
