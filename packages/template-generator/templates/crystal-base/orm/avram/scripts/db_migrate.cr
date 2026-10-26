require "../src/database"

Avram::Migrator::Runner.create_db(quiet: true)
if ARGV.first? == "rollback"
  Avram::Migrator::Runner.new.rollback_one
else
  Avram::Migrator::Runner.new.run_pending_migrations
end
