# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
use Mix.Config

# Configures the endpoint
config :webrtc_phx, WebrtcPhxWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "fkpvNdb1z9jWx7c/oWdkRmo3G04YBHQT80rk5J+KrY013su+SxGxQJJIxhgM/8Q5",
  render_errors: [view: WebrtcPhxWeb.ErrorView, accepts: ~w(html json), layout: false],
  pubsub_server: WebrtcPhx.PubSub,
  live_view: [signing_salt: "kP3YtqD4"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
