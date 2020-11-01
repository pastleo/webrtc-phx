defmodule WebrtcPhx.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  def start(_type, _args) do
    children = [
      # Start the Telemetry supervisor
      WebrtcPhxWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: WebrtcPhx.PubSub},
      # Start the Endpoint (http/https)
      WebrtcPhxWeb.Endpoint
      # Start a worker by calling: WebrtcPhx.Worker.start_link(arg)
      # {WebrtcPhx.Worker, arg}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: WebrtcPhx.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    WebrtcPhxWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
