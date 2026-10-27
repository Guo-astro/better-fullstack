require "sidekiq/cli"
require "./greeting_job"

cli = Sidekiq::CLI.new
cli.run(cli.configure { })
